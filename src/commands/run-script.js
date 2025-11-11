import logger from "../logger.js";
import { jsonr } from "../sdk.js";

export default {
  execute: async (args) => {
    const scriptPath = args._[1];

    if (!scriptPath) {
      throw new Error("Script path is required. Usage: jsonr run script.js");
    }

    try {
      await Deno.lstat(scriptPath);
    } catch (err) {
      if (err instanceof Deno.errors.NotFound) {
        throw new Error(`Script file not found: ${scriptPath}`);
      }
      throw err;
    }

    logger.debug(`Executing script: ${scriptPath}`);

    try {
      const absolutePath = scriptPath.startsWith("/")
        ? scriptPath
        : `${Deno.cwd()}/${scriptPath}`;

      // @ts-ignore: Expose jsonr SDK to the script
      globalThis.jsonr = jsonr;

      const fileUrl = new URL(`file://${absolutePath}`).href;
      await import(fileUrl);

      // @ts-ignore: Expose jsonr SDK to the script
      delete globalThis.jsonr;
    } catch (err) {
      throw new Error(
        `Failed to execute script: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  },
  match: (args) => args._[0] === "run",
};
