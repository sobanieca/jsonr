import { parse } from "./deps.js";

const args = parse(Deno.args, {
  boolean: ["help", "debug", "omit-default-content-type-header", "v"],
  string: ["i", "b", "h"],
  "--": true,
});

export default args;
