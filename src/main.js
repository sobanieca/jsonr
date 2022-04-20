import args from "./args.js";
import logger from "./logger.js";
import help from "./commands/help.js";
import listEnvironments from "./commands/environments-list.js";
import createEnvironment from "./commands/environments-create.js";
import deleteEnvironment from "./commands/environments-delete.js";
import sendRequest from "./commands/send-request.js";

const commands = [
  { name: "help", engine: help },
  { name: "environments-list", engine: listEnvironments },
  { name: "environments-create", engine: createEnvironment },
  { name: "environments-delete", engine: deleteEnvironment },
  { name: "send-request", engine: sendRequest },
];

logger.debug("Args provided:");
logger.debug(args);

for (const command of commands) {
  logger.debug(`Trying to match with command ${command.name}`);
  if (command.engine.match(args)) {
    logger.debug(`Match found for command ${command.name}. Executing...`);

    try {
      await command.engine.execute(args);
    } catch (err) {
      logger.error(err.message);
      logger.debug(err);
    }

    Deno.exit(0);
  } else {
    logger.debug("No match found");
  }
}
