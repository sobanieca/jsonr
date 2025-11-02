import { deps } from "./deps.js";

const args = deps.parse(Deno.args, {
  boolean: ["help", "debug", "omit-default-content-type-header", "verbose", "raw", "follow-redirects"],
  string: ["input", "body", "headers", "environment", "status", "text", "method", "output", "init"],
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
