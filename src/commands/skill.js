import logger from "../logger.js";
import { deps } from "../deps.js";
import help from "./help.js";

const SKILL_NAME = "jsonr";
const AGENT_FILES = ["AGENTS.md", "agents.md", "CLAUDE.md", "claude.md"];
const SKILL_TARGETS = [
  { dir: ".agents/skills", readBy: "Codex, Cursor" },
  { dir: ".claude/skills", readBy: "Claude Code, Cursor" },
];

const skillContent = `---
name: ${SKILL_NAME}
description: Send HTTP requests to JSON APIs and run API smoke tests with the jsonr CLI. Use when asked to call an endpoint, test an API, send a request from a .http file, or chain requests in a script.
---

# jsonr

\`jsonr\` sends HTTP requests from \`.http\` files or straight from the command
line. API keys and tokens come from the user's config and secrets files and are
masked in all output. Never ask for them and never put them in a command.

## Workflow

1. Run \`jsonr skill\` once to read the full reference (commands, flags, config
   and \`.http\` file format).
2. Look for \`.http\` files and \`jsonr-config.json\` in the repository. Run
   \`jsonr config\` to see the environments that are available.
3. Prefer \`.http\` files: \`jsonr path/to/request.http -e <environment>\`. For
   one-off calls use \`jsonr -m POST -b '{"key": "value"}' <url>\`.
4. Provide variables with \`-i "name: value"\`. A missing variable stops the
   request and lists what is needed.
5. For smoke tests assert with \`-s <status>\` and \`-t <text>\`. A non-zero
   exit code means the assertion failed.
6. Use \`--dry\` to print the request without sending it when unsure.
7. To chain requests, \`jsonr run --init\` creates a script template. Run it
   with \`jsonr run script.js\`.

## Rules

- Do not pass secrets on the command line. Use an environment (\`-e\`) that
  references a secrets file.
- Save large responses with \`-o response.json\` instead of printing them.
- Ask before sending requests that change data on production environments.
`;

const agentInstructions = `
jsonr - instructions for AI agents

  Run 'jsonr skill --init' to create a project skill so you can invoke it
  with /jsonr (Claude Code, Cursor) or $jsonr (Codex).

  Secrets (API keys, tokens) are resolved by jsonr from config and secrets
  files and are masked in output. Never ask for them and never put them
  into commands. Use '-e <environment>' instead.

  Full reference follows.
`;

const exists = (path) => {
  try {
    Deno.statSync(path);
    return true;
  } catch {
    return false;
  }
};

const hasAgentMarker = (dir) =>
  AGENT_FILES.some((file) => exists(deps.join(dir, file))) ||
  SKILL_TARGETS.some((target) => exists(deps.join(dir, target.dir)));

/**
 * Nearest directory (from cwd up) that holds AGENTS.md, CLAUDE.md or an
 * existing skills folder. Stops at the git root, otherwise falls back to cwd.
 */
export const findSkillRoot = (start = Deno.cwd()) => {
  const home = Deno.env.get("HOME") || Deno.env.get("USERPROFILE") || "";
  let dir = start;
  while (true) {
    if (hasAgentMarker(dir)) return { dir, reason: "agent instructions" };
    if (exists(deps.join(dir, ".git"))) return { dir, reason: "git root" };
    const parent = deps.dirname(dir);
    if (dir === home || parent === dir) {
      return { dir: start, reason: "current directory" };
    }
    dir = parent;
  }
};

const createSkill = async () => {
  const root = findSkillRoot();
  const created = [];

  for (const target of SKILL_TARGETS) {
    const skillDir = deps.join(root.dir, target.dir, SKILL_NAME);
    const skillFile = deps.join(skillDir, "SKILL.md");
    if (exists(skillFile)) {
      logger.error(
        `ERROR: ${skillFile} already exists. Delete it first if you want to regenerate it.`,
      );
      Deno.exit(1);
    }
    await Deno.mkdir(skillDir, { recursive: true });
    await Deno.writeTextFile(skillFile, skillContent);
    created.push({
      path: deps.join(target.dir, SKILL_NAME, "SKILL.md"),
      target,
    });
  }

  logger.info(`Project root: ${root.dir} (${root.reason})`);
  for (const { path, target } of created) {
    logger.info(`Created ${path}  (${target.readBy})`);
  }
  logger.info("");
  logger.info("Try: /jsonr send the create-user request against prod");
};

export default {
  execute: async (args) => {
    if (args.init) {
      await createSkill();
      return;
    }
    console.log(agentInstructions);
    help.execute();
  },
  match: (args) => args._[0] === "skill",
};
