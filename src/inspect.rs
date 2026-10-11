//! Value formatting compatible with `Deno.inspect` / `console.log`.
//!
//! The layout algorithm (line breaking, array grouping, string quoting) is a
//! port of Deno's `ext/web/console` implementation, which itself follows
//! Node.js `util.inspect`. Both are MIT licensed.

use crate::json::{self, Value};

/// A value to format. Covers JSON values plus the JavaScript values that can
/// show up in `console.log` calls in scripts.
#[derive(Clone, Debug)]
pub enum Node {
    Undefined,
    Null,
    Bool(bool),
    Number(f64),
    BigInt(String),
    String(String),
    Symbol(String),
    Array(Vec<Node>),
    Object {
        class: Option<String>,
        entries: Vec<(String, Node)>,
    },
    /// Preformatted text styled as "special" (e.g. `[Function: foo]`).
    Special(String),
    /// Preformatted text styled as a date.
    Date(String),
    /// Preformatted text without styling (e.g. error stacks).
    Raw(String),
}

impl From<&Value> for Node {
    fn from(value: &Value) -> Self {
        match value {
            Value::Null => Node::Null,
            Value::Bool(b) => Node::Bool(*b),
            Value::Number(n) => Node::Number(*n),
            Value::String(s) => Node::String(s.clone()),
            Value::Array(items) => Node::Array(items.iter().map(Node::from).collect()),
            Value::Object(object) => Node::Object {
                class: None,
                entries: object
                    .iter()
                    .map(|(k, v)| (k.clone(), Node::from(v)))
                    .collect(),
            },
        }
    }
}

#[derive(Clone, Copy, Debug)]
pub struct Options {
    pub colors: bool,
    pub depth: usize,
    pub iterable_limit: usize,
    pub str_abbreviate_size: usize,
}

impl Options {
    /// Options used to print response bodies and configuration.
    pub fn verbose() -> Self {
        Options {
            colors: true,
            depth: 100,
            iterable_limit: 20000,
            str_abbreviate_size: 256000,
        }
    }

    /// Defaults of `console.log`.
    pub fn console(colors: bool) -> Self {
        Options {
            colors,
            depth: 4,
            iterable_limit: 100,
            str_abbreviate_size: 10000,
        }
    }
}

pub fn inspect(node: &Node, options: Options) -> String {
    let mut ctx = Ctx {
        options,
        indentation_lvl: 0,
        current_depth: 0,
    };
    ctx.format_value(node, 0)
}

pub fn inspect_value(value: &Value, options: Options) -> String {
    inspect(&Node::from(value), options)
}

const BREAK_LENGTH: usize = 80;
const COMPACT: usize = 3;
const MIN_LINE_LENGTH: usize = 16;

enum Style {
    String,
    Number,
    Undefined,
    Null,
    Special,
    Date,
}

struct Ctx {
    options: Options,
    indentation_lvl: usize,
    current_depth: usize,
}

impl Ctx {
    fn stylize(&self, text: &str, style: Style) -> String {
        if !self.options.colors {
            return text.to_string();
        }
        let (open, close) = match style {
            Style::String => (32, 39),
            Style::Number => (33, 39),
            Style::Undefined => (90, 39),
            Style::Null => (1, 22),
            Style::Special => (36, 39),
            Style::Date => (35, 39),
        };
        format!("\x1b[{open}m{text}\x1b[{close}m")
    }

    fn format_value(&mut self, node: &Node, recurse_times: usize) -> String {
        match node {
            Node::Undefined => self.stylize("undefined", Style::Undefined),
            Node::Null => self.stylize("null", Style::Null),
            Node::Bool(b) => self.stylize(if *b { "true" } else { "false" }, Style::Number),
            Node::Number(n) => self.stylize(&number_display(*n), Style::Number),
            Node::BigInt(n) => self.stylize(&format!("{n}n"), Style::Number),
            Node::String(s) => self.format_string(s),
            Node::Symbol(s) => self.stylize(s, Style::String),
            Node::Special(s) => self.stylize(s, Style::Special),
            Node::Date(s) => self.stylize(s, Style::Date),
            Node::Raw(s) => s.clone(),
            Node::Array(_) | Node::Object { .. } => self.format_raw(node, recurse_times),
        }
    }

    fn format_string(&self, value: &str) -> String {
        let mut s = value.to_string();
        let mut trailer = String::new();
        let length = utf16_length(&s);
        let max = self.options.str_abbreviate_size;
        if length > max {
            let remaining = length - max;
            s = slice_utf16(&s, max);
            trailer = format!(
                "... {remaining} more character{}",
                if remaining > 1 { "s" } else { "" }
            );
        }
        let length = utf16_length(&s);
        if length > MIN_LINE_LENGTH
            && (length as f64) > BREAK_LENGTH as f64 - self.indentation_lvl as f64 - 4.0
        {
            // Split long strings after each newline.
            let mut parts: Vec<String> = Vec::new();
            let mut current = String::new();
            for c in s.chars() {
                current.push(c);
                if c == '\n' {
                    parts.push(std::mem::take(&mut current));
                }
            }
            if !current.is_empty() || parts.is_empty() {
                parts.push(current);
            }
            let joiner = format!(" +\n{}", " ".repeat(self.indentation_lvl + 2));
            let parts: Vec<String> = parts
                .iter()
                .map(|line| self.stylize(&quote_string(line), Style::String))
                .collect();
            return parts.join(&joiner) + &trailer;
        }
        self.stylize(&quote_string(&s), Style::String) + &trailer
    }

    fn format_raw(&mut self, node: &Node, recurse_times: usize) -> String {
        let (is_array, prefix, empty) = match node {
            Node::Array(items) => (true, String::new(), items.is_empty()),
            Node::Object { class, entries } => (
                false,
                class.as_ref().map(|c| format!("{c} ")).unwrap_or_default(),
                entries.is_empty(),
            ),
            _ => unreachable!(),
        };
        if empty {
            return if is_array {
                "[]".to_string()
            } else {
                format!("{prefix}{{}}")
            };
        }
        if recurse_times > self.options.depth {
            let name = match node {
                Node::Object {
                    class: Some(class), ..
                } => format!("[{class}]"),
                Node::Object { .. } => "[Object]".to_string(),
                _ => "[Array]".to_string(),
            };
            return self.stylize(&name, Style::Special);
        }
        let recurse_times = recurse_times + 1;
        self.current_depth = recurse_times;

        let mut output = Vec::new();
        let braces;
        match node {
            Node::Array(items) => {
                braces = ("[".to_string(), "]".to_string());
                let shown = items.len().min(self.options.iterable_limit);
                for item in &items[..shown] {
                    self.indentation_lvl += 2;
                    output.push(self.format_value(item, recurse_times));
                    self.indentation_lvl -= 2;
                }
                let remaining = items.len() - shown;
                if remaining > 0 {
                    output.push(format!(
                        "... {remaining} more item{}",
                        if remaining > 1 { "s" } else { "" }
                    ));
                }
            }
            Node::Object { entries, .. } => {
                braces = (format!("{prefix}{{"), "}".to_string());
                for (key, value) in entries {
                    self.indentation_lvl += 2;
                    let formatted = self.format_value(value, recurse_times);
                    self.indentation_lvl -= 2;
                    output.push(format!("{}: {formatted}", self.format_key(key)));
                }
            }
            _ => unreachable!(),
        }

        let numeric = match node {
            Node::Array(items) => Some(
                items
                    .iter()
                    .take(output.len())
                    .all(|item| matches!(item, Node::Number(_) | Node::BigInt(_))),
            ),
            _ => None,
        };
        self.reduce_to_single_string(output, &braces, numeric, recurse_times)
    }

    fn format_key(&self, key: &str) -> String {
        if is_identifier_like(key) {
            if key == "__proto__" {
                "['__proto__']".to_string()
            } else {
                key.to_string()
            }
        } else {
            self.stylize(&quote_string(key), Style::String)
        }
    }

    /// `numeric` is set for arrays: whether all elements are numbers.
    fn reduce_to_single_string(
        &mut self,
        mut output: Vec<String>,
        braces: &(String, String),
        numeric: Option<bool>,
        recurse_times: usize,
    ) -> String {
        let entries = output.len();
        if let Some(numeric) = numeric
            && entries > 6
        {
            output = self.group_array_elements(output, numeric);
        }
        if self.current_depth - recurse_times < COMPACT && entries == output.len() {
            let start = output.len() + self.indentation_lvl + utf16_length(&braces.0) + 10;
            if self.is_below_break_length(&output, start) {
                let joined = output.join(", ");
                if !joined.contains('\n') {
                    return format!("{} {joined} {}", braces.0, braces.1);
                }
            }
        }
        let indentation = format!("\n{}", " ".repeat(self.indentation_lvl));
        format!(
            "{}{indentation}  {}{indentation}{}",
            braces.0,
            output.join(&format!(",{indentation}  ")),
            braces.1
        )
    }

    fn is_below_break_length(&self, output: &[String], start: usize) -> bool {
        let mut total = output.len() + start;
        if total + output.len() > BREAK_LENGTH {
            return false;
        }
        for item in output {
            total += if self.options.colors {
                utf16_length(&remove_colors(item))
            } else {
                utf16_length(item)
            };
            if total > BREAK_LENGTH {
                return false;
            }
        }
        true
    }

    fn group_array_elements(&self, output: Vec<String>, numeric: bool) -> Vec<String> {
        let mut total_length = 0usize;
        let mut max_length = 0usize;
        let mut output_length = output.len();
        if self.options.iterable_limit < output.len() {
            // Exclude the "... n more items" entry.
            output_length -= 1;
        }
        let separator_space = 2;
        let mut data_len = vec![0usize; output_length];
        for (i, item) in output.iter().take(output_length).enumerate() {
            let len = string_width(item, self.options.colors);
            data_len[i] = len;
            total_length += len + separator_space;
            max_length = max_length.max(len);
        }
        let actual_max = max_length + separator_space;
        if ((actual_max * 3 + self.indentation_lvl) as f64) < BREAK_LENGTH as f64
            && ((total_length as f64) / (actual_max as f64) > 5.0 || max_length <= 6)
        {
            let average_bias =
                ((actual_max as f64) - (total_length as f64) / (output.len() as f64)).sqrt();
            let biased_max = ((actual_max as f64) - 3.0 - average_bias).max(1.0);
            let columns = ((2.5 * biased_max * (output_length as f64)).sqrt() / biased_max)
                .round()
                .min(((BREAK_LENGTH - self.indentation_lvl) as f64 / actual_max as f64).floor())
                .min((COMPACT * 4) as f64)
                .min(15.0);
            if columns <= 1.0 {
                return output;
            }
            let columns = columns as usize;
            let max_line_length: Vec<usize> = (0..columns)
                .map(|i| {
                    (i..output_length)
                        .step_by(columns)
                        .map(|j| data_len[j])
                        .max()
                        .unwrap_or(0)
                        + separator_space
                })
                .collect();
            let mut grouped = Vec::new();
            let mut i = 0;
            while i < output_length {
                let max = (i + columns).min(output_length);
                let mut line = String::new();
                let mut j = i;
                while j < max - 1 {
                    let padding = max_line_length[j - i] + utf16_length(&output[j]) - data_len[j];
                    line.push_str(&pad_utf16(&format!("{}, ", output[j]), padding, numeric));
                    j += 1;
                }
                if numeric {
                    let padding = max_line_length[j - i] + utf16_length(&output[j])
                        - data_len[j]
                        - separator_space;
                    line.push_str(&pad_utf16(&output[j], padding, true));
                } else {
                    line.push_str(&output[j]);
                }
                grouped.push(line);
                i += columns;
            }
            if self.options.iterable_limit < output.len() {
                grouped.push(output[output_length].clone());
            }
            return grouped;
        }
        output
    }
}

fn number_display(n: f64) -> String {
    if n == 0.0 && n.is_sign_negative() {
        "-0".to_string()
    } else {
        json::format_number(n)
    }
}

pub fn is_identifier_like(key: &str) -> bool {
    let mut chars = key.chars();
    match chars.next() {
        Some(c) if c.is_ascii_alphabetic() || c == '_' => {}
        _ => return false,
    }
    chars.all(|c| c.is_ascii_alphanumeric() || c == '_')
}

/// Quotes a string with the first quote character it doesn't contain.
pub fn quote_string(s: &str) -> String {
    let quote = ['"', '\'', '`']
        .into_iter()
        .find(|q| !s.contains(*q))
        .unwrap_or('"');
    let mut out = String::with_capacity(s.len() + 2);
    out.push(quote);
    for c in s.chars() {
        match c {
            c if c == quote => {
                out.push('\\');
                out.push(c);
            }
            '\\' => out.push_str("\\\\"),
            '\u{8}' => out.push_str("\\b"),
            '\u{c}' => out.push_str("\\f"),
            '\n' => out.push_str("\\n"),
            '\r' => out.push_str("\\r"),
            '\t' => out.push_str("\\t"),
            '\u{b}' => out.push_str("\\v"),
            c if (c as u32) <= 0x1f || (0x7f..=0x9f).contains(&(c as u32)) => {
                out.push_str(&format!("\\x{:02x}", c as u32));
            }
            c => out.push(c),
        }
    }
    out.push(quote);
    out
}

fn utf16_length(s: &str) -> usize {
    s.chars().map(char::len_utf16).sum()
}

fn slice_utf16(s: &str, end: usize) -> String {
    let mut out = String::new();
    let mut index = 0;
    for c in s.chars() {
        let len = c.len_utf16();
        if index + len > end {
            break;
        }
        out.push(c);
        index += len;
    }
    out
}

fn pad_utf16(s: &str, target: usize, pad_start: bool) -> String {
    let len = utf16_length(s);
    if len >= target {
        return s.to_string();
    }
    let padding = " ".repeat(target - len);
    if pad_start {
        format!("{padding}{s}")
    } else {
        format!("{s}{padding}")
    }
}

fn remove_colors(s: &str) -> String {
    crate::colors::strip_ansi(s)
}

/// Display width: full-width characters count as two, control and combining
/// characters as zero.
fn string_width(s: &str, remove_control: bool) -> usize {
    let stripped;
    let s = if remove_control {
        stripped = remove_colors(s);
        &stripped
    } else {
        s
    };
    s.chars()
        .map(|c| {
            let code = c as u32;
            if is_full_width(code) {
                2
            } else if is_zero_width(code) {
                0
            } else {
                1
            }
        })
        .sum()
}

fn is_zero_width(code: u32) -> bool {
    code <= 0x1f
        || (0x7f..=0x9f).contains(&code)
        || (0x300..=0x36f).contains(&code)
        || (0x200b..=0x200f).contains(&code)
        || (0x20d0..=0x20ff).contains(&code)
        || (0xfe00..=0xfe0f).contains(&code)
        || (0xfe20..=0xfe2f).contains(&code)
        || (0xe0100..=0xe01ef).contains(&code)
}

fn is_full_width(code: u32) -> bool {
    code >= 0x1100
        && (code <= 0x115f
            || code == 0x2329
            || code == 0x232a
            || ((0x2e80..=0x3247).contains(&code) && code != 0x303f)
            || (0x3250..=0x4dbf).contains(&code)
            || (0x4e00..=0xa4c6).contains(&code)
            || (0xa960..=0xa97c).contains(&code)
            || (0xac00..=0xd7a3).contains(&code)
            || (0xf900..=0xfaff).contains(&code)
            || (0xfe10..=0xfe19).contains(&code)
            || (0xfe30..=0xfe6b).contains(&code)
            || (0xff01..=0xff60).contains(&code)
            || (0xffe0..=0xffe6).contains(&code)
            || (0x1b000..=0x1b001).contains(&code)
            || (0x1f200..=0x1f251).contains(&code)
            || (0x1f300..=0x1f64f).contains(&code)
            || (0x20000..=0x3fffd).contains(&code))
}

#[cfg(test)]
mod tests {
    use super::*;

    /// Pairs of (JSON input, expected `Deno.inspect` output), generated with
    /// Deno 2.9 using `Options::verbose()` without colors.
    const CASES: &str = include_str!("../tests/fixtures/inspect-cases.json");

    #[test]
    fn matches_deno_inspect() {
        let cases = json::parse(CASES).expect("valid fixture");
        let Value::Array(cases) = cases else {
            panic!("fixture must be an array")
        };
        let options = Options {
            colors: false,
            ..Options::verbose()
        };
        let colored = Options::verbose();
        for case in &cases {
            let Value::Array(case) = case else { panic!() };
            let input = json::parse(case[0].as_str().unwrap()).unwrap();
            assert_eq!(
                inspect_value(&input, options),
                case[1].as_str().unwrap(),
                "input: {}",
                case[0].as_str().unwrap()
            );
            assert_eq!(
                inspect_value(&input, colored),
                case[2].as_str().unwrap(),
                "colored input: {}",
                case[0].as_str().unwrap()
            );
        }
    }
}
