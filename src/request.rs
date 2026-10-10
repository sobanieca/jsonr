//! Builds and sends a request from command line arguments, `.http` files or
//! stdin, then prints and asserts the response.

use crate::config::decode_text;
use crate::http_file::{self, HttpRequest};
use crate::inspect::{self, Options};
use crate::json::{self, Object, Value};
use crate::logger;
use std::io::{IsTerminal, Read};
use std::time::Instant;
use ureq::tls::TlsConfig;

pub struct Response {
    pub status: u16,
    pub status_text: String,
    /// Lowercase names, sorted, duplicates combined (like `Headers`).
    pub headers: Vec<(String, String)>,
    pub body: Value,
    pub elapsed: u128,
}

impl Response {
    /// The object returned to scripts (headers are wrapped in JS).
    pub fn to_json(&self) -> Value {
        let mut object = Object::new();
        object.insert("status", Value::Number(self.status as f64));
        object.insert("statusText", Value::String(self.status_text.clone()));
        object.insert(
            "headers",
            Value::Array(
                self.headers
                    .iter()
                    .map(|(k, v)| Value::Array(vec![k.as_str().into(), v.as_str().into()]))
                    .collect(),
            ),
        );
        object.insert("body", self.body.clone());
        object.insert("elapsed", Value::Number(self.elapsed as f64));
        Value::Object(object)
    }
}

const INVALID_PARAMETERS: &str = "Invalid parameters provided. Provide exactly one url or .http file path, or pipe .http content via stdin.";

fn get_variables(args: &Object) -> Vec<(String, String)> {
    args.get_object("inputVariables")
        .map(|vars| {
            vars.iter()
                .map(|(k, v)| (k.clone(), v.to_js_string()))
                .collect()
        })
        .unwrap_or_default()
}

fn read_stdin() -> Option<String> {
    let mut stdin = std::io::stdin();
    if stdin.is_terminal() {
        return None;
    }
    let mut bytes = Vec::new();
    stdin.read_to_end(&mut bytes).ok()?;
    let text = decode_text(&bytes);
    (!text.trim().is_empty()).then_some(text)
}

fn apply_parsed(request: &mut HttpRequest, parsed: HttpRequest) {
    request.method = parsed.method;
    request.url = parsed.url;
    request.body = parsed.body;
    if parsed.headers.iter().any(|(k, _)| k == "Content-Type") {
        request.headers = parsed.headers;
    } else {
        request.headers.extend(parsed.headers);
    }
}

fn parse_http_file(
    path: &str,
    variables: &[(String, String)],
    raw: bool,
    ignore_input_validation: bool,
) -> Result<HttpRequest, String> {
    logger::debug(format!("Attempting to read request data from file: {path}"));
    match std::fs::read(path) {
        Ok(bytes) => Ok(http_file::parse_http_content(
            &decode_text(&bytes),
            variables,
            raw,
            ignore_input_validation,
        )),
        Err(err) => {
            logger::debug(format!("Error when parsing file: {err}"));
            Err("Unexpected error occurred when trying to parse http file. Ensure that the file is compatible with RFC2616 standard".to_string())
        }
    }
}

/// Sends the request described by `args`. Returns `None` in dry mode.
pub fn send_request(args: &mut Object) -> Result<Option<Response>, String> {
    let mut request = HttpRequest {
        method: "GET".to_string(),
        url: String::new(),
        headers: vec![("Content-Type".to_string(), "application/json".to_string())],
        body: None,
    };

    if args.is_truthy("dry") {
        logger::debug("Dry mode enabled - request will be printed but not sent");
        args.insert("verbose", Value::Bool(true));
    }

    if args.is_truthy("omitDefaultContentTypeHeader") {
        logger::debug(
            "Parameter --omit-default-content-type-header provided - removing default Content-Type header",
        );
        request.headers.clear();
    }

    let variables = get_variables(args);
    let raw = args.is_truthy("raw");
    let ignore_input_validation = args.is_truthy("ignoreInputValidation");

    let positional: Vec<String> = match args.get("_") {
        Some(Value::Array(items)) => items.iter().map(Value::to_js_string).collect(),
        _ => Vec::new(),
    };

    match positional.as_slice() {
        [] => {
            let content = read_stdin().ok_or(INVALID_PARAMETERS)?;
            logger::debug("No positional arguments provided. Reading request from stdin.");
            let parsed =
                http_file::parse_http_content(&content, &variables, raw, ignore_input_validation);
            apply_parsed(&mut request, parsed);
        }
        [url_or_file_path] => {
            let looks_like_file = url_or_file_path.ends_with(".http");
            let url_or_file_path = http_file::replace_variables(url_or_file_path, &variables);
            if url_or_file_path.starts_with("http://") || url_or_file_path.starts_with("https://") {
                logger::debug(
                    "http(s):// at the beginning of the file/url parameter detected. Assuming url.",
                );
                request.url = url_or_file_path;
            } else {
                let parsed = std::fs::symlink_metadata(&url_or_file_path)
                    .map_err(|err| (err.kind() == std::io::ErrorKind::NotFound, err.to_string()))
                    .and_then(|_| {
                        logger::debug(format!(
                            "File {url_or_file_path} found. Parsing http file content."
                        ));
                        parse_http_file(&url_or_file_path, &variables, raw, ignore_input_validation)
                            .map_err(|err| (false, err))
                    });
                match parsed {
                    Ok(parsed) => apply_parsed(&mut request, parsed),
                    Err((true, _)) if looks_like_file => {
                        logger::error(format!("ERROR: File not found: {url_or_file_path}"));
                        std::process::exit(1);
                    }
                    Err((_, err)) if looks_like_file => return Err(err),
                    Err((_, err)) => {
                        logger::debug(format!(
                            "Failed to lstat file/url parameter - {url_or_file_path}. Assuming url. Error: {err}"
                        ));
                        request.url = url_or_file_path;
                    }
                }
            }
        }
        _ => return Err(INVALID_PARAMETERS.to_string()),
    }

    if let Some(method) = args.get("method").filter(|v| v.is_truthy()) {
        let method = method.to_js_string();
        logger::debug(format!(
            "Parameter [m]ethod provided - HTTP method set to {method}"
        ));
        request.method = method;
    }

    if let Some(body) = args.get("body").filter(|v| v.is_truthy()) {
        match body {
            Value::Object(_) | Value::Array(_) => {
                let body = json::stringify(body);
                logger::debug(format!(
                    "Parameter [b]ody provided - HTTP body set to {body} (stringified from object)"
                ));
                request.body = Some(body);
            }
            other => {
                let body = other.to_js_string();
                logger::debug(format!(
                    "Parameter [b]ody provided - HTTP body set to {body}"
                ));
                request.body = Some(body);
            }
        }
    }

    if args.is_truthy("js")
        && let Some(body) = request.body.as_ref().filter(|b| !b.is_empty())
    {
        logger::debug("JS mode enabled - converting JS object to JSON");
        let converted = http_file::convert_js_object_to_json(body);
        if let Err(err) = json::parse(&converted) {
            logger::debug(format!("Error converting JavaScript body: {err}"));
            return Err("Failed to convert body from JavaScript object to JSON. Ensure the body contains valid JavaScript object literal syntax.".to_string());
        }
        logger::debug(format!("Converted JS object to JSON: {converted}"));
        request.body = Some(converted);
    }

    if let Some(headers) = args.get_object("headers") {
        for (key, value) in headers.iter() {
            let value = http_file::replace_variables(&value.to_js_string(), &variables);
            logger::debug(format!("Adding {key}: {value} header to request"));
            request.headers.push((key.clone(), value));
        }
    }

    logger::info(format!("{} {}...", request.method, request.url));
    let verbose = args.is_truthy("verbose");
    let request_log = |message: &str| {
        if verbose {
            logger::info(message);
        } else {
            logger::debug(message);
        }
    };

    request_log("Request:");
    for (key, value) in &request.headers {
        request_log(&format!("{key}: {value}"));
    }
    request_log("");
    if let Some(body) = request.body.as_ref().filter(|b| !b.is_empty()) {
        request_log(body);
    }

    if args.is_truthy("dry") {
        logger::info("Dry mode: Request not sent");
        return Ok(None);
    }

    let body = request.body.clone().filter(|b| !b.trim().is_empty());
    if body.is_none() {
        logger::debug("No request body provided, removing it from request object.");
    }

    let url = if request.url.starts_with("http://") || request.url.starts_with("https://") {
        request.url.clone()
    } else {
        format!("http://{}", request.url)
    };

    let started = Instant::now();
    let mut response = fetch(
        &request,
        &url,
        body,
        args.is_truthy("followRedirects"),
        args.is_truthy("insecure"),
    )?;
    let elapsed = started.elapsed().as_millis();

    let bytes = response
        .body_mut()
        .with_config()
        .limit(u64::MAX)
        .read_to_vec()
        .map_err(|err| format!("error reading response body: {err}"))?;
    let text = decode_text(&bytes);
    let mut response_body = Value::String(text.clone());
    if !text.trim().is_empty() {
        match json::parse(&text) {
            Ok(parsed) => response_body = parsed,
            Err(err) => {
                logger::debug("Exception thrown when parsing response body as JSON");
                logger::debug(err);
            }
        }
    }

    let status = response.status();
    let status_text = status.canonical_reason().unwrap_or("").to_string();
    let headers = normalize_headers(response.headers());

    logger::info("Response:");
    logger::info("");
    if verbose {
        for (key, value) in &headers {
            logger::info(format!("{key}: {value}"));
        }
    }

    if response_body.is_truthy() {
        if let Some(output) = args.get("output").filter(|v| v.is_truthy()) {
            let output = output.to_js_string();
            std::fs::write(&output, json::stringify(&response_body))
                .map_err(|err| err.to_string())?;
            logger::info(format!("Response body written to file {output}"));
        } else {
            logger::info(inspect::inspect_value(&response_body, Options::verbose()));
        }
    } else {
        logger::info("No response body returned from server");
    }

    logger::info(format!(
        "{} - {status_text} obtained in {elapsed}ms",
        status.as_u16()
    ));

    if let Some(expected) = args.get("status").filter(|v| v.is_truthy()) {
        let expected_number = match expected {
            Value::Number(n) => *n,
            other => crate::args::js_to_number(&other.to_js_string()),
        };
        if expected_number != status.as_u16() as f64 {
            logger::error(format!(
                "ERROR: Response status code ({}) doesn't match expected value ({})",
                status.as_u16(),
                expected.to_js_string()
            ));
            std::process::exit(1);
        }
    }

    if let Some(expected) = args.get("text").filter(|v| v.is_truthy()) {
        let body_text = match &response_body {
            Value::String(s) => s.clone(),
            other => json::stringify(other),
        };
        let expected = expected.to_js_string();
        if !body_text.contains(&expected) {
            logger::error(format!(
                "ERROR: Response body doesn't contain expected text ({expected})"
            ));
            std::process::exit(1);
        }
    }

    Ok(Some(Response {
        status: status.as_u16(),
        status_text,
        headers,
        body: response_body,
        elapsed,
    }))
}

/// Matches `fetch` method normalization.
fn normalize_method(method: &str) -> String {
    let upper = method.to_ascii_uppercase();
    if ["DELETE", "GET", "HEAD", "OPTIONS", "POST", "PUT"].contains(&upper.as_str()) {
        upper
    } else {
        method.to_string()
    }
}

fn fetch(
    request: &HttpRequest,
    url: &str,
    body: Option<String>,
    follow_redirects: bool,
    insecure: bool,
) -> Result<ureq::http::Response<ureq::Body>, String> {
    use ureq::http;

    let method = normalize_method(&request.method);
    if body.is_some() && (method == "GET" || method == "HEAD") {
        return Err("Request with GET/HEAD method cannot have body.".to_string());
    }
    let method = http::Method::from_bytes(method.as_bytes())
        .map_err(|_| format!("Method '{method}' is not a valid HTTP method."))?;
    let uri: http::Uri = url
        .parse()
        .ok()
        .filter(|uri: &http::Uri| uri.host().is_some_and(|h| !h.is_empty()))
        .ok_or_else(|| format!("Invalid URL: '{url}'"))?;

    let mut builder = http::Request::builder().method(method).uri(uri);
    for (key, value) in &request.headers {
        let name = http::HeaderName::from_bytes(key.as_bytes())
            .map_err(|_| "Header name is not valid.".to_string())?;
        let value = http::HeaderValue::from_str(value)
            .map_err(|_| "Header value is not valid.".to_string())?;
        builder = builder.header(name, value);
    }

    let agent = ureq::Agent::config_builder()
        .http_status_as_error(false)
        .allow_non_standard_methods(true)
        .max_redirects(if follow_redirects { 20 } else { 0 })
        .redirect_auth_headers(ureq::config::RedirectAuthHeaders::SameHost)
        .user_agent(format!("jsonr/{}", crate::VERSION))
        .tls_config(TlsConfig::builder().disable_verification(insecure).build())
        .build()
        .new_agent();

    let result = match body {
        Some(body) => builder
            .body(body.into_bytes())
            .map_err(|err| err.to_string())
            .and_then(|req| agent.run(req).map_err(|err| err.to_string())),
        None => builder
            .body(())
            .map_err(|err| err.to_string())
            .and_then(|req| agent.run(req).map_err(|err| err.to_string())),
    };
    result.map_err(|err| format!("error sending request for url ({url}): {err}"))
}

/// Header iteration order of `fetch` `Headers`: sorted lowercase names,
/// duplicate values combined (except `set-cookie`).
fn normalize_headers(headers: &ureq::http::HeaderMap) -> Vec<(String, String)> {
    let mut entries: Vec<(String, String)> = Vec::new();
    for (name, value) in headers {
        let name = name.as_str().to_ascii_lowercase();
        let value = String::from_utf8_lossy(value.as_bytes()).to_string();
        if name != "set-cookie"
            && let Some(existing) = entries.iter_mut().find(|(k, _)| *k == name)
        {
            existing.1 = format!("{}, {value}", existing.1);
            continue;
        }
        entries.push((name, value));
    }
    entries.sort_by(|a, b| a.0.cmp(&b.0));
    entries
}
