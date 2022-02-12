import parse from "./parser.js";

let jsonr = parse(Deno.args);

console.log(jsonr);

