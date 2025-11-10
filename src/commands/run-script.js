import logger from "../logger.js";

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
      const fileUrl = new URL(`file://${absolutePath}`).href;
      await import(fileUrl);
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
