//! Development tasks, run through the cargo aliases in `.cargo/config.toml`:
//!
//! - `cargo verify`: formatting, lints and tests (run before committing)
//! - `cargo update-snapshots`: accept new CLI test output
//! - `cargo api`: start the test API on port 3000

#[path = "../../tests/support/test_api.rs"]
mod test_api;

use std::process::{Command, ExitCode};

fn is_package_variable_of_xtask(name: &str) -> bool {
    name.starts_with("CARGO_PKG_")
        || name.starts_with("CARGO_MANIFEST_")
        || matches!(
            name,
            "CARGO_CRATE_NAME" | "CARGO_BIN_NAME" | "CARGO_PRIMARY_PACKAGE"
        )
}

fn cargo(args: &[&str], env: &[(&str, &str)]) -> bool {
    println!("> cargo {}", args.join(" "));
    let cargo = std::env::var("CARGO").unwrap_or_else(|_| "cargo".to_string());
    let mut command = Command::new(cargo);
    for (name, _) in std::env::vars_os() {
        if name.to_str().is_some_and(is_package_variable_of_xtask) {
            command.env_remove(name);
        }
    }
    command
        .args(args)
        .envs(env.iter().copied())
        .status()
        .is_ok_and(|status| status.success())
}

fn main() -> ExitCode {
    let task = std::env::args().nth(1).unwrap_or_default();
    let ok = match task.as_str() {
        "verify" => {
            cargo(&["fmt", "--all", "--check"], &[])
                && cargo(
                    &[
                        "clippy",
                        "--workspace",
                        "--all-targets",
                        "--",
                        "-D",
                        "warnings",
                    ],
                    &[],
                )
                && cargo(&["test", "--workspace"], &[])
        }
        "update-snapshots" => cargo(&["test", "--test", "cli"], &[("UPDATE_SNAPSHOTS", "1")]),
        "api" => {
            let listener = match test_api::bind() {
                Ok(listener) => listener,
                Err(err) => {
                    eprintln!("Failed to listen on port {}: {err}", test_api::PORT);
                    return ExitCode::FAILURE;
                }
            };
            println!("Listening on port {}...", test_api::PORT);
            test_api::serve(listener);
            true
        }
        _ => {
            eprintln!("Usage: cargo xtask <verify|update-snapshots|api>");
            false
        }
    };
    if ok {
        ExitCode::SUCCESS
    } else {
        ExitCode::FAILURE
    }
}
