import { parse } from "./deps.js";

const command = parse(Deno.args, {
  boolean: [ "help" ],
  "--": true
});

export default command;
