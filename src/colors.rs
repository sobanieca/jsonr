//! ANSI colors with the semantics of `@std/fmt/colors` (used by the logger)
//! and the Deno inspect theme (used for formatting values).

use std::sync::OnceLock;

/// Colors are disabled when `NO_COLOR` is set.
pub fn enabled() -> bool {
    static ENABLED: OnceLock<bool> = OnceLock::new();
    *ENABLED.get_or_init(|| std::env::var_os("NO_COLOR").is_none_or(|v| v.is_empty()))
}

/// `@std/fmt` style wrapping: nested resets of the same kind re-open the
/// outer color so it applies to the whole string.
fn run(s: &str, open: u8, close: u8) -> String {
    if !enabled() {
        return s.to_string();
    }
    let open = format!("\x1b[{open}m");
    let close = format!("\x1b[{close}m");
    format!("{open}{}{close}", s.replace(&close, &open))
}

pub fn yellow(s: &str) -> String {
    run(s, 33, 39)
}

pub fn bright_red(s: &str) -> String {
    run(s, 91, 39)
}

pub fn bright_blue(s: &str) -> String {
    run(s, 94, 39)
}

/// Removes ANSI escape sequences (`ESC [ ... letter`).
pub fn strip_ansi(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\x1b' && chars.peek() == Some(&'[') {
            chars.next();
            while let Some(&next) = chars.peek() {
                chars.next();
                if next.is_ascii_alphabetic() {
                    break;
                }
            }
            continue;
        }
        out.push(c);
    }
    out
}
