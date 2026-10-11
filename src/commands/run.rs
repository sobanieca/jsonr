use super::{first_positional, is_command, positional};
use crate::json::Object;
use crate::{logger, script};
use std::path::Path;

const TEMPLATE: &str = include_str!("../templates/jsonr-script.js");
const SCRIPT_FILE: &str = "jsonr-script.js";

pub fn matches(args: &Object) -> bool {
    is_command(args, "run")
        || first_positional(args)
            .is_some_and(|path| path.ends_with(".js") && Path::new(&path).exists())
}

/// `cli_args` are the command line arguments before config was applied.
pub fn execute(args: &Object, cli_args: &Object) -> Result<(), String> {
    if args.is_truthy("init") {
        init(args)
    } else {
        execute_script(args, cli_args)
    }
}

fn init(args: &Object) -> Result<(), String> {
    if std::fs::symlink_metadata(SCRIPT_FILE).is_ok() {
        logger::error(format!("ERROR: {SCRIPT_FILE} already exists"));
        std::process::exit(1);
    }
    let url_or_file = positional(args, 1).unwrap_or_else(|| "url or http file".to_string());
    let template = TEMPLATE.replace("{{urlOrFile}}", &url_or_file);
    std::fs::write(SCRIPT_FILE, template)
        .map_err(|err| format!("Failed to create {SCRIPT_FILE}: {err}"))?;
    logger::print_line(&format!("Created {SCRIPT_FILE} with jsonr usage template"));
    Ok(())
}

fn execute_script(args: &Object, cli_args: &Object) -> Result<(), String> {
    let script_path = if is_command(args, "run") {
        positional(args, 1)
    } else {
        first_positional(args)
    }
    .ok_or("Script path is required. Usage: jsonr run script.js")?;

    if std::fs::symlink_metadata(&script_path).is_err() {
        return Err(format!("Script file not found: {script_path}"));
    }

    logger::debug(format!("Executing script: {script_path}"));
    script::run_script(Path::new(&script_path), args, cli_args)
        .map_err(|err| format!("Failed to execute script: {err}"))
}
