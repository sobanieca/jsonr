import { parse } from "./deps.js";

const args = parse(Deno.args, {
  boolean: [ "help" ],
  "--": true
});

export default args;
