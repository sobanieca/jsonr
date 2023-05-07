import { deps } from "./deps.js";

const args = deps.parse(deps.Deno.args, {
  boolean: ["help", "debug", "omit-default-content-type-header", "v", "r"],
  string: ["i", "b", "h"],
  "--": true,
});

export default args;
