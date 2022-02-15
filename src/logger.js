import { log } from "./deps.js";

const logLevel = Deno.args.includes("-v") ? "DEBUG" : "WARNING"

await log.setup({
  handlers: {
    console: new log.handlers.ConsoleHandler("DEBUG")
  },
  loggers: {
    default: {
      level: logLevel,
      handlers: [ console ]
    }
  }
});

const logger = log.getLogger();

export { logger };

