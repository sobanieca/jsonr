import { deps } from "./deps.js";

const rawArgs = deps.parse(Deno.args, {
  boolean: [
    "help",
    "debug",
    "init",
    "omit-default-content-type-header",
    "verbose",
    "raw",
    "follow-redirects",
    "js",
  ],
  string: [
    "body",
    "environment",
    "secrets",
    "status",
    "text",
    "method",
    "output",
  ],
  collect: [
    "input-variable",
    "headers",
  ],
  alias: {
    v: "verbose",
    r: "raw",
    f: "follow-redirects",
    i: "input-variable",
    b: "body",
    h: "headers",
    e: "environment",
    s: "status",
    t: "text",
    m: "method",
    o: "output",
  },
  "--": true,
});

const kebabToCamel = (str) => {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
};

const normalizeArgs = (args) => {
  const specialMappings = {
    "input-variable": "inputVariables",
  };

  const normalized = {};

  for (const [key, value] of Object.entries(args)) {
    if (key.includes("-")) {
      const mappedKey = specialMappings[key] || kebabToCamel(key);
      normalized[mappedKey] = value;
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
};

const args = normalizeArgs(rawArgs);

export default args;
