import { deps } from "./deps.js";

class BrightConsoleHandler extends deps.logging.BaseHandler {
  format(logRecord) {
    let msg = super.format(logRecord);

    switch (logRecord.level) {
      case deps.logging.LogLevels.INFO:
        msg = deps.colors.brightBlue(msg);
        break;
      case deps.logging.LogLevels.WARNING:
        msg = deps.colors.brightYellow(msg);
        break;
      case deps.logging.LogLevels.ERROR:
        msg = deps.colors.brightRed(msg);
        break;
      case deps.logging.LogLevels.CRITICAL:
        msg = deps.colors.bold(brightRed(msg));
        break;
      default:
        break;
    }

    return msg;
  }

  log(msg) {
    deps.console.log(msg);
  }
}

const logLevel = deps.Deno.args.includes("--debug") ? "DEBUG" : "INFO";

await deps.logging.log.setup({
  handlers: {
    console: new BrightConsoleHandler("DEBUG", {
      formatter: "{msg}",
    }),
  },
  loggers: {
    default: {
      level: logLevel,
      handlers: ["console"],
    },
  },
});

const logger = deps.logging.log.getLogger();

export default logger;
