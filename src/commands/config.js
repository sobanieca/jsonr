import logger from "../logger.js";

const configWithComments = `{
  // For detailed documentation about all configuration options, run: jsonr --help

  "environments": {
    "prod": {
      "inputVariables": {
        "baseUrl": "https://api.example.com",
        "apiVersion": "v1"
      },
      "secrets": "~/.secret/prod-secrets.json"
    },
    "dev": {
      "inputVariables": {
        "baseUrl": "https://dev-api.example.com",
        "apiVersion": "v1"
      },
      "secrets": "~/.secret/dev-secrets.json"
    }
  },

  "defaults": {
    "inputVariables": {
      "baseUrl": "http://localhost:3000"
    }
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
    logger.info("Edit this file to customize your environments and defaults.");
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
