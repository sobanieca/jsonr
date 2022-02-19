import { parse } from "./deps.js";

const command = parse(Deno.args, {
  boolean: [ "help" ]
});

export default command;
