//! End-to-end tests: run the `jsonr` binary against a local test API and
//! compare the output with snapshots in `tests/snapshots`.

mod support;

use support::{
    TempDir, assert_snapshot, external_binary, format_output, run, snapshot, start_server,
};

macro_rules! snapshot_test {
    ($name:ident, $command:expr) => {
        snapshot_test!($name, $command, "");
    };
    ($name:ident, $command:expr, $cwd:expr) => {
        #[test]
        fn $name() {
            snapshot(stringify!($name), $command, $cwd);
        }
    };
}

const API1: &str = "requests/api1";
const API2: &str = "requests/api2";

snapshot_test!(get_http_file, "jsonr -e test get.http", API2);
snapshot_test!(post_http_file, "jsonr -e test post.http", API2);
snapshot_test!(delete_http_file, "jsonr -e test delete.http", API2);
snapshot_test!(put_http_file, "jsonr -e test put.http", API2);
snapshot_test!(server_exception, "jsonr -e test exception.http", API2);
snapshot_test!(
    status_assertion_401,
    "jsonr -e test get-auth-401.http -s 401",
    API1
);
snapshot_test!(secret_from_environment, "jsonr -e test get-auth.http", API1);
snapshot_test!(
    method_and_body_flags,
    "jsonr -m PUT -b '{\"name\":\"test\"}' localhost:3000/sample"
);
snapshot_test!(url_argument, "jsonr http://localhost:3000/sample");
snapshot_test!(
    status_assertion_fails,
    "jsonr -e test put.http -s 303",
    API2
);
snapshot_test!(
    status_assertion_passes,
    "jsonr -e test put.http -s 200",
    API2
);
snapshot_test!(text_assertion_fails, "jsonr -e test get.http -t test", API2);
snapshot_test!(
    verbose_with_header_and_secrets,
    "jsonr -e test -h 'X-SampleHeader: abc' -v get-auth.http",
    API1
);
snapshot_test!(
    verbose_with_header,
    "jsonr -e test -h 'X-SampleHeader: abc' -v get.http",
    API2
);
snapshot_test!(
    text_assertion_passes,
    "jsonr -e test get.http -t sample-get",
    API2
);
snapshot_test!(
    redirect_not_followed,
    "jsonr http://localhost:3000/redirect"
);
snapshot_test!(redirect_followed, "jsonr http://localhost:3000/redirect -f");
snapshot_test!(js_body_from_file, "jsonr -e test --js post-js.http", API2);
snapshot_test!(
    js_body_flag,
    "jsonr --js -m POST -b '{ name: \"test\", count: 8 }' localhost:3000/sample"
);
snapshot_test!(
    js_body_single_quotes,
    "jsonr --js -m PUT -b \"{ name: 'test' }\" localhost:3000/sample"
);
snapshot_test!(dry_run, "jsonr -e test get.http --dry", API2);
snapshot_test!(missing_http_file, "jsonr nonexistent.http");
snapshot_test!(help, "jsonr help");
snapshot_test!(skill, "jsonr skill");
snapshot_test!(
    unknown_environment,
    "jsonr -e nonExistentEnv get.http",
    API2
);
snapshot_test!(config_display, "jsonr config", API1);
snapshot_test!(missing_variables, "jsonr get-missing-vars.http", API2);
snapshot_test!(
    missing_variables_partially_provided,
    "jsonr get-missing-vars.http -i 'query: test'",
    API2
);
snapshot_test!(
    missing_variables_ignored,
    "jsonr get-missing-vars.http --ignore-input-validation",
    API2
);
snapshot_test!(run_script, "jsonr run jsonr-script.js", "requests");
snapshot_test!(
    run_script_verbose,
    "jsonr run jsonr-script.js -v",
    "requests"
);
snapshot_test!(
    run_script_with_environment,
    "jsonr run jsonr-script.js -e test -v",
    API1
);
snapshot_test!(
    run_script_with_url_variable,
    "jsonr run jsonr-script-with-url-var.js -e test",
    API1
);
snapshot_test!(
    script_without_run_command,
    "jsonr jsonr-script.js -e test",
    API1
);
snapshot_test!(
    run_script_with_object_body,
    "jsonr run jsonr-script-with-object-body.js",
    API1
);
snapshot_test!(verbose_with_secrets, "jsonr -e test -v get-auth.http", API1);
snapshot_test!(
    run_script_merges_input_variables,
    "jsonr run jsonr-script-merge-input-vars.js -e test",
    API1
);
snapshot_test!(
    run_script_merges_headers,
    "jsonr run jsonr-script-merge-headers.js -e test -v",
    API1
);
snapshot_test!(
    run_script_environment_option,
    "jsonr run jsonr-script-env-option.js -v",
    API1
);
snapshot_test!(
    cli_values_override_config,
    "jsonr -e test get-user.http -i 'baseUrl: http://cli.example' -i 'userId: 1' -i 'tenant: cli-tenant' -h 'traceId: from-cli' -h 'x-env-header: from-cli' --dry",
    API1
);
snapshot_test!(
    config_values_used_when_not_on_cli,
    "jsonr -e test get-user.http -i 'userId: 1' --dry",
    API1
);
snapshot_test!(
    run_script_environment_overrides_cli_environment,
    "jsonr run jsonr-script-env-overrides-cli.js -e staging",
    API1
);
snapshot_test!(
    run_script_console,
    "jsonr run jsonr-script-console.js",
    API1
);
snapshot_test!(
    handlebars_variables,
    "jsonr -e test get-handlebars.http",
    API2
);
snapshot_test!(
    handlebars_variables_with_spaces,
    "jsonr -e test get-handlebars-spaces.http",
    API2
);
snapshot_test!(
    handlebars_variables_in_body,
    "jsonr -e test post-handlebars.http",
    API2
);
snapshot_test!(
    missing_handlebars_variables,
    "jsonr get-missing-vars-handlebars.http",
    API2
);
snapshot_test!(
    missing_handlebars_variables_partially_provided,
    "jsonr get-missing-vars-handlebars.http -i 'query: test'",
    API2
);
snapshot_test!(
    comment_on_first_line,
    "jsonr -e test get-comment-first-line.http",
    API2
);
snapshot_test!(request_from_stdin, "cat get.http | jsonr -e test", API2);

#[test]
fn version() {
    if external_binary() {
        return;
    }
    for command in ["jsonr --version", "jsonr version"] {
        let output = run(command, &support::fixtures(), &[]);
        assert_eq!(output.stdout, format!("{}\n", env!("CARGO_PKG_VERSION")));
    }
}

#[test]
fn run_init_creates_script() {
    start_server();
    let dir = TempDir::new("run-init");
    let command = "jsonr run --init http://localhost:3000/sample && cat jsonr-script.js";
    let output = run(command, dir.path(), &[]);
    assert_snapshot("run_init_creates_script", &format_output(command, &output));
}

#[test]
fn output_file() {
    start_server();
    let dir = TempDir::new("output-file");
    let command = "jsonr http://localhost:3000/sample -o response.json && cat response.json";
    let output = run(command, dir.path(), &[]);
    assert_snapshot("output_file", &format_output(command, &output));
}

#[test]
fn config_init_creates_config() {
    let dir = TempDir::new("config-init");
    let command = "jsonr config --init && cat jsonr-config.json && jsonr config --init";
    let output = run(command, dir.path(), &[]);
    assert_snapshot(
        "config_init_creates_config",
        &format_output(command, &output),
    );
}

#[test]
fn script_error() {
    let dir = TempDir::new("script-error");
    std::fs::write(
        dir.path().join("failing.js"),
        "import { value } from './lib.js';\nconsole.log(value);\nthrow new Error('boom');\n",
    )
    .unwrap();
    std::fs::write(
        dir.path().join("lib.js"),
        "export const value = 'imported';\n",
    )
    .unwrap();
    let command = "jsonr run failing.js";
    let output = run(command, dir.path(), &[]);
    assert_snapshot("script_error", &format_output(command, &output));
}

#[test]
fn skill_init_in_git_repository() {
    let repo = TempDir::new("skill-repo");
    let root = repo.path();
    std::fs::create_dir_all(root.join(".git")).unwrap();
    std::fs::create_dir_all(root.join("packages/app/src")).unwrap();
    std::fs::write(root.join("packages/app/AGENTS.md"), "# app\n").unwrap();

    let normalize = |s: String| s.replace(&root.display().to_string(), "<tmp>");
    let command = "jsonr skill --init";
    let output = run(command, &root.join("packages/app/src"), &[]);
    let skill = std::fs::read_to_string(root.join(".agents/skills/jsonr/SKILL.md")).unwrap();
    let claude_skill = std::fs::read_to_string(root.join(".claude/skills/jsonr/SKILL.md")).unwrap();
    assert_eq!(skill, claude_skill);
    assert!(!root.join("packages/app/.claude").exists());
    assert_snapshot(
        "skill_init_in_git_repository",
        &format!(
            "{}\n--- SKILL.md\n{skill}",
            normalize(format_output(command, &output))
        ),
    );

    let output = run(command, &root.join("packages"), &[]);
    assert_snapshot(
        "skill_init_refuses_to_overwrite",
        &normalize(format_output(command, &output)),
    );
}

#[test]
fn skill_init_outside_git_repository() {
    let dir = TempDir::new("skill-home");
    let root = dir.path();
    let home = root.join("home");
    std::fs::create_dir_all(root.join(".git")).unwrap();
    std::fs::create_dir_all(home.join("notes")).unwrap();

    let command = "jsonr skill --init";
    let output = run(
        command,
        &home.join("notes"),
        &[("HOME", &home.display().to_string())],
    );
    let skill = std::fs::read_to_string(home.join(".agents/skills/jsonr/SKILL.md")).unwrap();
    let claude_skill = std::fs::read_to_string(home.join(".claude/skills/jsonr/SKILL.md")).unwrap();
    assert_eq!(skill, claude_skill);
    assert!(!home.join("notes/.claude").exists());
    assert_snapshot(
        "skill_init_outside_git_repository",
        &format_output(command, &output).replace(&root.display().to_string(), "<tmp>"),
    );
}

#[test]
#[cfg(unix)]
fn update_replaces_binary() {
    if external_binary() {
        return;
    }
    start_server();
    let dir = TempDir::new("update");
    let binary = dir.path().join("jsonr");
    std::fs::copy(env!("CARGO_BIN_EXE_jsonr"), &binary).unwrap();

    let cache = dir.path().join("cache");
    let command = "jsonr update";
    let output = support::run_with_path(
        command,
        dir.path(),
        &[
            ("JSONR_RELEASES_URL", "http://localhost:3000/fake-releases"),
            ("XDG_CACHE_HOME", &cache.display().to_string()),
        ],
        dir.path(),
    );
    assert_snapshot("update_replaces_binary", &format_output(command, &output));

    let replaced = std::fs::read_to_string(&binary).unwrap();
    assert!(replaced.contains(support::test_api::FAKE_RELEASE_VERSION));
    let leftovers: Vec<_> = std::fs::read_dir(dir.path())
        .unwrap()
        .filter_map(Result::ok)
        .filter(|entry| {
            entry
                .file_name()
                .to_string_lossy()
                .starts_with(".jsonr-update")
        })
        .collect();
    assert!(leftovers.is_empty());
    let cached = std::fs::read_to_string(cache.join("jsonr/latest-version")).unwrap();
    assert!(cached.ends_with("\n99.0.0\n"), "{cached}");
}

#[test]
fn request_error_exits_with_failure() {
    // Nothing listens on port 1, so the connection is refused.
    let output = run("jsonr http://127.0.0.1:1/", &support::fixtures(), &[]);
    assert_eq!(output.code, 1, "{}", output.stdout);
    assert!(
        output
            .stdout
            .contains("error sending request for url (http://127.0.0.1:1/)"),
        "{}",
        output.stdout
    );
}
