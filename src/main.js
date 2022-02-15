import parse from "./parser.js";
import logger from "./logger.js";
import help from "./help.js";

const command = parse(Deno.args);

if (command.help) {
   help();
}

logger.info("Test");

