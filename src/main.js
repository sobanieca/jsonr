import command from "./command.js";
import logger from "./logger.js";
import help from "./commands/help.js";

if (command.help) {
   help();
}

// TODO: environments commands

console.log(command);

logger.info("Test");

