//! Command line parsing. Mirrors the behavior of `@std/cli` `parseArgs` used
//! by previous versions: unknown flags are accepted (and can be set from
//! config files), aliases are stored under both names and `-i` / `-h` values
//! are collected into objects.

use crate::json::{Object, Value};

const BOOLEANS: &[&str] = &[
    "help",
    "debug",
    "init",
    "omit-default-content-type-header",
    "verbose",
    "raw",
    "follow-redirects",
    "js",
    "dry",
    "ignore-input-validation",
    "insecure",
];

const STRINGS: &[&str] = &[
    "body",
    "environment",
    "secrets",
    "status",
    "text",
    "method",
    "output",
];

const COLLECT: &[&str] = &["input-variable", "header"];

const ALIASES: &[(&str, &str)] = &[
    ("v", "verbose"),
    ("r", "raw"),
    ("f", "follow-redirects"),
    ("i", "input-variable"),
    ("b", "body"),
    ("h", "header"),
    ("e", "environment"),
    ("s", "status"),
    ("t", "text"),
    ("m", "method"),
    ("o", "output"),
];

/// Parses and normalizes command line arguments.
pub fn parse(raw: &[String]) -> Object {
    normalize(parse_raw(raw))
}

struct Spec {
    booleans: Vec<String>,
    strings: Vec<String>,
    collect: Vec<String>,
}

fn aliases_of(key: &str) -> Vec<&'static str> {
    ALIASES
        .iter()
        .filter_map(|&(short, long)| {
            if short == key {
                Some(long)
            } else if long == key {
                Some(short)
            } else {
                None
            }
        })
        .collect()
}

fn has_alias(key: &str) -> bool {
    !aliases_of(key).is_empty()
}

impl Spec {
    fn new() -> Self {
        let expand = |keys: &[&str]| {
            let mut out: Vec<String> = Vec::new();
            for key in keys {
                for name in std::iter::once(*key).chain(aliases_of(key)) {
                    if !out.iter().any(|existing| existing == name) {
                        out.push(name.to_string());
                    }
                }
            }
            out
        };
        Spec {
            booleans: expand(BOOLEANS),
            strings: expand(STRINGS),
            collect: expand(COLLECT),
        }
    }

    fn is_boolean(&self, key: &str) -> bool {
        self.booleans.iter().any(|k| k == key)
    }

    fn is_string(&self, key: &str) -> bool {
        self.strings.iter().any(|k| k == key)
    }

    fn is_collect(&self, key: &str) -> bool {
        self.collect.iter().any(|k| k == key)
    }

    fn alias_is_boolean(&self, key: &str) -> bool {
        aliases_of(key).iter().any(|alias| self.is_boolean(alias))
    }
}

enum Arg {
    Str(String),
    Bool(bool),
}

fn parse_raw(raw: &[String]) -> Object {
    let spec = Spec::new();
    let mut argv = Object::new();
    argv.insert("_", Value::Array(Vec::new()));

    let (args, not_flags) = match raw.iter().position(|a| a == "--") {
        Some(index) => (&raw[..index], raw[index + 1..].to_vec()),
        None => (raw, Vec::new()),
    };

    let set = |argv: &mut Object, key: &str, value: Arg| {
        let value = match value {
            Arg::Bool(b) => Value::Bool(b),
            Arg::Str(s) if !spec.is_string(key) && is_number(&s) => Value::Number(js_to_number(&s)),
            Arg::Str(s) => Value::String(s),
        };
        let collect = spec.is_collect(key);
        set_nested(argv, key, value.clone(), collect);
        for alias in aliases_of(key) {
            set_nested(argv, alias, value.clone(), collect);
        }
    };

    let mut i = 0;
    'args: while i < args.len() {
        let arg = &args[i];
        let Some(flag) = match_flag(arg) else {
            if let Some(Value::Array(positional)) = argv.get_mut("_") {
                positional.push(Value::String(arg.clone()));
            }
            i += 1;
            continue;
        };

        if flag.double_dash {
            let mut key = flag.key;
            if let Some(value) = flag.value {
                let value = if spec.is_boolean(&key) {
                    Arg::Bool(value != "false")
                } else {
                    Arg::Str(value)
                };
                set(&mut argv, &key, value);
                i += 1;
                continue;
            }
            if flag.negated {
                key = format!("no-{key}");
            }
            if let Some(next) = args.get(i + 1).filter(|n| !n.is_empty()) {
                if !spec.is_boolean(&key)
                    && !next.starts_with('-')
                    && (!has_alias(&key) || !spec.alias_is_boolean(&key))
                {
                    set(&mut argv, &key, Arg::Str(next.clone()));
                    i += 2;
                    continue;
                }
                if next == "true" || next == "false" {
                    set(&mut argv, &key, Arg::Bool(next != "false"));
                    i += 2;
                    continue;
                }
            }
            let value = if spec.is_string(&key) {
                Arg::Str(String::new())
            } else {
                Arg::Bool(true)
            };
            set(&mut argv, &key, value);
            i += 1;
            continue;
        }

        // Short flags, possibly grouped (`-vf`) or with attached values (`-s200`).
        let chars: Vec<char> = arg.chars().collect();
        let letters = &chars[1..chars.len() - 1];
        for (j, letter) in letters.iter().enumerate() {
            let letter = letter.to_string();
            let next: String = chars[j + 2..].iter().collect();
            if next == "-" {
                set(&mut argv, &letter, Arg::Str(next));
                continue;
            }
            if next == "=" {
                set(&mut argv, &letter, Arg::Str(String::new()));
                i += 1;
                continue 'args;
            }
            if letter.chars().all(|c| c.is_ascii_alphabetic()) {
                if let Some(value) = value_after_equals(&next) {
                    set(&mut argv, &letter, Arg::Str(value));
                    i += 1;
                    continue 'args;
                }
                if ends_with_number(&next) {
                    set(&mut argv, &letter, Arg::Str(next));
                    i += 1;
                    continue 'args;
                }
            }
            if letters
                .get(j + 1)
                .is_some_and(|c| !(c.is_ascii_alphanumeric() || *c == '_'))
            {
                set(&mut argv, &letter, Arg::Str(next));
                i += 1;
                continue 'args;
            }
            let value = if spec.is_string(&letter) {
                Arg::Str(String::new())
            } else {
                Arg::Bool(true)
            };
            set(&mut argv, &letter, value);
        }

        let key = chars[chars.len() - 1].to_string();
        if key == "-" {
            i += 1;
            continue;
        }
        if let Some(next) = args.get(i + 1).filter(|n| !n.is_empty()) {
            if !is_hyphen_flag(next)
                && !spec.is_boolean(&key)
                && (!has_alias(&key) || !spec.alias_is_boolean(&key))
            {
                set(&mut argv, &key, Arg::Str(next.clone()));
                i += 2;
                continue;
            }
            if next == "true" || next == "false" {
                set(&mut argv, &key, Arg::Bool(next != "false"));
                i += 2;
                continue;
            }
        }
        let value = if spec.is_string(&key) {
            Arg::Str(String::new())
        } else {
            Arg::Bool(true)
        };
        set(&mut argv, &key, value);
        i += 1;
    }

    for key in &spec.booleans {
        if !argv.contains_key(key) {
            let value = if spec.is_collect(key) {
                Value::Array(Vec::new())
            } else {
                Value::Bool(false)
            };
            argv.insert(key.clone(), value);
        }
    }

    argv.insert(
        "--",
        Value::Array(not_flags.into_iter().map(Value::String).collect()),
    );
    argv
}

struct Flag {
    double_dash: bool,
    negated: bool,
    key: String,
    value: Option<String>,
}

/// `^(?:-(?:(?<doubleDash>-)(?<negated>no-)?)?)(?<key>.+?)(?:=(?<value>.*))?$`
fn match_flag(arg: &str) -> Option<Flag> {
    let rest = arg.strip_prefix('-')?;
    let (double_dash, rest) = match rest.strip_prefix('-') {
        Some(after) if !after.is_empty() => (true, after),
        _ => (false, rest),
    };
    if rest.is_empty() {
        return None;
    }
    let (negated, rest) = match rest.strip_prefix("no-") {
        Some(after) if double_dash && !after.is_empty() => (true, after),
        _ => (false, rest),
    };
    // The key is at least one character long and ends before the first `=`.
    let first_len = rest.chars().next().map_or(0, char::len_utf8);
    let (key, value) = match rest[first_len..].find('=') {
        Some(index) => {
            let split = first_len + index;
            (
                rest[..split].to_string(),
                Some(rest[split + 1..].to_string()),
            )
        }
        None => (rest.to_string(), None),
    };
    Some(Flag {
        double_dash,
        negated,
        key,
        value,
    })
}

/// `/=(?<value>.+)/`
fn value_after_equals(s: &str) -> Option<String> {
    let index = s.find('=')?;
    let value: String = s[index + 1..]
        .chars()
        .take_while(|c| !is_line_terminator(*c))
        .collect();
    (!value.is_empty()).then_some(value)
}

fn is_line_terminator(c: char) -> bool {
    matches!(c, '\n' | '\r' | '\u{2028}' | '\u{2029}')
}

/// `/-?\d+(\.\d*)?(e-?\d+)?$/` (unanchored at the start)
fn ends_with_number(s: &str) -> bool {
    let chars: Vec<char> = s.chars().collect();
    (0..chars.len()).any(|start| is_full_number(&chars[start..]))
}

fn is_full_number(chars: &[char]) -> bool {
    let mut i = 0;
    if chars.get(i) == Some(&'-') {
        i += 1;
    }
    let digits_start = i;
    while chars.get(i).is_some_and(char::is_ascii_digit) {
        i += 1;
    }
    if i == digits_start {
        return false;
    }
    if chars.get(i) == Some(&'.') {
        i += 1;
        while chars.get(i).is_some_and(char::is_ascii_digit) {
            i += 1;
        }
    }
    if chars.get(i) == Some(&'e') {
        let mut j = i + 1;
        if chars.get(j) == Some(&'-') {
            j += 1;
        }
        let exp_start = j;
        while chars.get(j).is_some_and(char::is_ascii_digit) {
            j += 1;
        }
        if j > exp_start {
            i = j;
        }
    }
    i == chars.len()
}

/// `/^(-|--)[^-]/`
fn is_hyphen_flag(s: &str) -> bool {
    let mut chars = s.chars();
    match (chars.next(), chars.next(), chars.next()) {
        (Some('-'), Some(c), _) if c != '-' => true,
        (Some('-'), Some('-'), Some(c)) => c != '-',
        _ => false,
    }
}

fn is_number(s: &str) -> bool {
    !s.trim().is_empty() && js_to_number(s).is_finite()
}

/// JS `Number(string)`.
pub fn js_to_number(s: &str) -> f64 {
    let s = s.trim_matches(|c: char| c.is_whitespace() || c == '\u{feff}');
    if s.is_empty() {
        return 0.0;
    }
    for (prefix, radix) in [
        ("0x", 16),
        ("0X", 16),
        ("0o", 8),
        ("0O", 8),
        ("0b", 2),
        ("0B", 2),
    ] {
        if let Some(digits) = s.strip_prefix(prefix) {
            if digits.is_empty() || !digits.chars().all(|c| c.is_digit(radix)) {
                return f64::NAN;
            }
            return digits.chars().fold(0.0, |acc, c| {
                acc * radix as f64 + c.to_digit(radix).unwrap_or(0) as f64
            });
        }
    }
    let unsigned = s.strip_prefix(['+', '-']).unwrap_or(s);
    if unsigned == "Infinity" {
        return if s.starts_with('-') {
            f64::NEG_INFINITY
        } else {
            f64::INFINITY
        };
    }
    let valid = {
        let chars: Vec<char> = unsigned.chars().collect();
        let mut i = 0;
        let int_start = i;
        while chars.get(i).is_some_and(char::is_ascii_digit) {
            i += 1;
        }
        let mut digits = i - int_start;
        if chars.get(i) == Some(&'.') {
            i += 1;
            let frac_start = i;
            while chars.get(i).is_some_and(char::is_ascii_digit) {
                i += 1;
            }
            digits += i - frac_start;
        }
        if digits > 0 && matches!(chars.get(i), Some('e' | 'E')) {
            i += 1;
            if matches!(chars.get(i), Some('+' | '-')) {
                i += 1;
            }
            let exp_start = i;
            while chars.get(i).is_some_and(char::is_ascii_digit) {
                i += 1;
            }
            if i == exp_start {
                return f64::NAN;
            }
        }
        digits > 0 && i == chars.len()
    };
    if !valid {
        return f64::NAN;
    }
    s.parse::<f64>().unwrap_or(f64::NAN)
}

fn set_nested(argv: &mut Object, key: &str, value: Value, collect: bool) {
    let mut path: Vec<&str> = key.split('.').collect();
    let last = path.pop().unwrap_or(key);
    let mut target = argv;
    for part in path {
        if !matches!(target.get(part), Some(Value::Object(_))) {
            if target.contains_key(part) {
                return;
            }
            target.insert(part, Value::Object(Object::new()));
        }
        target = match target.get_mut(part) {
            Some(Value::Object(o)) => o,
            _ => return,
        };
    }
    if collect {
        match target.get_mut(last) {
            Some(Value::Array(items)) => items.push(value),
            Some(existing) if existing.is_truthy() => {
                let existing = existing.clone();
                target.insert(last, Value::Array(vec![existing, value]));
            }
            _ => target.insert(last, Value::Array(vec![value])),
        }
    } else {
        target.insert(last, value);
    }
}

pub fn kebab_to_camel(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '-'
            && let Some(&next) = chars.peek()
            && next.is_ascii_lowercase()
        {
            out.push(next.to_ascii_uppercase());
            chars.next();
            continue;
        }
        out.push(c);
    }
    out
}

/// Parses `["key: value", ...]` into an object.
fn parse_key_value_array(value: &Value) -> Object {
    let items: Vec<&Value> = match value {
        Value::Array(items) => items.iter().collect(),
        Value::Object(object) => object.iter().map(|(_, v)| v).collect(),
        _ => Vec::new(),
    };
    let mut result = Object::new();
    for item in items {
        let Value::String(item) = item else { continue };
        let Some((key, value)) = item.split_once(':') else {
            continue;
        };
        result.insert(key.trim(), Value::String(value.trim().to_string()));
    }
    result
}

fn key_value_field(key: &str) -> Option<&'static str> {
    match key {
        "input-variable" | "i" => Some("inputVariables"),
        "header" | "h" => Some("headers"),
        _ => None,
    }
}

fn normalize(args: Object) -> Object {
    let mut normalized = Object::new();
    for (key, value) in args.iter() {
        let target = key_value_field(key);
        if let Some(target) = target {
            let parsed = parse_key_value_array(value);
            normalized.object_entry(target).assign(&parsed);
        } else if key.contains('-') {
            normalized.insert(kebab_to_camel(key), value.clone());
        } else {
            normalized.insert(key.clone(), value.clone());
        }
    }
    normalized
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::json::stringify;

    fn parse_str(args: &[&str]) -> String {
        let raw: Vec<String> = args.iter().map(|s| s.to_string()).collect();
        stringify(&Value::Object(parse(&raw)))
    }

    #[test]
    fn parses_flags_and_aliases() {
        assert_eq!(
            parse_str(&[
                "-e", "test", "-v", "get.http", "-s", "200", "-i", "a: 1", "-i", "b:2:3", "-h",
                "X: y"
            ]),
            concat!(
                r#"{"_":["get.http"],"e":"test","environment":"test","v":true,"verbose":true,"#,
                r#""s":"200","status":"200","inputVariables":{"a":"1","b":"2:3"},"headers":{"X":"y"},"#,
                r#""help":false,"debug":false,"init":false,"omitDefaultContentTypeHeader":false,"#,
                r#""raw":false,"r":false,"followRedirects":false,"f":false,"js":false,"dry":false,"#,
                r#""ignoreInputValidation":false,"insecure":false,"--":[]}"#
            )
        );
    }

    #[test]
    fn handles_unknown_flags_like_std_cli() {
        let parsed = parse_str(&[
            "--version",
            "--deno",
            "--port",
            "8080",
            "--name=x",
            "--no-color",
            "-vf",
        ]);
        assert!(parsed.contains(r#""version":true"#), "{parsed}");
        assert!(parsed.contains(r#""deno":true"#), "{parsed}");
        assert!(parsed.contains(r#""port":8080"#), "{parsed}");
        assert!(parsed.contains(r#""name":"x""#), "{parsed}");
        assert!(parsed.contains(r#""noColor":true"#), "{parsed}");
        assert!(parsed.contains(r#""followRedirects":true"#), "{parsed}");
    }

    #[test]
    fn handles_attached_values_and_double_dash() {
        // Matches std/cli: letters after `-m` become separate flags.
        let parsed = parse_str(&["-s200", "-mPOST", "x", "--", "--raw"]);
        assert!(parsed.contains(r#""status":"200""#), "{parsed}");
        assert!(
            parsed.contains(r#""method":"","P":true,"O":true,"S":true,"T":"x""#),
            "{parsed}"
        );
        assert!(parsed.contains(r#""_":[]"#), "{parsed}");
        assert!(parsed.contains(r#""--":["--raw"]"#), "{parsed}");
    }

    #[test]
    fn converts_numbers_like_js() {
        assert_eq!(js_to_number(" 42 "), 42.0);
        assert_eq!(js_to_number("0x1F"), 31.0);
        assert_eq!(js_to_number(".5"), 0.5);
        assert_eq!(js_to_number("5."), 5.0);
        assert_eq!(js_to_number("1e3"), 1000.0);
        assert!(js_to_number("1e").is_nan());
        assert!(js_to_number("abc").is_nan());
        assert!(js_to_number("inf").is_nan());
    }
}
