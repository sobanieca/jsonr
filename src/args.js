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
    "dry",
    "ignore-input-validation",
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
    "header",
  ],
  alias: {
    v: "verbose",
    r: "raw",
    f: "follow-redirects",
    i: "input-variable",
    b: "body",
    h: "header",
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

const parseKeyValueArray = (arr) => {
  const result = {};
  if (!arr) return result;

  const items = Array.isArray(arr) ? arr : Object.values(arr);

  for (const item of items) {
    if (typeof item !== "string") continue;

    const colonIndex = item.indexOf(":");
    if (colonIndex === -1) continue;

    const key = item.substring(0, colonIndex).trim();
    const value = item.substring(colonIndex + 1).trim();
    result[key] = value;
  }

  return result;
};

const keyValueFields = {
  "input-variable": "inputVariables",
  "i": "inputVariables",
  "header": "headers",
  "h": "headers",
};

const normalizeArgs = (args) => {
  const normalized = {};

  for (const [key, value] of Object.entries(args)) {
    const targetName = keyValueFields[key];
    const shouldNormalize = key.includes("-") || targetName;

    if (shouldNormalize) {
      const mappedKey = targetName || kebabToCamel(key);

      if (targetName) {
        if (!normalized[mappedKey]) {
          normalized[mappedKey] = {};
        }
        Object.assign(normalized[mappedKey], parseKeyValueArray(value));
      } else {
        normalized[mappedKey] = value;
      }
    } else {
      normalized[key] = value;
    }
  }

  return normalized;
};

const args = normalizeArgs(rawArgs);

export default args;
