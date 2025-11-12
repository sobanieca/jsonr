import logger from "../logger.js";

const configWithComments = `{
  "defaults": {
    // Path to environment file with variables (supports ~ for home directory)
    "environment": undefined,

    // Default headers to include in all requests
    "headers": undefined,

    // Default input variables for @@variable@@ replacement
    "input": undefined,

    // Expected response status code for validation
    "status": undefined,

    // Expected text that should be contained in response body
    "text": undefined,

    // Default HTTP method (GET, POST, PUT, DELETE, etc.)
    "method": undefined,

    // Default request body as string or object
    "body": undefined,

    // Enable verbose mode to show request/response headers
    "verbose": false,

    // Enable raw mode to preserve whitespace in request body
    "raw": false,

    // Automatically follow HTTP redirects
    "followRedirects": false,

    // Default output file path for saving response
    "output": undefined,

    // Omit the default Content-Type: application/json header
    "omitDefaultContentTypeHeader": false,

    // Treat body as JavaScript object literal and convert to JSON
    "js": false
  }
}
`;

const createConfig = async () => {
  const configFileName = "jsonr-config.json";

  try {
    // Check if config file already exists
    try {
      await Deno.lstat(configFileName);
      logger.error(
        `Error: ${configFileName} already exists in the current directory. Delete it first if you want to regenerate it.`,
      );
      Deno.exit(1);
    } catch (err) {
      if (!(err instanceof Deno.errors.NotFound)) {
        throw err;
      }
      // File doesn't exist, continue
    }

    // Create the config file with comments
    await Deno.writeTextFile(configFileName, configWithComments);

    logger.info(`✓ Created ${configFileName} in the current directory`);
    logger.info("");
    logger.info("Edit this file to set your default values.");
    logger.info(
      "Remove or set to undefined any properties you don't want to configure.",
    );
    logger.info("");
    logger.info("Note: Comments in the generated file are for reference only.");
    logger.info(
      "JSON doesn't officially support comments, but many parsers tolerate them.",
    );
    logger.info(
      "If you encounter parsing issues, remove the comment lines starting with '//'.",
    );
  } catch (err) {
    logger.error(`Failed to create config file: ${err.message}`);
    logger.debug(err);
    Deno.exit(1);
  }
};

export default {
  execute: async () => await createConfig(),
  match: (args) => args._[0] === "config",
};
