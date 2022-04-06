import args from "./args.js";
import logger from "./logger.js";
import help from "./commands/help.js";
import listEnvironments from "./commands/list-environments.js";
import createEnvironment from "./commands/create-environment.js";
import deleteEnvironment from "./commands/delete-environment.js";
import sendRequest from "./commands/send-request.js";

const commands = [
  help,
  listEnvironments,
  createEnvironment,
  deleteEnvironment,
  sendRequest
]

// TODO: introduce more debug logs, including commands match etc.
logger.debug("Obtained following list or args:");
logger.debug(args);

for(const command of commands) {
  if(command.match(args)) {
    await command.execute(args);
    Deno.exit(0);
  }
}

