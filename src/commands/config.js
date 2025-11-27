import logger from "../logger.js";
import { loadAndApplyConfig } from "../config.js";

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
    },
    "headers": {
      "X-Request-Source": "jsonr-cli"
    }
  }
}
`;

const createConfig = async () => {
  const configFileName = "jsonr-config.json";

  try {
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
    }

    await Deno.writeTextFile(configFileName, configWithComments);

    logger.info(`Created ${configFileName} in the current directory`);
    logger.info("");
    logger.info("Edit this file to customize your environments and defaults.");
  } catch (err) {
    logger.error(`Failed to create config file: ${err.message}`);
    logger.debug(err);
    Deno.exit(1);
  }
};

const displayConfig = async (args) => {
  const configFileName = "jsonr-config.json";

  let fileExists = false;
  try {
    await Deno.lstat(configFileName);
    fileExists = true;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      logger.info(`No ${configFileName} found in current directory.`);
      logger.info("");
      logger.info(`Run 'jsonr config --init' to initialize a config file.`);
      logger.info("");
    } else {
      throw err;
    }
  }

  const enrichedArgs = await loadAndApplyConfig(args);

  logger.info(`Merged configuration:`);
  logger.info("");
  const formattedConfig = Deno.inspect(enrichedArgs, {
    colors: true,
    strAbbreviateSize: 256000,
    iterableLimit: 20000,
    depth: 100,
  });
  logger.info(formattedConfig);
};

export default {
  execute: async (args) => {
    if (args.init) {
      await createConfig();
    } else {
      await displayConfig(args);
    }
  },
  match: (args) => args._[0] === "config",
};
