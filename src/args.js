import { deps } from "./deps.js";

const args = deps.parse(Deno.args, {
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
    "input",
    "headers",
  ],
  alias: {
    v: "verbose",
    r: "raw",
    f: "follow-redirects",
    i: "input",
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

export default args;
