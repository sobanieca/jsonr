//! Minimal JSON support with JavaScript semantics: numbers are `f64`, object
//! keys keep insertion order (integer-like keys first, like JS objects) and
//! serialization matches `JSON.stringify`.

use std::fmt::Write as _;

#[derive(Clone, Debug, PartialEq)]
pub enum Value {
    Null,
    Bool(bool),
    Number(f64),
    String(String),
    Array(Vec<Value>),
    Object(Object),
}

impl Value {
    pub fn as_str(&self) -> Option<&str> {
        match self {
            Value::String(s) => Some(s),
            _ => None,
        }
    }

    pub fn as_object(&self) -> Option<&Object> {
        match self {
            Value::Object(o) => Some(o),
            _ => None,
        }
    }

    /// JS truthiness (`if (value)`).
    pub fn is_truthy(&self) -> bool {
        match self {
            Value::Null => false,
            Value::Bool(b) => *b,
            Value::Number(n) => *n != 0.0 && !n.is_nan(),
            Value::String(s) => !s.is_empty(),
            Value::Array(_) | Value::Object(_) => true,
        }
    }

    /// JS `String(value)`.
    pub fn to_js_string(&self) -> String {
        match self {
            Value::Null => "null".to_string(),
            Value::Bool(b) => b.to_string(),
            Value::Number(n) => format_number(*n),
            Value::String(s) => s.clone(),
            Value::Array(items) => items
                .iter()
                .map(|item| match item {
                    Value::Null => String::new(),
                    other => other.to_js_string(),
                })
                .collect::<Vec<_>>()
                .join(","),
            Value::Object(_) => "[object Object]".to_string(),
        }
    }
}

impl From<&str> for Value {
    fn from(s: &str) -> Self {
        Value::String(s.to_string())
    }
}

impl From<String> for Value {
    fn from(s: String) -> Self {
        Value::String(s)
    }
}

impl From<bool> for Value {
    fn from(b: bool) -> Self {
        Value::Bool(b)
    }
}

impl From<Object> for Value {
    fn from(o: Object) -> Self {
        Value::Object(o)
    }
}

/// An insertion-ordered object with JS property ordering rules.
#[derive(Clone, Debug, Default, PartialEq)]
pub struct Object {
    entries: Vec<(String, Value)>,
}

impl Object {
    pub fn new() -> Self {
        Self::default()
    }

    pub fn get(&self, key: &str) -> Option<&Value> {
        self.entries.iter().find(|(k, _)| k == key).map(|(_, v)| v)
    }

    pub fn get_mut(&mut self, key: &str) -> Option<&mut Value> {
        self.entries
            .iter_mut()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v)
    }

    pub fn get_str(&self, key: &str) -> Option<&str> {
        self.get(key).and_then(Value::as_str)
    }

    pub fn get_object(&self, key: &str) -> Option<&Object> {
        self.get(key).and_then(Value::as_object)
    }

    /// `if (obj[key])`
    pub fn is_truthy(&self, key: &str) -> bool {
        self.get(key).is_some_and(Value::is_truthy)
    }

    pub fn contains_key(&self, key: &str) -> bool {
        self.get(key).is_some()
    }

    /// Assigns a property like JS does: existing keys keep their position,
    /// new integer-like keys are ordered before all other keys.
    pub fn insert(&mut self, key: impl Into<String>, value: Value) {
        let key = key.into();
        if let Some(slot) = self.get_mut(&key) {
            *slot = value;
            return;
        }
        let position = match array_index(&key) {
            Some(index) => self
                .entries
                .iter()
                .position(|(k, _)| array_index(k).is_none_or(|other| other > index))
                .unwrap_or(self.entries.len()),
            None => self.entries.len(),
        };
        self.entries.insert(position, (key, value));
    }

    /// `Object.assign(this, other)`
    pub fn assign(&mut self, other: &Object) {
        for (key, value) in other.iter() {
            self.insert(key.clone(), value.clone());
        }
    }

    /// Returns the object stored under `key`, replacing any non-object value
    /// with an empty object first (`obj[key] ??= {}`).
    pub fn object_entry(&mut self, key: &str) -> &mut Object {
        if !matches!(self.get(key), Some(Value::Object(_))) {
            self.insert(key, Value::Object(Object::new()));
        }
        match self.get_mut(key) {
            Some(Value::Object(o)) => o,
            _ => unreachable!(),
        }
    }

    pub fn iter(&self) -> impl Iterator<Item = (&String, &Value)> {
        self.entries.iter().map(|(k, v)| (k, v))
    }

    pub fn keys(&self) -> impl Iterator<Item = &String> {
        self.entries.iter().map(|(k, _)| k)
    }

    pub fn len(&self) -> usize {
        self.entries.len()
    }

    pub fn is_empty(&self) -> bool {
        self.entries.is_empty()
    }
}

impl FromIterator<(String, Value)> for Object {
    fn from_iter<I: IntoIterator<Item = (String, Value)>>(iter: I) -> Self {
        let mut object = Object::new();
        for (key, value) in iter {
            object.insert(key, value);
        }
        object
    }
}

fn array_index(key: &str) -> Option<u32> {
    if key == "0" {
        return Some(0);
    }
    if key.is_empty() || key.starts_with('0') || !key.bytes().all(|b| b.is_ascii_digit()) {
        return None;
    }
    key.parse::<u32>().ok().filter(|&n| n != u32::MAX)
}

/// JS `Number.prototype.toString()`.
pub fn format_number(n: f64) -> String {
    if n.is_nan() {
        return "NaN".to_string();
    }
    if n == 0.0 {
        return "0".to_string();
    }
    if n.is_infinite() {
        return if n > 0.0 { "Infinity" } else { "-Infinity" }.to_string();
    }
    let sign = if n < 0.0 { "-" } else { "" };
    // Rust prints the shortest round-trip digits, just like JS.
    let scientific = format!("{:e}", n.abs());
    let (mantissa, exponent) = scientific.split_once('e').unwrap_or((&scientific, "0"));
    let exponent: i32 = exponent.parse().unwrap_or(0);
    let digits: String = mantissa.chars().filter(|c| *c != '.').collect();
    let k = digits.len() as i32;
    let point = exponent + 1;
    let body = if k <= point && point <= 21 {
        format!("{digits}{}", "0".repeat((point - k) as usize))
    } else if 0 < point && point <= 21 {
        let (int, frac) = digits.split_at(point as usize);
        format!("{int}.{frac}")
    } else if -6 < point && point <= 0 {
        format!("0.{}{digits}", "0".repeat((-point) as usize))
    } else {
        let e = point - 1;
        let e = if e >= 0 {
            format!("+{e}")
        } else {
            e.to_string()
        };
        if k == 1 {
            format!("{digits}e{e}")
        } else {
            format!("{}.{}e{e}", &digits[..1], &digits[1..])
        }
    };
    format!("{sign}{body}")
}

/// `JSON.stringify(value)` (compact).
pub fn stringify(value: &Value) -> String {
    let mut out = String::new();
    write_value(&mut out, value);
    out
}

fn write_value(out: &mut String, value: &Value) {
    match value {
        Value::Null => out.push_str("null"),
        Value::Bool(b) => out.push_str(if *b { "true" } else { "false" }),
        Value::Number(n) if n.is_finite() => out.push_str(&format_number(*n)),
        Value::Number(_) => out.push_str("null"),
        Value::String(s) => write_string(out, s),
        Value::Array(items) => {
            out.push('[');
            for (i, item) in items.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                write_value(out, item);
            }
            out.push(']');
        }
        Value::Object(object) => {
            out.push('{');
            for (i, (key, item)) in object.iter().enumerate() {
                if i > 0 {
                    out.push(',');
                }
                write_string(out, key);
                out.push(':');
                write_value(out, item);
            }
            out.push('}');
        }
    }
}

fn write_string(out: &mut String, s: &str) {
    out.push('"');
    for c in s.chars() {
        match c {
            '"' => out.push_str("\\\""),
            '\\' => out.push_str("\\\\"),
            '\u{8}' => out.push_str("\\b"),
            '\u{c}' => out.push_str("\\f"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            c if (c as u32) < 0x20 => {
                let _ = write!(out, "\\u{:04x}", c as u32);
            }
            c => out.push(c),
        }
    }
    out.push('"');
}

/// `JSON.parse(text)`.
pub fn parse(text: &str) -> Result<Value, String> {
    let mut parser = Parser {
        text,
        bytes: text.as_bytes(),
        pos: 0,
    };
    parser.skip_whitespace();
    let value = parser.value(0)?;
    parser.skip_whitespace();
    if parser.pos < parser.bytes.len() {
        return Err(parser.unexpected());
    }
    Ok(value)
}

const MAX_DEPTH: usize = 2000;

struct Parser<'a> {
    text: &'a str,
    bytes: &'a [u8],
    pos: usize,
}

impl Parser<'_> {
    fn unexpected(&self) -> String {
        match self
            .text
            .get(self.pos..)
            .and_then(|rest| rest.chars().next())
        {
            Some(c) => format!("Unexpected token '{c}' in JSON at position {}", self.pos),
            None => "Unexpected end of JSON input".to_string(),
        }
    }

    fn peek(&self) -> Option<u8> {
        self.bytes.get(self.pos).copied()
    }

    fn skip_whitespace(&mut self) {
        while matches!(self.peek(), Some(b' ' | b'\t' | b'\n' | b'\r')) {
            self.pos += 1;
        }
    }

    fn expect(&mut self, byte: u8) -> Result<(), String> {
        if self.peek() == Some(byte) {
            self.pos += 1;
            Ok(())
        } else {
            Err(self.unexpected())
        }
    }

    fn value(&mut self, depth: usize) -> Result<Value, String> {
        if depth > MAX_DEPTH {
            return Err("JSON is nested too deeply".to_string());
        }
        match self.peek() {
            Some(b'{') => self.object(depth),
            Some(b'[') => self.array(depth),
            Some(b'"') => self.string().map(Value::String),
            Some(b't') => self.literal("true", Value::Bool(true)),
            Some(b'f') => self.literal("false", Value::Bool(false)),
            Some(b'n') => self.literal("null", Value::Null),
            Some(b'-' | b'0'..=b'9') => self.number(),
            _ => Err(self.unexpected()),
        }
    }

    fn literal(&mut self, word: &str, value: Value) -> Result<Value, String> {
        for &b in word.as_bytes() {
            if self.peek() != Some(b) {
                return Err(self.unexpected());
            }
            self.pos += 1;
        }
        Ok(value)
    }

    fn object(&mut self, depth: usize) -> Result<Value, String> {
        self.pos += 1;
        let mut object = Object::new();
        self.skip_whitespace();
        if self.peek() == Some(b'}') {
            self.pos += 1;
            return Ok(Value::Object(object));
        }
        loop {
            self.skip_whitespace();
            if self.peek() != Some(b'"') {
                return Err(self.unexpected());
            }
            let key = self.string()?;
            self.skip_whitespace();
            self.expect(b':')?;
            self.skip_whitespace();
            let value = self.value(depth + 1)?;
            object.insert(key, value);
            self.skip_whitespace();
            match self.peek() {
                Some(b',') => self.pos += 1,
                Some(b'}') => {
                    self.pos += 1;
                    return Ok(Value::Object(object));
                }
                _ => return Err(self.unexpected()),
            }
        }
    }

    fn array(&mut self, depth: usize) -> Result<Value, String> {
        self.pos += 1;
        let mut items = Vec::new();
        self.skip_whitespace();
        if self.peek() == Some(b']') {
            self.pos += 1;
            return Ok(Value::Array(items));
        }
        loop {
            self.skip_whitespace();
            items.push(self.value(depth + 1)?);
            self.skip_whitespace();
            match self.peek() {
                Some(b',') => self.pos += 1,
                Some(b']') => {
                    self.pos += 1;
                    return Ok(Value::Array(items));
                }
                _ => return Err(self.unexpected()),
            }
        }
    }

    fn hex4(&mut self) -> Result<u32, String> {
        let digits = self
            .text
            .get(self.pos..self.pos + 4)
            .filter(|d| d.bytes().all(|b| b.is_ascii_hexdigit()))
            .ok_or_else(|| "Bad Unicode escape in JSON".to_string())?;
        self.pos += 4;
        u32::from_str_radix(digits, 16).map_err(|e| e.to_string())
    }

    fn string(&mut self) -> Result<String, String> {
        self.pos += 1;
        let mut out = String::new();
        loop {
            let start = self.pos;
            while let Some(b) = self.peek() {
                if b == b'"' || b == b'\\' || b < 0x20 {
                    break;
                }
                self.pos += 1;
            }
            out.push_str(&self.text[start..self.pos]);
            match self.peek() {
                Some(b'"') => {
                    self.pos += 1;
                    return Ok(out);
                }
                Some(b'\\') => {
                    self.pos += 1;
                    let escape = self.peek().ok_or_else(|| self.unexpected())?;
                    self.pos += 1;
                    match escape {
                        b'"' => out.push('"'),
                        b'\\' => out.push('\\'),
                        b'/' => out.push('/'),
                        b'b' => out.push('\u{8}'),
                        b'f' => out.push('\u{c}'),
                        b'n' => out.push('\n'),
                        b'r' => out.push('\r'),
                        b't' => out.push('\t'),
                        b'u' => {
                            let unit = self.hex4()?;
                            let c = if (0xD800..0xDC00).contains(&unit)
                                && self.bytes.get(self.pos..self.pos + 2) == Some(b"\\u")
                            {
                                let saved = self.pos;
                                self.pos += 2;
                                let low = self.hex4()?;
                                if (0xDC00..0xE000).contains(&low) {
                                    char::from_u32(
                                        0x10000 + ((unit - 0xD800) << 10) + (low - 0xDC00),
                                    )
                                } else {
                                    self.pos = saved;
                                    None
                                }
                            } else {
                                char::from_u32(unit)
                            };
                            out.push(c.unwrap_or('\u{FFFD}'));
                        }
                        _ => {
                            self.pos -= 1;
                            return Err(self.unexpected());
                        }
                    }
                }
                _ => return Err(self.unexpected()),
            }
        }
    }

    fn number(&mut self) -> Result<Value, String> {
        let start = self.pos;
        if self.peek() == Some(b'-') {
            self.pos += 1;
        }
        match self.peek() {
            Some(b'0') => self.pos += 1,
            Some(b'1'..=b'9') => {
                while matches!(self.peek(), Some(b'0'..=b'9')) {
                    self.pos += 1;
                }
            }
            _ => return Err(self.unexpected()),
        }
        if self.peek() == Some(b'.') {
            self.pos += 1;
            if !matches!(self.peek(), Some(b'0'..=b'9')) {
                return Err(self.unexpected());
            }
            while matches!(self.peek(), Some(b'0'..=b'9')) {
                self.pos += 1;
            }
        }
        if matches!(self.peek(), Some(b'e' | b'E')) {
            self.pos += 1;
            if matches!(self.peek(), Some(b'+' | b'-')) {
                self.pos += 1;
            }
            if !matches!(self.peek(), Some(b'0'..=b'9')) {
                return Err(self.unexpected());
            }
            while matches!(self.peek(), Some(b'0'..=b'9')) {
                self.pos += 1;
            }
        }
        self.text[start..self.pos]
            .parse::<f64>()
            .map(Value::Number)
            .map_err(|e| e.to_string())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn formats_numbers_like_js() {
        let cases = [
            (0.0, "0"),
            (-0.0, "0"),
            (1.0, "1"),
            (1.5, "1.5"),
            (-2.25, "-2.25"),
            (100.0, "100"),
            (0.1, "0.1"),
            (1e21, "1e+21"),
            (1.5e21, "1.5e+21"),
            (1e-7, "1e-7"),
            (1.25e-7, "1.25e-7"),
            (0.000001, "0.000001"),
            (123456789012345680000.0, "123456789012345680000"),
            (f64::NAN, "NaN"),
            (f64::INFINITY, "Infinity"),
        ];
        for (n, expected) in cases {
            assert_eq!(format_number(n), expected, "{n}");
        }
    }

    #[test]
    fn round_trips_json() {
        let text = r#"{"b":1,"a":[true,false,null,"x\n\"y\u0001"],"2":{},"1":-1.5e3}"#;
        let value = parse(text).unwrap();
        assert_eq!(
            stringify(&value),
            r#"{"1":-1500,"2":{},"b":1,"a":[true,false,null,"x\n\"y\u0001"]}"#
        );
    }

    #[test]
    fn duplicate_keys_keep_first_position_and_last_value() {
        let value = parse(r#"{"a":1,"b":2,"a":3}"#).unwrap();
        assert_eq!(stringify(&value), r#"{"a":3,"b":2}"#);
    }

    #[test]
    fn decodes_surrogate_pairs() {
        assert_eq!(parse(r#""😀""#).unwrap(), Value::from("😀"));
        assert_eq!(parse(r#""\ud83d""#).unwrap(), Value::from("\u{FFFD}"));
    }

    #[test]
    fn rejects_invalid_json() {
        for text in [
            "",
            "{",
            "[1,]",
            "{\"a\" 1}",
            "01",
            "1.",
            "tru",
            "\"a",
            "{} x",
        ] {
            assert!(parse(text).is_err(), "{text}");
        }
    }
}
