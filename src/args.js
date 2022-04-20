import { parse } from "./deps.js";

const args = parse(Deno.args, {
  boolean: ["help", "debug"],
  string: ["i"],
  "--": true,
});

export default args;
