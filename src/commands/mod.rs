//! Commands. The first command whose `matches` returns true is executed.

pub mod config;
pub mod help;
pub mod run;
pub mod skill;

use crate::json::{Object, Value};

/// First positional argument.
pub fn first_positional(args: &Object) -> Option<String> {
    match args.get("_") {
        Some(Value::Array(items)) => items.first().map(Value::to_js_string),
        _ => None,
    }
}

/// Positional argument at `index`.
pub fn positional(args: &Object, index: usize) -> Option<String> {
    match args.get("_") {
        Some(Value::Array(items)) => items.get(index).map(Value::to_js_string),
        _ => None,
    }
}

pub fn is_command(args: &Object, name: &str) -> bool {
    first_positional(args).as_deref() == Some(name)
}
