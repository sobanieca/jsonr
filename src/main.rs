mod args;
mod colors;
mod commands;
mod config;
mod http_file;
mod inspect;
mod json;
mod logger;
mod request;
mod script;
mod update;

use commands::is_command;
use json::Value;

pub const VERSION: &str = env!("CARGO_PKG_VERSION");

fn main() {
    let raw: Vec<String> = std::env::args().skip(1).collect();
    logger::init(raw.iter().any(|arg| arg == "--debug"));

    let args = args::parse(&raw);
    logger::debug("Args provided:");
    logger::debug_value(&Value::Object(args.clone()));

    let mut args = config::load_and_apply_config(args);
    logger::debug("Args after applying config:");
    logger::debug_value(&Value::Object(args.clone()));

    let is_version =
        is_command(&args, "version") || args.get("version") == Some(&Value::Bool(true));
    let update_check = if is_version || is_command(&args, "update") {
        None
    } else {
        update::start_background_check()
    };

    let result = if commands::help::matches(&args) {
        commands::help::execute();
        Ok(())
    } else if is_version {
        logger::print_line(VERSION);
        Ok(())
    } else if is_command(&args, "update") {
        update::execute()
    } else if commands::run::matches(&args) {
        commands::run::execute(&args)
    } else if commands::config::matches(&args) {
        commands::config::execute(&args);
        Ok(())
    } else if commands::skill::matches(&args) {
        commands::skill::execute(&args)
    } else {
        request::send_request(&mut args).map(|_| ())
    };

    let code = match result {
        Ok(()) => 0,
        Err(message) => {
            logger::error(&message);
            1
        }
    };

    update::notify(update_check);
    std::process::exit(code);
}
