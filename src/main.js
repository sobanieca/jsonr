import args from "./args.js";
import logger from "./logger.js";
import help from "./commands/help.js";
import listEnvironments from "./commands/list-environments.js";
import createEnvironment from "./commands/create-environment.js";
import deleteEnvironment from "./commands/delete-environment.js";
import sendRequest from "./commands/send-request.js";

const commands = [
  { name: "help", engine: help },
  { name: "list-environments", engine: listEnvironments },
  { name: "create-environment", engine: createEnvironment },
  { name: "delete-environment", engine: deleteEnvironment },
  { name: "send-request", engine: sendRequest }
]

logger.debug("Args provided:");
logger.debug(args);

for(const command of commands) {
  logger.debug(`Trying to match with command ${command.name}`);
  if(command.engine.match(args)) {
    logger.debug(`Match found for command ${command.name}. Executing...`);
    await command.engine.execute(args);
    Deno.exit(0);
  }
}

