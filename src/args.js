import { parse } from "./deps.js";

const args = parse(Deno.args, {
  boolean: ["help", "debug"],
  "--": true,
});

export default args;
