import { parse } from "./deps.js";
import logger from "./logger.js";
import help from "./help.js";

const parsedArgs = parse(Deno.args);

if (parsedArgs.help) {
   help();
}

console.log(parsedArgs);

logger.info("Test");

