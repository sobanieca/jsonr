/* @ts-self-types="./main.d.ts" */
import args from "./src/args.js";
import logger from "./src/logger.js";
import config from "./src/config.js";
import help from "./src/commands/help.js";
import version from "./src/commands/version.js";
import update from "./src/commands/update.js";
import run from "./src/commands/run.js";
import configCommand from "./src/commands/config.js";
import sendRequest from "./src/commands/send-request.js";

const commands = [
  { name: "help", engine: help },
  { name: "version", engine: version },
  { name: "update", engine: update },
  { name: "run", engine: run },
  { name: "config", engine: configCommand },
  { name: "send-request", engine: sendRequest },
];

logger.debug("Args provided:");
logger.debug(args);

const enrichedArgs = await config.loadAndApplyConfig(args);

logger.debug("Args after applying config:");
logger.debug(enrichedArgs);

for (const command of commands) {
  logger.debug(`Trying to match with command ${command.name}`);
  if (command.engine.match(enrichedArgs)) {
    logger.debug(`Match found for command ${command.name}. Executing...`);

    try {
      await command.engine.execute(enrichedArgs);
    } catch (err) {
      logger.error(err instanceof Error ? err.message : String(err));
      logger.debug(err);
    }

    Deno.exit(0);
  } else {
    logger.debug("No match found");
  }
}
