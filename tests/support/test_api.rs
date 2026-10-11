//! Test API server on port 3000, used by the CLI tests and `cargo api`.
//! Implemented with std only: a minimal HTTP/1.1 server with keep-alive.

use std::io::{self, BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::time::{SystemTime, UNIX_EPOCH};

pub const PORT: u16 = 3000;

/// Version served by the fake release endpoints used to test `jsonr update`.
pub const FAKE_RELEASE_VERSION: &str = "99.0.0";

pub fn bind() -> io::Result<TcpListener> {
    TcpListener::bind(("::", PORT)).or_else(|_| TcpListener::bind(("0.0.0.0", PORT)))
}

pub fn serve(listener: TcpListener) {
    for stream in listener.incoming().flatten() {
        std::thread::spawn(move || {
            let _ = handle(stream);
        });
    }
}

struct Request {
    method: String,
    path: String,
    headers: Vec<(String, String)>,
    body: String,
}

struct Response {
    status: u16,
    reason: &'static str,
    headers: Vec<(&'static str, String)>,
    body: Vec<u8>,
}

impl Response {
    fn json(body: String) -> Self {
        Response {
            status: 200,
            reason: "OK",
            headers: vec![("content-type", "application/json".to_string())],
            body: body.into_bytes(),
        }
    }

    fn text(status: u16, reason: &'static str, body: &str) -> Self {
        Response {
            status,
            reason,
            headers: vec![("content-type", "text/plain; charset=UTF-8".to_string())],
            body: body.as_bytes().to_vec(),
        }
    }

    fn empty(status: u16, reason: &'static str) -> Self {
        Response {
            status,
            reason,
            headers: Vec::new(),
            body: Vec::new(),
        }
    }

    fn redirect(location: String) -> Self {
        Response {
            status: 302,
            reason: "Found",
            headers: vec![("location", location)],
            body: Vec::new(),
        }
    }
}

fn handle(stream: TcpStream) -> io::Result<()> {
    let mut reader = BufReader::new(stream.try_clone()?);
    let mut writer = stream;
    loop {
        let mut line = String::new();
        if reader.read_line(&mut line)? == 0 {
            return Ok(());
        }
        let line = line.trim_end();
        if line.is_empty() {
            continue;
        }
        let mut parts = line.split(' ');
        let method = parts.next().unwrap_or_default().to_string();
        let target = parts.next().unwrap_or_default().to_string();
        let path = target.split('?').next().unwrap_or_default().to_string();

        let mut headers = Vec::new();
        loop {
            let mut header = String::new();
            if reader.read_line(&mut header)? == 0 {
                return Ok(());
            }
            let header = header.trim_end();
            if header.is_empty() {
                break;
            }
            if let Some((name, value)) = header.split_once(':') {
                headers.push((name.trim().to_ascii_lowercase(), value.trim().to_string()));
            }
        }
        let length = headers
            .iter()
            .find(|(name, _)| name == "content-length")
            .and_then(|(_, value)| value.parse::<usize>().ok())
            .unwrap_or(0);
        let mut body = vec![0; length];
        reader.read_exact(&mut body)?;
        let close = headers
            .iter()
            .any(|(name, value)| name == "connection" && value.eq_ignore_ascii_case("close"));

        let request = Request {
            method,
            path,
            headers,
            body: String::from_utf8_lossy(&body).to_string(),
        };
        let response = route(&request);

        let mut head = format!("HTTP/1.1 {} {}\r\n", response.status, response.reason);
        for (name, value) in &response.headers {
            head.push_str(&format!("{name}: {value}\r\n"));
        }
        head.push_str(&format!("content-length: {}\r\n", response.body.len()));
        head.push_str(&format!("date: {}\r\n\r\n", http_date()));
        writer.write_all(head.as_bytes())?;
        writer.write_all(&response.body)?;
        writer.flush()?;
        if close {
            return Ok(());
        }
    }
}

fn route(request: &Request) -> Response {
    let method = request.method.as_str();
    let path = request.path.as_str();
    match (method, path) {
        ("GET", "/sample") => Response::json(r#"{"id":"sample-get"}"#.to_string()),
        ("POST", "/sample") => Response::json(r#"{"id":"sample-post"}"#.to_string()),
        ("DELETE", "/sample") => Response::empty(204, "No Content"),
        ("PUT", "/sample") => {
            // { id: "sample-put", ...body }
            let body = request.body.trim();
            match body.strip_prefix('{').and_then(|b| b.strip_suffix('}')) {
                Some(inner) if inner.trim().is_empty() => {
                    Response::json(r#"{"id":"sample-put"}"#.to_string())
                }
                Some(inner) => Response::json(format!(r#"{{"id":"sample-put",{inner}}}"#)),
                None => Response::text(500, "Internal Server Error", "Internal Server Error"),
            }
        }
        ("GET", "/exception") => {
            Response::text(500, "Internal Server Error", "Internal Server Error")
        }
        ("GET", "/redirect") => Response::redirect("/redirect-target".to_string()),
        ("GET", "/redirect-target") => Response::json(r#"{"msg":"redirect-target"}"#.to_string()),
        ("GET", "/echo-headers") => {
            let excluded = [
                "accept",
                "accept-encoding",
                "accept-language",
                "host",
                "user-agent",
            ];
            let mut headers: Vec<(String, String)> = Vec::new();
            for (name, value) in &request.headers {
                if excluded.contains(&name.as_str()) {
                    continue;
                }
                match headers.iter_mut().find(|(n, _)| n == name) {
                    Some(existing) => existing.1 = format!("{}, {value}", existing.1),
                    None => headers.push((name.clone(), value.clone())),
                }
            }
            headers.sort();
            let fields: Vec<String> = headers
                .iter()
                .map(|(name, value)| format!("{}:{}", json_string(name), json_string(value)))
                .collect();
            Response::json(format!("{{{}}}", fields.join(",")))
        }
        ("GET", "/auth-required") => {
            let authorized = request
                .headers
                .iter()
                .any(|(name, value)| name == "authorization" && value == "123");
            if authorized {
                Response::json(r#"{"id":"sample-post"}"#.to_string())
            } else {
                Response::empty(401, "Unauthorized")
            }
        }
        ("GET", "/fake-releases/latest") => {
            Response::redirect(format!("/fake-releases/tag/v{FAKE_RELEASE_VERSION}"))
        }
        ("GET", path)
            if path.starts_with(&format!("/fake-releases/download/v{FAKE_RELEASE_VERSION}/")) =>
        {
            Response {
                status: 200,
                reason: "OK",
                headers: vec![("content-type", "application/octet-stream".to_string())],
                body: format!("#!/bin/sh\necho {FAKE_RELEASE_VERSION}\n").into_bytes(),
            }
        }
        ("GET", path) if path.starts_with("/users/") => Response::json(format!(
            r#"{{"id":{}}}"#,
            json_string(&path["/users/".len()..])
        )),
        _ => Response::text(404, "Not Found", "404 Not Found"),
    }
}

fn json_string(s: &str) -> String {
    let mut out = String::from("\"");
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            c if (c as u32) < 0x20 => out.push_str(&format!("\\u{:04x}", c as u32)),
            c => out.push(c),
        }
    }
    out.push('"');
    out
}

fn http_date() -> String {
    let secs = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0);
    let days = (secs / 86400) as i64;
    let (hour, minute, second) = (secs / 3600 % 24, secs / 60 % 60, secs % 60);
    let weekday = ["Thu", "Fri", "Sat", "Sun", "Mon", "Tue", "Wed"][(days % 7) as usize];
    // Civil date from days since 1970-01-01 (Howard Hinnant's algorithm).
    let z = days + 719468;
    let era = z.div_euclid(146097);
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let day = doy - (153 * mp + 2) / 5 + 1;
    let month = if mp < 10 { mp + 3 } else { mp - 9 };
    let year = yoe + era * 400 + i64::from(month <= 2);
    let month = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
    ][(month - 1) as usize];
    format!("{weekday}, {day:02} {month} {year} {hour:02}:{minute:02}:{second:02} GMT")
}
