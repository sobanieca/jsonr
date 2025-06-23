import { deps } from "./deps.js";

class BrightConsoleHandler extends deps.logging.BaseHandler {
  /**
   * @override
   */
  format(logRecord) {
    let msg = super.format(logRecord);

    switch (logRecord.level) {
      case deps.logging.LogLevels.INFO:
        msg = deps.colors.brightBlue(msg);
        break;
      case deps.logging.LogLevels.WARN:
        msg = deps.colors.brightYellow(msg);
        break;
      case deps.logging.LogLevels.ERROR:
        msg = deps.colors.brightRed(msg);
        break;
      case deps.logging.LogLevels.CRITICAL:
        msg = deps.colors.bold(deps.colors.brightRed(msg));
        break;
      default:
        break;
    }

    return msg;
  }

  log(msg) {
    console.log(msg);
  }
}

const logLevel = Deno.args.includes("--debug") ? "DEBUG" : "INFO";

deps.logging.log.setup({
  handlers: {
    console: new BrightConsoleHandler("DEBUG", {
      formatter: (logRecord) => logRecord.msg,
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
