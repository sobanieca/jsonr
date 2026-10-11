use super::{help, is_command};
use crate::config::home_dir;
use crate::json::Object;
use crate::logger;
use std::path::{Path, PathBuf};

const SKILL_NAME: &str = "jsonr";
const SKILL_CONTENT: &str = include_str!("../templates/SKILL.md");
const AGENT_INSTRUCTIONS: &str = include_str!("../templates/agent-instructions.txt");
const SKILL_TARGETS: &[(&str, &str)] = &[
    (".agents/skills", "Codex, Cursor"),
    (".claude/skills", "Claude Code, Cursor"),
];

pub fn matches(args: &Object) -> bool {
    is_command(args, "skill")
}

pub fn execute(args: &Object) -> Result<(), String> {
    if args.is_truthy("init") {
        return create_skill();
    }
    logger::print_line(AGENT_INSTRUCTIONS);
    help::execute();
    Ok(())
}

struct SkillRoot {
    dir: PathBuf,
    reason: &'static str,
    global: bool,
}

/// Inside a git repository (searched from cwd up to the home directory): the
/// git root. Outside a repository: the home directory, where Claude Code,
/// Codex, Cursor and other agents read user-level skills.
fn find_skill_root() -> SkillRoot {
    let home = home_dir().map(PathBuf::from);
    let start = std::env::current_dir().unwrap_or_default();
    let mut dir = start.as_path();
    loop {
        if dir.join(".git").exists() {
            return SkillRoot {
                dir: dir.to_path_buf(),
                reason: "git root",
                global: false,
            };
        }
        let Some(parent) = dir.parent() else { break };
        if Some(dir) == home.as_deref() {
            break;
        }
        dir = parent;
    }
    let Some(home) = home else {
        logger::error(
            "ERROR: Not in a git repository and the home directory is unknown (set HOME).",
        );
        std::process::exit(1);
    };
    SkillRoot {
        dir: home,
        reason: "not in a git repository",
        global: true,
    }
}

fn create_skill() -> Result<(), String> {
    let root = find_skill_root();
    let files: Vec<(PathBuf, &str)> = SKILL_TARGETS
        .iter()
        .map(|(dir, read_by)| (Path::new(dir).join(SKILL_NAME).join("SKILL.md"), *read_by))
        .collect();

    for (path, _) in &files {
        let skill_file = root.dir.join(path);
        if skill_file.exists() {
            logger::error(format!(
                "ERROR: {} already exists. Delete it first if you want to regenerate it.",
                skill_file.display()
            ));
            std::process::exit(1);
        }
    }

    for (path, _) in &files {
        let skill_file = root.dir.join(path);
        if let Some(parent) = skill_file.parent() {
            std::fs::create_dir_all(parent).map_err(|err| err.to_string())?;
        }
        std::fs::write(&skill_file, SKILL_CONTENT).map_err(|err| err.to_string())?;
    }

    if root.global {
        logger::info(format!(
            "Not in a git repository - installing for all projects in {}",
            root.dir.display()
        ));
    } else {
        logger::info(format!(
            "Project root: {} ({})",
            root.dir.display(),
            root.reason
        ));
    }
    for (path, read_by) in &files {
        logger::info(format!("Created {}  ({read_by})", path.display()));
    }
    logger::info("");
    logger::info("Try: /jsonr send the create-user request against prod");
    Ok(())
}
