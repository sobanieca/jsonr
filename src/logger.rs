//! Console logger: info is bright blue, errors red, debug
//! output only with `--debug`. Values from secrets files are masked.

use crate::colors;
use crate::json::{self, Object, Value};
use std::io::Write;
use std::sync::Mutex;
use std::sync::atomic::{AtomicBool, Ordering};

static DEBUG: AtomicBool = AtomicBool::new(false);
static SECRETS: Mutex<Vec<String>> = Mutex::new(Vec::new());

pub fn init(debug: bool) {
    DEBUG.store(debug, Ordering::Relaxed);
}

pub fn register_secrets(secrets: &Object) {
    let mut registered = SECRETS.lock().unwrap_or_else(|e| e.into_inner());
    for (_, value) in secrets.iter() {
        if let Value::String(secret) = value
            && !secret.is_empty()
            && !registered.contains(secret)
        {
            registered.push(secret.clone());
        }
    }
}

fn mask(message: &str) -> String {
    let secrets = SECRETS.lock().unwrap_or_else(|e| e.into_inner());
    let mut message = message.to_string();
    for secret in secrets.iter() {
        message = message.replace(secret, "*****");
    }
    message
}

/// Writes a line to stdout, ignoring errors such as a closed pipe.
pub fn print_line(line: &str) {
    let mut stdout = std::io::stdout().lock();
    let _ = writeln!(stdout, "{line}");
    let _ = stdout.flush();
}

pub fn debug(message: impl AsRef<str>) {
    if DEBUG.load(Ordering::Relaxed) {
        print_line(&mask(message.as_ref()));
    }
}

/// Debug-logs a value the way `@std/log` does for objects (JSON).
pub fn debug_value(value: &Value) {
    if DEBUG.load(Ordering::Relaxed) {
        debug(json::stringify(value));
    }
}

pub fn info(message: impl AsRef<str>) {
    print_line(&colors::bright_blue(&mask(message.as_ref())));
}

pub fn error(message: impl AsRef<str>) {
    print_line(&colors::bright_red(&mask(message.as_ref())));
}
