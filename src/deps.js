import * as log from "jsr:@std/log@0.224.14";
import { BaseHandler } from "jsr:@std/log@0.224.14/base-handler";
import {
  bold,
  brightBlue,
  brightRed,
  brightYellow,
} from "jsr:@std/fmt@1.0.8/colors";
import { parseArgs } from "jsr:@std/cli@1.0.20/parse-args";
import { LogLevels } from "jsr:@std/log@0.224.14";
import { dirname, join, resolve } from "jsr:@std/path@1.0.8";

const deps = {
  logging: {
    log,
    BaseHandler,
    LogLevels,
  },
  colors: {
    bold,
    brightBlue,
    brightRed,
    brightYellow,
  },
  parse: parseArgs,
  dirname,
  join,
  resolve,
};

export { deps };
