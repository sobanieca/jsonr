/* @ts-self-types="./main.d.ts" */
import args from "./src/args.js";
import logger from "./src/logger.js";
import help from "./src/commands/help.js";
import version from "./src/commands/version.js";
import init from "./src/commands/init.js";
import update from "./src/commands/update.js";
import sendRequest from "./src/commands/send-request.js";

const commands = [
  { name: "help", engine: help },
  { name: "version", engine: version },
  { name: "init", engine: init },
  { name: "update", engine: update },
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
      logger.error(err instanceof Error ? err.message : String(err));
      logger.debug(err);
    }

    Deno.exit(0);
  } else {
    logger.debug("No match found");
  }
}
