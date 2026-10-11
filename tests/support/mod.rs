//! Snapshot test harness: runs `jsonr` through `sh -c` against the test API
//! and compares normalized output with files in `tests/snapshots`.
//!
//! `UPDATE_SNAPSHOTS=1` rewrites the snapshots. `JSONR_TEST_BIN_DIR` runs
//! the tests against another `jsonr` executable (e.g. a previous version).

#![allow(dead_code)]

pub mod test_api;

use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::Once;

pub fn start_server() {
    static SERVER: Once = Once::new();
    SERVER.call_once(|| {
        let listener = test_api::bind().expect("port 3000 must be free for the test API");
        std::thread::spawn(move || test_api::serve(listener));
    });
}

pub fn fixtures() -> PathBuf {
    Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures")
}

fn bin_dir() -> PathBuf {
    match std::env::var_os("JSONR_TEST_BIN_DIR") {
        Some(dir) => PathBuf::from(dir),
        None => Path::new(env!("CARGO_BIN_EXE_jsonr"))
            .parent()
            .expect("binary directory")
            .to_path_buf(),
    }
}

/// Whether tests run against an external `jsonr` (see module docs).
pub fn external_binary() -> bool {
    std::env::var_os("JSONR_TEST_BIN_DIR").is_some()
}

pub struct Output {
    pub code: i32,
    pub stdout: String,
    pub stderr: String,
}

/// Runs `command` with `jsonr` from `bin_dir` first on the PATH. The home
/// directory is the fixtures directory unless overridden in `env`.
pub fn run_with_path(command: &str, cwd: &Path, env: &[(&str, &str)], bin: &Path) -> Output {
    let path = format!(
        "{}:{}",
        bin.display(),
        std::env::var("PATH").unwrap_or_default()
    );
    let mut cmd = Command::new("sh");
    cmd.arg("-c")
        .arg(command)
        .current_dir(cwd)
        .env("PATH", path)
        .env("HOME", fixtures())
        .env("JSONR_NO_UPDATE_CHECK", "1")
        .env_remove("NO_COLOR")
        .env_remove("XDG_CACHE_HOME")
        .stdin(Stdio::null());
    for (key, value) in env {
        cmd.env(key, value);
    }
    let output = cmd.output().expect("failed to run sh");
    Output {
        code: output.status.code().unwrap_or(-1),
        stdout: String::from_utf8_lossy(&output.stdout).to_string(),
        stderr: String::from_utf8_lossy(&output.stderr).to_string(),
    }
}

pub fn run(command: &str, cwd: &Path, env: &[(&str, &str)]) -> Output {
    run_with_path(command, cwd, env, &bin_dir())
}

fn strip_ansi(s: &str) -> String {
    let mut out = String::with_capacity(s.len());
    let mut chars = s.chars().peekable();
    while let Some(c) = chars.next() {
        if c == '\x1b' && chars.peek() == Some(&'[') {
            chars.next();
            for next in chars.by_ref() {
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

/// Removes colors and values that change between runs.
pub fn normalize(s: &str) -> String {
    let s = strip_ansi(s);
    let mut out = String::with_capacity(s.len());
    for line in s.split_inclusive('\n') {
        let (content, ending) = match line.strip_suffix('\n') {
            Some(content) => (content, "\n"),
            None => (line, ""),
        };
        let content = if let Some(index) = content.find("obtained in ") {
            let rest = &content[index + "obtained in ".len()..];
            let digits = rest.chars().take_while(char::is_ascii_digit).count();
            if digits > 0 && rest[digits..].starts_with("ms") {
                format!(
                    "{}obtained in *ms{}",
                    &content[..index],
                    &rest[digits + 2..]
                )
            } else {
                content.to_string()
            }
        } else {
            content.to_string()
        };
        let content = ["date: ", "content-length: "]
            .iter()
            .fold(content, |content, prefix| {
                let found = content.match_indices(prefix).find(|(index, _)| {
                    !content[..*index]
                        .chars()
                        .next_back()
                        .is_some_and(|c| c.is_ascii_alphanumeric() || c == '-')
                });
                match found {
                    Some((index, _)) => format!("{}{prefix}*", &content[..index]),
                    None => content,
                }
            });
        out.push_str(&content);
        out.push_str(ending);
    }
    out
}

pub fn assert_snapshot(name: &str, actual: &str) {
    let path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("tests/snapshots")
        .join(format!("{name}.snap"));
    if std::env::var_os("UPDATE_SNAPSHOTS").is_some() {
        std::fs::write(&path, actual).expect("failed to write snapshot");
        return;
    }
    let expected = std::fs::read_to_string(&path).unwrap_or_else(|_| {
        panic!(
            "missing snapshot {}, run `cargo update-snapshots`\n\n{actual}",
            path.display()
        )
    });
    if expected != actual {
        panic!(
            "snapshot {name} does not match (run `cargo update-snapshots` to accept)\n--- expected\n{expected}\n--- actual\n{actual}"
        );
    }
}

pub fn format_output(command: &str, output: &Output) -> String {
    format!(
        "$ {command}\nexit code: {}\n--- stdout\n{}--- stderr\n{}",
        output.code,
        normalize(&output.stdout),
        normalize(&output.stderr)
    )
}

/// Runs a command in a fixtures directory and compares with the snapshot.
pub fn snapshot(name: &str, command: &str, cwd: &str) {
    start_server();
    let dir = fixtures().join(cwd);
    let output = run(command, &dir, &[]);
    assert_snapshot(name, &format_output(command, &output));
}

/// A temporary directory removed on drop.
pub struct TempDir(pub PathBuf);

impl TempDir {
    pub fn new(name: &str) -> Self {
        let path = std::env::temp_dir().join(format!("jsonr-test-{name}-{}", std::process::id()));
        let _ = std::fs::remove_dir_all(&path);
        std::fs::create_dir_all(&path).expect("failed to create temp dir");
        TempDir(path.canonicalize().expect("temp dir path"))
    }

    pub fn path(&self) -> &Path {
        &self.0
    }
}

impl Drop for TempDir {
    fn drop(&mut self) {
        let _ = std::fs::remove_dir_all(&self.0);
    }
}
