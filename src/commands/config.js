import logger from "../logger.js";
import config from "../config.js";

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

const kebabToCamel = (str) => {
  return str.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
};

const displayConfig = async (args) => {
  const configFiles = await config.findConfigFiles();

  if (configFiles.length === 0) {
    logger.info("No jsonr-config.json files found.");
    logger.info("");
    logger.info("Run 'jsonr config --init' to create a config file.");
    return;
  }

  const enrichedArgs = await config.loadAndApplyConfig(args);

  const mapped = {};
  for (const [key, value] of Object.entries(enrichedArgs)) {
    if (key === "_" || key === "--" || key.length === 1) continue;
    const mappedKey = kebabToCamel(key);
    mapped[mappedKey] = value;
  }

  logger.info(`Merged configuration:`);
  logger.info("");
  const formattedConfig = Deno.inspect(mapped, {
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
