//! `jsonr-config.json` handling: hierarchical lookup from the current
//! directory up to the home directory, named environments, defaults and
//! secrets files.

use crate::json::{self, Object, Value};
use crate::logger;
use std::path::{Path, PathBuf};

pub const CONFIG_FILE_NAME: &str = "jsonr-config.json";

pub enum ReadError {
    NotFound,
    Other(String),
}

/// Strips whole-line `//` and `#` comments.
fn strip_json_comments(content: &str) -> String {
    content
        .split('\n')
        .map(|line| {
            let trimmed = line.trim_start();
            if trimmed.starts_with("//") || trimmed.starts_with('#') {
                ""
            } else {
                line
            }
        })
        .collect::<Vec<_>>()
        .join("\n")
}

/// Removes commas followed only by whitespace and a closing bracket.
pub fn remove_trailing_commas(content: &str) -> String {
    let chars: Vec<char> = content.chars().collect();
    let mut out = String::with_capacity(content.len());
    for (i, &c) in chars.iter().enumerate() {
        if c == ',' {
            let next = chars[i + 1..].iter().find(|c| !is_js_whitespace(**c));
            if matches!(next, Some('}' | ']')) {
                continue;
            }
        }
        out.push(c);
    }
    out
}

pub fn is_js_whitespace(c: char) -> bool {
    c.is_whitespace() || c == '\u{feff}'
}

pub fn read_json_file(path: &Path) -> Result<Value, ReadError> {
    let content = match std::fs::read(path) {
        Ok(bytes) => decode_text(&bytes),
        Err(err) if err.kind() == std::io::ErrorKind::NotFound => return Err(ReadError::NotFound),
        Err(err) => return Err(ReadError::Other(format!("Failed to parse JSON: {err}"))),
    };
    let content = remove_trailing_commas(&strip_json_comments(&content));
    json::parse(&content).map_err(|err| ReadError::Other(format!("Failed to parse JSON: {err}")))
}

/// Decodes UTF-8 text like `TextDecoder` does (lossy, without a BOM).
pub fn decode_text(bytes: &[u8]) -> String {
    let text = String::from_utf8_lossy(bytes);
    text.strip_prefix('\u{feff}').unwrap_or(&text).to_string()
}

fn read_config_file(path: &Path) -> Option<Object> {
    match read_json_file(path) {
        Ok(Value::Object(config)) => {
            logger::debug(format!(
                "Successfully loaded config from {}",
                path.display()
            ));
            Some(config)
        }
        Ok(_) => {
            logger::debug(format!("Config file {} is not an object", path.display()));
            None
        }
        Err(ReadError::NotFound) => {
            logger::debug(format!("Config file not found at {}", path.display()));
            None
        }
        Err(ReadError::Other(err)) => {
            logger::debug(format!(
                "Error reading config file {}: {err}",
                path.display()
            ));
            logger::error(format!(
                "Warning: Failed to parse {}. Ensure it contains valid JSON.",
                path.display()
            ));
            None
        }
    }
}

pub fn home_dir() -> Option<String> {
    ["HOME", "USERPROFILE"]
        .into_iter()
        .filter_map(|name| std::env::var(name).ok())
        .find(|value| !value.is_empty())
}

fn expand_tilde(path: &str) -> String {
    match (path.strip_prefix('~'), home_dir()) {
        (Some(rest), Some(home)) => format!("{home}{rest}"),
        _ => path.to_string(),
    }
}

/// Resolves a path against the current directory and normalizes `.`/`..`.
pub fn resolve(path: &Path) -> PathBuf {
    let absolute = if path.is_absolute() {
        path.to_path_buf()
    } else {
        std::env::current_dir().unwrap_or_default().join(path)
    };
    let mut out = PathBuf::new();
    for component in absolute.components() {
        match component {
            std::path::Component::ParentDir => {
                out.pop();
            }
            std::path::Component::CurDir => {}
            other => out.push(other),
        }
    }
    out
}

fn load_secrets_file(path: &str) -> Object {
    let path = expand_tilde(path);
    logger::debug(format!("Loading secrets from {path}"));
    match read_json_file(Path::new(&path)) {
        Ok(value) => {
            let secrets = match value {
                Value::Object(secrets) => secrets,
                _ => Object::new(),
            };
            logger::register_secrets(&secrets);
            logger::debug(format!(
                "Loaded {} variables from secrets file",
                secrets.len()
            ));
            secrets
        }
        Err(ReadError::NotFound) => {
            logger::error(format!(
                "ERROR: Secrets file not found at {path}. Please check the path in your config file."
            ));
            std::process::exit(1);
        }
        Err(ReadError::Other(err)) => {
            logger::error(format!(
                "ERROR: Failed to read secrets file at {path}: {err}"
            ));
            std::process::exit(1);
        }
    }
}

/// Reads all config files from the home directory down to the current
/// directory (closest last).
pub fn find_config_files() -> Vec<Object> {
    let Some(home) = home_dir() else {
        logger::debug("Could not determine home directory");
        return Vec::new();
    };
    let current = std::env::current_dir().unwrap_or_default();
    let home = resolve(Path::new(&home));
    logger::debug(format!(
        "Searching for {CONFIG_FILE_NAME} files from {} to {}",
        current.display(),
        home.display()
    ));

    let mut directories = Vec::new();
    let mut dir = current.as_path();
    loop {
        directories.push(dir.to_path_buf());
        if dir == home {
            break;
        }
        match dir.parent() {
            Some(parent) => dir = parent,
            None => break,
        }
    }

    directories
        .iter()
        .rev()
        .filter_map(|dir| read_config_file(&dir.join(CONFIG_FILE_NAME)))
        .collect()
}

/// Merges one config section (`defaults` or an environment) into `merged`.
fn merge_section(merged: &mut Object, section: &Object) {
    for (key, value) in section.iter() {
        match (key.as_str(), value) {
            ("inputVariables", value) => {
                let target = merged.object_entry("inputVariables");
                if let Value::Object(value) = value {
                    target.assign(value);
                }
            }
            ("secrets", value) => merged.insert("secrets", value.clone()),
            (_, Value::Object(value)) => merged.object_entry(key).assign(value),
            _ => merged.insert(key.clone(), value.clone()),
        }
    }
}

fn merge_environment_configs(configs: &[Object], env_name: &str) -> Option<Object> {
    let mut merged = Object::new();
    for config in configs {
        if let Some(section) = config
            .get_object("environments")
            .and_then(|envs| envs.get_object(env_name))
        {
            merge_section(&mut merged, section);
        }
    }
    (!merged.is_empty()).then_some(merged)
}

fn merge_default_configs(configs: &[Object]) -> Object {
    let mut merged = Object::new();
    for config in configs {
        if let Some(section) = config.get_object("defaults") {
            merge_section(&mut merged, section);
        }
    }
    merged
}

fn collect_environment_names(configs: &[Object]) -> Vec<String> {
    let mut names: Vec<String> = Vec::new();
    for config in configs {
        if let Some(envs) = config.get_object("environments") {
            for name in envs.keys() {
                if !names.contains(name) {
                    names.push(name.clone());
                }
            }
        }
    }
    names
}

/// Adds config values for keys not set on the command line, so `-i` and `-h`
/// values take precedence over config files.
fn fill_missing(target: &mut Object, values: &Object) {
    for (key, value) in values.iter() {
        if !target.contains_key(key) {
            target.insert(key.clone(), value.clone());
        }
    }
}

fn apply_config_to_args(args: &Object, config: &Object) -> Object {
    let mut enriched = args.clone();

    let mut secrets = Object::new();
    let secrets_path = [args.get("secrets"), config.get("secrets")]
        .into_iter()
        .flatten()
        .find(|v| v.is_truthy());
    if let Some(path) = secrets_path {
        secrets = load_secrets_file(&path.to_js_string());
    }

    for (key, value) in config.iter() {
        match key.as_str() {
            "secrets" => {}
            "inputVariables" => {
                let mut all = value.as_object().cloned().unwrap_or_default();
                all.assign(&secrets);
                fill_missing(enriched.object_entry("inputVariables"), &all);
                logger::debug(format!(
                    "Applied {} input variables from config ({} from secrets)",
                    all.len(),
                    secrets.len()
                ));
            }
            "headers" if value.as_object().is_some() => {
                let headers = value.as_object().unwrap();
                fill_missing(enriched.object_entry("headers"), headers);
                logger::debug(format!("Applied {} headers from config", headers.len()));
            }
            "headers" => {
                if !enriched.contains_key(key) {
                    enriched.insert(key.clone(), value.clone());
                }
            }
            _ => match enriched.get(key) {
                None => {
                    logger::debug(format!(
                        "Applying config value: {key} = {}",
                        value.to_js_string()
                    ));
                    enriched.insert(key.clone(), value.clone());
                }
                Some(Value::Bool(false)) => {
                    logger::debug(format!(
                        "Applying config value for boolean flag: {key} = {}",
                        value.to_js_string()
                    ));
                    enriched.insert(key.clone(), value.clone());
                }
                Some(_) => {
                    logger::debug(format!(
                        "CLI argument {key} provided, skipping config value"
                    ));
                }
            },
        }
    }

    if !secrets.is_empty() && !config.is_truthy("inputVariables") {
        fill_missing(enriched.object_entry("inputVariables"), &secrets);
        logger::debug(format!(
            "Applied {} variables from secrets file",
            secrets.len()
        ));
    }

    enriched
}

/// Applies the config files (defaults, plus the environment selected with
/// `-e`) to the arguments.
pub fn load_and_apply_config(args: Object) -> Object {
    let configs = find_config_files();
    if configs.is_empty() {
        logger::debug("No jsonr-config.json files found");
        return args;
    }
    logger::debug(format!("Found {} config file(s)", configs.len()));

    let environment = args
        .get("environment")
        .filter(|v| v.is_truthy())
        .map(Value::to_js_string)
        .filter(|env| !env.ends_with(".json"));

    let Some(env_name) = environment else {
        logger::debug("Using default configuration (no environment specified)");
        let defaults = merge_default_configs(&configs);
        logger::debug("Merged default config:");
        logger::debug_value(&Value::Object(defaults.clone()));
        return apply_config_to_args(&args, &defaults);
    };

    logger::debug(format!(
        "Looking for environment '{env_name}' in config files"
    ));
    let Some(env_config) = merge_environment_configs(&configs, &env_name) else {
        logger::error(format!(
            "ERROR: Environment '{env_name}' not found in any jsonr-config.json files."
        ));
        let available = collect_environment_names(&configs);
        if available.is_empty() {
            logger::error("No environments are defined in any jsonr-config.json files.");
        } else {
            logger::error(format!("Available environments: {}", available.join(", ")));
        }
        logger::error("Run 'jsonr --help' for details on configuration files.");
        std::process::exit(1);
    };

    logger::debug(format!("Found environment '{env_name}' configuration"));
    logger::debug_value(&Value::Object(env_config.clone()));

    let defaults = merge_default_configs(&configs);
    logger::debug("Merged default config:");
    logger::debug_value(&Value::Object(defaults.clone()));

    let mut merged = defaults.clone();
    merged.assign(&env_config);
    for key in ["inputVariables", "headers"] {
        if defaults.is_truthy(key) || env_config.is_truthy(key) {
            let mut combined = defaults.get_object(key).cloned().unwrap_or_default();
            if let Some(env_values) = env_config.get_object(key) {
                combined.assign(env_values);
            }
            merged.insert(key, Value::Object(combined));
        }
    }
    logger::debug("Final merged config (defaults + environment):");
    logger::debug_value(&Value::Object(merged.clone()));

    apply_config_to_args(&args, &merged)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn strips_comments_and_trailing_commas() {
        let content =
            "{\n  // comment\n  # another\n  \"a\": [1, 2,],\n  \"b\": \"x // not a comment\",\n}";
        let cleaned = remove_trailing_commas(&strip_json_comments(content));
        let value = json::parse(&cleaned).unwrap();
        assert_eq!(
            json::stringify(&value),
            r#"{"a":[1,2],"b":"x // not a comment"}"#
        );
    }
}
