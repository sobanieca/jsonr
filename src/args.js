import { parse } from "./deps.js";

const args = parse(Deno.args, {
  boolean: ["help", "debug", "omit-default-content-type-header"],
  string: ["i"],
  "--": true,
});

export default args;
