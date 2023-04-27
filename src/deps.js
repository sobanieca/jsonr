export * as log from "https://deno.land/std@0.174.0/log/mod.ts";
export { BaseHandler } from "https://deno.land/std@0.174.0/log/handlers.ts?s=BaseHandler";
export {
  bold,
  brightBlue,
  brightRed,
  brightYellow,
} from "https://deno.land/std@0.174.0/fmt/colors.ts";
export { parse } from "https://deno.land/std@0.174.0/flags/mod.ts";
export { LogLevels } from "https://deno.land/std@0.174.0/log/mod.ts";

const runtime = {
  Deno,
  fetch
};

export { runtime };

