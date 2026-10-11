use super::is_command;
use crate::json::{Object, Value};
use crate::logger;

pub const HELP: &str = include_str!("../help.txt");

pub fn matches(args: &Object) -> bool {
    is_command(args, "help") || args.get("help") == Some(&Value::Bool(true))
}

pub fn execute() {
    logger::print_line(HELP);
}
