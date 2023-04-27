import { parse, runtime } from "./deps.js";

const args = parse(runtime.Deno.args, {
  boolean: ["help", "debug", "omit-default-content-type-header", "v", "r"],
  string: ["i", "b", "h"],
  "--": true,
});

export default args;
