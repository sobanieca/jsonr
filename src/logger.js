import * as log from "log/mod.ts";
import { LogLevels} from "log/mod.ts";
import { BaseHandler } from "log/handlers.ts?s=BaseHandler";
import { bold, brightRed, brightBlue, brightYellow } from "fmt/colors.ts";

class BrightConsoleHandler extends BaseHandler {
  format(logRecord) {

    let msg = super.format(logRecord);

    switch (logRecord.level) {
      case LogLevels.INFO:
        msg = brightBlue(msg);
        break;
      case LogLevels.WARNING:
        msg = brightYellow(msg);
        break;
      case LogLevels.ERROR:
        msg = brightRed(msg);
        break;
      case LogLevels.CRITICAL:
        msg = bold(brightRed(msg));
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

await log.setup({
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

const logger = log.getLogger();

export default logger;
