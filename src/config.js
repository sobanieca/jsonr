import logger from "./logger.js";
import { deps } from "./deps.js";

const CONFIG_FILE_NAME = "jsonr-config.json";

/**
 * Expands tilde (~) in file paths to the user's home directory
 */
const expandTilde = (filePath) => {
  if (typeof filePath !== "string") {
    return filePath;
  }
  if (filePath.startsWith("~/") || filePath === "~") {
    const homeDir = Deno.env.get("HOME") || Deno.env.get("USERPROFILE");
    if (!homeDir) {
      logger.debug("Could not determine home directory for tilde expansion");
      return filePath;
    }
    return filePath.replace(/^~/, homeDir);
  }
  return filePath;
};

/**
 * Reads and parses a jsonr-config.json file
 * Returns the config object or null if file doesn't exist or is invalid
 */
const readConfigFile = async (filePath) => {
  try {
    const content = await Deno.readTextFile(filePath);
    const config = JSON.parse(content);
    logger.debug(`Successfully loaded config from ${filePath}`);
    return config;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      logger.debug(`Config file not found at ${filePath}`);
      return null;
    }
    logger.debug(`Error reading config file ${filePath}: ${err}`);
    logger.error(
      `Warning: Failed to parse ${filePath}. Ensure it contains valid JSON.`,
    );
    return null;
  }
};

/**
 * Finds all jsonr-config.json files from the current directory up to the home directory
 * Returns an array of config objects, ordered from home directory to current directory
 * (so that configs closer to cwd can override parent configs)
 */
const findConfigFiles = async () => {
  const configs = [];
  const homeDir = Deno.env.get("HOME") || Deno.env.get("USERPROFILE");

  if (!homeDir) {
    logger.debug("Could not determine home directory");
    return configs;
  }

  let currentDir = Deno.cwd();
  const homeDirResolved = deps.resolve(homeDir);

  logger.debug(
    `Searching for ${CONFIG_FILE_NAME} files from ${currentDir} to ${homeDirResolved}`,
  );

  // Collect all directories from cwd to home
  const directories = [];
  while (true) {
    directories.push(currentDir);

    // Stop if we've reached the home directory
    if (currentDir === homeDirResolved) {
      break;
    }

    // Stop if we've reached the root directory
    const parentDir = deps.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

  // Read configs in reverse order (from home to cwd)
  // so that configs array is ordered from least specific to most specific
  for (let i = directories.length - 1; i >= 0; i--) {
    const dir = directories[i];
    const configPath = deps.join(dir, CONFIG_FILE_NAME);
    const config = await readConfigFile(configPath);
    if (config) {
      configs.push(config);
    }
  }

  return configs;
};

/**
 * Merges defaults from config objects
 * Later configs (closer to cwd) override earlier configs (closer to home)
 */
const mergeConfigs = (configs) => {
  const merged = {
    defaults: {},
  };

  for (const config of configs) {
    if (config.defaults && typeof config.defaults === "object") {
      // Merge defaults, expanding tilde in path values
      for (const [key, value] of Object.entries(config.defaults)) {
        merged.defaults[key] = expandTilde(value);
      }
    }
  }

  return merged;
};

/**
 * Applies config defaults to command-line arguments
 * CLI arguments always take precedence over config defaults
 */
const applyConfigToArgs = (args, config) => {
  if (!config.defaults) {
    return args;
  }

  // Create a new args object with config defaults applied
  const enrichedArgs = { ...args };

  // Map of config default keys to args keys
  // Config uses camelCase (matching sdk.js), args uses both camelCase and kebab-case
  const argMapping = {
    env: "environment",
    environment: "environment",
    headers: "headers",
    input: "input",
    status: "status",
    text: "text",
    method: "method",
    body: "body",
    verbose: "verbose",
    raw: "raw",
    followRedirects: "follow-redirects",
    output: "output",
    omitDefaultContentTypeHeader: "omit-default-content-type-header",
    js: "js",
  };

  for (const [configKey, configValue] of Object.entries(config.defaults)) {
    const argsKey = argMapping[configKey] || configKey;

    // Only apply default if the CLI argument wasn't provided
    if (enrichedArgs[argsKey] === undefined) {
      logger.debug(
        `Applying config default: ${argsKey} = ${configValue}`,
      );
      enrichedArgs[argsKey] = configValue;
    } else {
      logger.debug(
        `CLI argument ${argsKey} provided, skipping config default`,
      );
    }
  }

  return enrichedArgs;
};

/**
 * Main function to load config and apply it to args
 */
export const loadAndApplyConfig = async (args) => {
  try {
    const configFiles = await findConfigFiles();

    if (configFiles.length === 0) {
      logger.debug("No jsonr-config.json files found");
      return args;
    }

    logger.debug(`Found ${configFiles.length} config file(s)`);
    const mergedConfig = mergeConfigs(configFiles);
    logger.debug("Merged config:");
    logger.debug(mergedConfig);

    return applyConfigToArgs(args, mergedConfig);
  } catch (err) {
    logger.debug(`Error loading config: ${err}`);
    logger.error("Warning: Failed to load configuration files");
    return args;
  }
};

export default {
  loadAndApplyConfig,
};
