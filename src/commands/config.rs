use super::is_command;
use crate::args::kebab_to_camel;
use crate::config::{self, CONFIG_FILE_NAME};
use crate::inspect::{self, Options};
use crate::json::{Object, Value};
use crate::logger;

const TEMPLATE: &str = include_str!("../templates/jsonr-config.json");

pub fn matches(args: &Object) -> bool {
    is_command(args, "config")
}

pub fn execute(args: &Object) {
    if args.is_truthy("init") {
        create_config();
    } else {
        display_config(args);
    }
}

fn create_config() {
    if std::fs::symlink_metadata(CONFIG_FILE_NAME).is_ok() {
        logger::error(format!(
            "ERROR: {CONFIG_FILE_NAME} already exists in the current directory. Delete it first if you want to regenerate it."
        ));
        std::process::exit(1);
    }
    if let Err(err) = std::fs::write(CONFIG_FILE_NAME, TEMPLATE) {
        logger::error(format!("ERROR: Failed to create config file: {err}"));
        std::process::exit(1);
    }
    logger::info(format!(
        "Created {CONFIG_FILE_NAME} in the current directory"
    ));
    logger::info("");
    logger::info("Edit this file to customize your environments and defaults.");
}

fn display_config(args: &Object) {
    if config::find_config_files().is_empty() {
        logger::info("No jsonr-config.json files found.");
        logger::info("");
        logger::info("Run 'jsonr config --init' to create a config file.");
        return;
    }

    let enriched = config::load_and_apply_config(args.clone());
    let mapped: Object = enriched
        .iter()
        .filter(|(key, _)| *key != "_" && *key != "--" && key.chars().count() != 1)
        .map(|(key, value)| (kebab_to_camel(key), value.clone()))
        .collect();

    logger::info("Merged configuration:");
    logger::info("");
    logger::info(inspect::inspect_value(
        &Value::Object(mapped),
        Options::verbose(),
    ));
}
