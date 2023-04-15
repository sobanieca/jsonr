import * as log from "https://deno.land/std@0.174.0/log/mod.ts";
import { BaseHandler } from "https://deno.land/std@0.174.0/log/handlers.ts?s=BaseHandler";
import {
  bold,
  brightBlue,
  brightRed,
  brightYellow,
} from "https://deno.land/std@0.174.0/fmt/colors.ts";
import { parse } from "https://deno.land/std@0.174.0/flags/mod.ts";
import { LogLevels } from "https://deno.land/std@0.174.0/log/mod.ts";

export {
  BaseHandler,
  bold,
  brightBlue,
  brightRed,
  brightYellow,
  log,
  LogLevels,
  parse,
};
