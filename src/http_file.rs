//! `.http` file parsing, `@@variable@@` / `{{variable}}` substitution and the
//! `--js` body conversion.

use crate::config::{is_js_whitespace, remove_trailing_commas};
use crate::logger;

#[derive(Debug, Default)]
pub struct HttpRequest {
    pub method: String,
    pub url: String,
    pub headers: Vec<(String, String)>,
    pub body: Option<String>,
}

/// Replaces `@@key@@` and `{{ key }}` placeholders.
pub fn replace_variables(text: &str, variables: &[(String, String)]) -> String {
    let mut result = text.to_string();
    for (key, value) in variables {
        logger::debug(format!("Replacing @@{key}@@ / {{{{{key}}}}} with {value}"));
        result = result.replace(&format!("@@{key}@@"), value);
        result = replace_handlebars(&result, key, value);
    }
    result
}

fn replace_handlebars(text: &str, key: &str, value: &str) -> String {
    let mut out = String::with_capacity(text.len());
    let mut rest = text;
    while let Some(start) = rest.find("{{") {
        out.push_str(&rest[..start]);
        let after = &rest[start + 2..];
        let inner = after.trim_start_matches(is_js_whitespace);
        if let Some(tail) = inner.strip_prefix(key) {
            let tail = tail.trim_start_matches(is_js_whitespace);
            if let Some(remaining) = tail.strip_prefix("}}") {
                out.push_str(value);
                rest = remaining;
                continue;
            }
        }
        out.push('{');
        rest = &rest[start + 1..];
    }
    out.push_str(rest);
    out
}

/// Names of placeholders that were not replaced.
pub fn find_unreplaced_variables(text: &str) -> Vec<String> {
    let mut names: Vec<String> = Vec::new();
    let mut push = |name: String| {
        if !names.contains(&name) {
            names.push(name);
        }
    };

    let mut found = Vec::new();
    // /@@([^@]+)@@/g
    let mut rest = text;
    while let Some(start) = rest.find("@@") {
        let after = &rest[start + 2..];
        let name_len = after.find('@').unwrap_or(after.len());
        if name_len > 0 && after[name_len..].starts_with("@@") {
            found.push(after[..name_len].to_string());
            rest = &after[name_len + 2..];
        } else {
            rest = &rest[start + 1..];
        }
    }
    for name in found {
        push(name);
    }

    // /\{\{\s*([^}]+?)\s*\}\}/g
    let mut rest = text;
    while let Some(start) = rest.find("{{") {
        let after = &rest[start + 2..];
        match after.find('}') {
            Some(end) if end > 0 && after[end..].starts_with("}}") => {
                let content = &after[..end];
                let trimmed = content.trim_matches(is_js_whitespace);
                let name = if trimmed.is_empty() {
                    content.chars().last().map(String::from).unwrap_or_default()
                } else {
                    trimmed.to_string()
                };
                push(name);
                rest = &after[end + 2..];
            }
            _ => rest = &rest[start + 1..],
        }
    }
    names
}

/// Removes lines starting with `#` or `//` (including their line break).
fn remove_comments(input: &str) -> String {
    input
        .split_inclusive('\n')
        .filter(|line| {
            let trimmed = line.trim_start_matches([' ', '\t']);
            !(trimmed.starts_with('#') || trimmed.starts_with("//"))
        })
        .collect()
}

/// `text.split(/\r?\n\r?\n/)`
fn split_on_blank_line(text: &str) -> Vec<&str> {
    let bytes = text.as_bytes();
    let mut parts = Vec::new();
    let mut start = 0;
    let mut i = 0;
    while i < bytes.len() {
        let first = if bytes[i] == b'\n' {
            Some(i + 1)
        } else if bytes[i] == b'\r' && bytes.get(i + 1) == Some(&b'\n') {
            Some(i + 2)
        } else {
            None
        };
        if let Some(after_first) = first {
            let second = if bytes.get(after_first) == Some(&b'\n') {
                Some(after_first + 1)
            } else if bytes.get(after_first) == Some(&b'\r')
                && bytes.get(after_first + 1) == Some(&b'\n')
            {
                Some(after_first + 2)
            } else {
                None
            };
            if let Some(end) = second {
                parts.push(&text[start..i]);
                start = end;
                i = end;
                continue;
            }
        }
        i += 1;
    }
    parts.push(&text[start..]);
    parts
}

fn split_lines(text: &str) -> Vec<&str> {
    text.split('\n')
        .map(|line| line.strip_suffix('\r').unwrap_or(line))
        .collect()
}

/// Parses `.http` content. Exits when input variables are missing.
pub fn parse_http_content(
    content: &str,
    variables: &[(String, String)],
    raw_mode: bool,
    ignore_input_validation: bool,
) -> HttpRequest {
    let content = replace_variables(content, variables);

    if !ignore_input_validation {
        let missing = find_unreplaced_variables(&content);
        if !missing.is_empty() {
            logger::error(format!(
                "ERROR: Missing required input variable(s): {}. Provide them via -i flag or jsonr-config.json. Did you forget to specify environment with -e flag?",
                missing.join(", ")
            ));
            std::process::exit(1);
        }
    }

    let content = remove_comments(&content);
    let parts = split_on_blank_line(&content);
    let main_part = parts[0];
    let body_part = parts.get(1).copied();

    let lines = split_lines(main_part);
    let mut words = lines[0].split(' ').map(str::trim);
    let method = words.next().unwrap_or_default().to_string();
    let url = words.next().unwrap_or_default().to_string();
    logger::debug(format!("Read following method: {method} and url: {url}"));

    let headers = lines[1..]
        .iter()
        .filter(|line| !line.is_empty())
        .map(|line| header_values(line))
        .collect();

    let body = body_part.filter(|b| !b.is_empty()).map(|body| {
        logger::debug(format!("Read following request body: {body}"));
        if raw_mode {
            body.to_string()
        } else {
            body.replace("\r\n", "").replace(['\n', '\t'], "")
        }
    });

    HttpRequest {
        method,
        url,
        headers,
        body,
    }
}

fn header_values(header: &str) -> (String, String) {
    match header.split_once(':') {
        Some((key, value)) => (key.trim().to_string(), value.trim().to_string()),
        None => (header.trim().to_string(), String::new()),
    }
}

/// Converts a JavaScript object literal (unquoted keys, single quotes,
/// trailing commas) to JSON.
pub fn convert_js_object_to_json(js_code: &str) -> String {
    let original: Vec<char> = js_code.trim_matches(is_js_whitespace).chars().collect();

    let converted: String = original
        .iter()
        .enumerate()
        .map(|(index, &c)| {
            if c == '\'' {
                let (in_string, quote) = string_context(&original, index);
                if !in_string || quote == Some('\'') {
                    return '"';
                }
            }
            c
        })
        .collect();

    let result: Vec<char> = remove_trailing_commas(&converted).chars().collect();

    // /([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g
    let is_ident_start = |c: char| c.is_ascii_alphabetic() || c == '_' || c == '$';
    let is_ident = |c: char| c.is_ascii_alphanumeric() || c == '_' || c == '$';
    let mut out = String::with_capacity(result.len());
    let mut i = 0;
    while i < result.len() {
        if result[i] == '{' || result[i] == ',' {
            let mut j = i + 1;
            while j < result.len() && is_js_whitespace(result[j]) {
                j += 1;
            }
            if j < result.len() && is_ident_start(result[j]) {
                let key_start = j;
                while j < result.len() && is_ident(result[j]) {
                    j += 1;
                }
                let key_end = j;
                while j < result.len() && is_js_whitespace(result[j]) {
                    j += 1;
                }
                if j < result.len() && result[j] == ':' {
                    if string_context(&result, i).0 {
                        out.extend(&result[i..=j]);
                    } else {
                        out.extend(&result[i..key_start]);
                        out.push('"');
                        out.extend(&result[key_start..key_end]);
                        out.push('"');
                        out.extend(&result[key_end..=j]);
                    }
                    i = j + 1;
                    continue;
                }
            }
        }
        out.push(result[i]);
        i += 1;
    }
    out
}

/// Whether `index` is inside a quoted string, and the quote character.
fn string_context(chars: &[char], index: usize) -> (bool, Option<char>) {
    let mut in_string = false;
    let mut quote = None;
    let mut escaped = false;
    for &c in &chars[..index] {
        if escaped {
            escaped = false;
            continue;
        }
        if c == '\\' {
            escaped = true;
            continue;
        }
        if (c == '"' || c == '\'') && !in_string {
            in_string = true;
            quote = Some(c);
        } else if Some(c) == quote && in_string {
            in_string = false;
            quote = None;
        }
    }
    (in_string, quote)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn vars(pairs: &[(&str, &str)]) -> Vec<(String, String)> {
        pairs
            .iter()
            .map(|(k, v)| (k.to_string(), v.to_string()))
            .collect()
    }

    #[test]
    fn replaces_both_variable_syntaxes() {
        let text = "@@a@@ {{a}} {{ a }} {{  b }} {{c}} $@@b@@";
        assert_eq!(
            replace_variables(text, &vars(&[("a", "1"), ("b", "$&")])),
            "1 1 1 $& {{c}} $$&"
        );
    }

    #[test]
    fn finds_unreplaced_variables() {
        assert_eq!(
            find_unreplaced_variables("@@a@@/@@b@@?x={{ c }}&y={{a}}&@@ z"),
            vec!["a", "b", "c"]
        );
    }

    #[test]
    fn parses_http_content() {
        let content = "# comment\r\nPOST http://x/y\r\nA: b:c\r\nB\r\n\r\n{\r\n\t\"a\": 1\r\n}\r\n\r\nignored";
        let request = parse_http_content(content, &[], false, false);
        assert_eq!(request.method, "POST");
        assert_eq!(request.url, "http://x/y");
        assert_eq!(
            request.headers,
            vec![
                ("A".to_string(), "b:c".to_string()),
                ("B".to_string(), String::new())
            ]
        );
        assert_eq!(request.body.as_deref(), Some("{\"a\": 1}"));
    }

    #[test]
    fn converts_js_objects() {
        assert_eq!(
            convert_js_object_to_json(
                "{ name: 'test', count: 8, items: ['A', \"B\"], enabled: true, }"
            ),
            r#"{ "name": "test", "count": 8, "items": ["A", "B"], "enabled": true }"#
        );
        assert_eq!(
            convert_js_object_to_json(r#"{ a: "it's, b: x", b: 1 }"#),
            r#"{ "a": "it's, b: x", "b": 1 }"#
        );
    }
}
