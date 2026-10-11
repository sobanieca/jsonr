# AGENTS.md

This file provides guidance to AI coding agents (Claude Code and others) when
working with code in this repository.

## Overview

`jsonr` is a CLI tool for interacting with JSON HTTP APIs and writing simple
smoke tests. It's written in Rust and distributed as a single binary. Keep the
dependency list minimal: the only crates are `ureq` (HTTP) and `rquickjs`
(JavaScript engine for `jsonr run`). JSON handling, argument parsing, colors
and value formatting are implemented in the crate itself.

## Development Commands

Development tasks are cargo aliases defined in `.cargo/config.toml` (backed by
the `xtask` crate):

```bash
cargo jsonr [args]        # Run jsonr from source
cargo verify              # fmt --check, clippy -D warnings and all tests
cargo test                # Run all tests
cargo update-snapshots    # Accept new CLI output in tests/snapshots
cargo api                 # Start the test API server on port 3000
```

`cargo verify` is the pre-commit check and is what CI runs.

## Architecture

### Entry Point and Command System

`src/main.rs`:

1. **Args parsing** (`src/args.rs`) - Port of `@std/cli` `parseArgs` used by the
   Deno version: unknown flags are accepted, aliases are stored under both
   names, kebab-case is normalized to camelCase and `-i`/`-h` values become
   objects. Arguments are a dynamic `json::Object` because config files can set
   any option.
2. **Config loading** (`src/config.rs`) - Searches for `jsonr-config.json` files
   from the current directory up to the home directory, merges them (closer to
   the current directory wins) and applies the environment selected with `-e`.
3. **Command dispatch** - help, version, update, run, config, skill, otherwise
   a request is sent (`src/request.rs`).

Errors returned by commands are logged and jsonr exits with code 1, as do
failed assertions (`-s`, `-t`), missing files and missing variables.

### Modules

- `src/request.rs` - Builds the request (URL, `.http` file or stdin), sends it
  with `ureq`, prints the response and runs assertions
- `src/http_file.rs` - `.http` parsing, `@@var@@`/`{{var}}` substitution and
  the `--js` body conversion
- `src/script.rs` + `src/script_prelude.js` - `jsonr run`: executes scripts in
  QuickJS with a global `jsonr()`, `console` and `Headers`
- `src/inspect.rs` - Value formatting identical to `Deno.inspect` (port of
  Deno's console formatter)
- `src/json.rs` - JSON parse/stringify with JavaScript semantics
- `src/update.rs` - `jsonr update` (self-update from GitHub releases) and the
  daily check for new versions
- `src/commands/` - help, run, config and skill commands
- `src/help.txt`, `src/templates/` - help text and generated file templates

## Testing

- Unit tests live next to the code (`#[cfg(test)]`).
- `tests/cli.rs` runs the compiled binary against a std-only test API
  (`tests/support/test_api.rs`, port 3000) and compares output with
  `tests/snapshots/*.snap`. Fixtures are in `tests/fixtures/`.
- `tests/fixtures/inspect-cases.json` holds `Deno.inspect` reference output
  that `src/inspect.rs` must reproduce.

## Logging

`src/logger.rs`:

- Debug logs only appear when `--debug` flag is used
- Secrets from secrets files are automatically masked in logs
- Color output can be disabled with `NO_COLOR=1` environment variable

## Landing Page

The landing page lives in `docs/index.html`. Every time you introduce a new
feature or change existing behavior, update the landing page as well, so it
always reflects the current feature set.

## Publishing

Every push to `main` builds binaries for Linux (musl, static) and macOS
(x64/arm64) and publishes them as GitHub release `v<version>` (version from
`Cargo.toml`). `install.sh` and `jsonr update` download these release assets,
so their names (`jsonr-linux-x64`, ...) must not change.
