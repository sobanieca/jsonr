import command from "./command.js";
import logger from "./logger.js";
import help from "./commands/help.js";

if (command.help) {
  help();
  Deno.exit(0);
}

// TODO: environments commands

console.log(command);

logger.info("Test");

