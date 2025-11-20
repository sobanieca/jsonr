import logger from "./logger.js";
import { deps } from "./deps.js";

const CONFIG_FILE_NAME = "jsonr-config.json";

// Global set of secret keys for masking in logs
let secretKeys = new Set();

/**
 * Returns the set of secret keys that should be masked in logs
 */
export const getSecretKeys = () => secretKeys;

/**
 * Masks a value if it's a secret
 */
export const maskSecret = (value) => {
  if (!value) return value;
  return "*****";
};

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
 * Reads and parses a JSON file, stripping comments
 */
const readJsonFile = async (filePath) => {
  try {
    let content = await Deno.readTextFile(filePath);
    // Remove comments from JSON (lines starting with // or # after optional whitespace)
    content = content.replace(/^\s*(\/\/|#).*$/gm, "");
    // Remove trailing commas before closing brackets
    content = content.replace(/,(\s*[}\]])/g, "$1");
    return JSON.parse(content);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      throw err;
    }
    throw new Error(`Failed to parse JSON: ${err.message}`);
  }
};

/**
 * Reads and parses a jsonr-config.json file
 * Returns the config object or null if file doesn't exist or is invalid
 */
const readConfigFile = async (filePath) => {
  try {
    const config = await readJsonFile(filePath);
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
 * Loads secrets from a secrets file
 * Returns an object with variables and marks them as secrets
 */
const loadSecretsFile = async (secretsPath) => {
  if (!secretsPath) {
    return {};
  }

  const expandedPath = expandTilde(secretsPath);
  logger.debug(`Loading secrets from ${expandedPath}`);

  try {
    const secrets = await readJsonFile(expandedPath);

    // Mark all keys from secrets file as secret
    for (const key of Object.keys(secrets)) {
      secretKeys.add(key);
      logger.debug(`Marked '${key}' as secret (will be masked in logs)`);
    }

    return secrets;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      logger.error(
        `Error: Secrets file not found at ${expandedPath}. Please check the path in your config file.`,
      );
      Deno.exit(1);
    }
    logger.error(
      `Error: Failed to read secrets file at ${expandedPath}: ${err.message}`,
    );
    Deno.exit(1);
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
 * Merges environment configurations from multiple config files
 * Returns merged environment or null if not found
 */
const mergeEnvironmentConfigs = (configs, envName) => {
  const merged = {};

  for (const config of configs) {
    if (
      config.environments &&
      config.environments[envName] &&
      typeof config.environments[envName] === "object"
    ) {
      // Merge environment settings
      for (const [key, value] of Object.entries(config.environments[envName])) {
        if (key === "variables" || key === "inputVariables") {
          // Merge variables
          if (!merged.inputVariables) {
            merged.inputVariables = {};
          }
          Object.assign(merged.inputVariables, value);
        } else if (key === "secrets") {
          // Take the most specific secrets path
          merged.secrets = expandTilde(value);
        } else {
          // Other config values
          merged[key] = value;
        }
      }
    }
  }

  return Object.keys(merged).length > 0 ? merged : null;
};

/**
 * Merges defaults from config objects
 * Later configs (closer to cwd) override earlier configs (closer to home)
 */
const mergeDefaultConfigs = (configs) => {
  const merged = {};

  for (const config of configs) {
    if (config.defaults && typeof config.defaults === "object") {
      // Merge defaults
      for (const [key, value] of Object.entries(config.defaults)) {
        if (key === "inputVariables") {
          // Merge inputVariables
          if (!merged.inputVariables) {
            merged.inputVariables = {};
          }
          Object.assign(merged.inputVariables, value);
        } else if (key === "secrets") {
          // Take the most specific secrets path
          merged.secrets = expandTilde(value);
        } else {
          merged[key] = value;
        }
      }
    }
  }

  return merged;
};

/**
 * Applies config to command-line arguments
 * CLI arguments always take precedence over config
 */
const applyConfigToArgs = async (args, configData) => {
  if (!configData) {
    return args;
  }

  // Create a new args object with config applied
  const enrichedArgs = { ...args };

  // Map of config keys to args keys
  const argMapping = {
    environment: "environment",
    headers: "headers",
    inputVariables: "inputVariables",
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

  // Load secrets if specified
  let secretsVariables = {};
  if (configData.secrets) {
    secretsVariables = await loadSecretsFile(configData.secrets);
  }

  // Apply config values to args (only if not already provided via CLI)
  for (const [configKey, configValue] of Object.entries(configData)) {
    if (configKey === "secrets") {
      // Skip secrets path itself
      continue;
    }

    const argsKey = argMapping[configKey] || configKey;

    if (configKey === "inputVariables") {
      // Merge inputVariables from config with secrets
      const allVariables = { ...configValue, ...secretsVariables };

      // Store in enrichedArgs for later use
      if (!enrichedArgs.inputVariables) {
        enrichedArgs.inputVariables = {};
      }
      Object.assign(enrichedArgs.inputVariables, allVariables);

      logger.debug(
        `Applied ${Object.keys(allVariables).length} input variables from config (${Object.keys(secretsVariables).length} from secrets)`,
      );
    } else if (enrichedArgs[argsKey] === undefined && configValue !== undefined) {
      logger.debug(
        `Applying config value: ${argsKey} = ${configValue}`,
      );
      enrichedArgs[argsKey] = configValue;
    } else if (enrichedArgs[argsKey] !== undefined) {
      logger.debug(
        `CLI argument ${argsKey} provided, skipping config value`,
      );
    }
  }

  // If we have secrets but no inputVariables from config, still add them
  if (Object.keys(secretsVariables).length > 0 && !configData.inputVariables) {
    if (!enrichedArgs.inputVariables) {
      enrichedArgs.inputVariables = {};
    }
    Object.assign(enrichedArgs.inputVariables, secretsVariables);
    logger.debug(
      `Applied ${Object.keys(secretsVariables).length} variables from secrets file`,
    );
  }

  return enrichedArgs;
};

/**
 * Main function to load config and apply it to args
 */
export const loadAndApplyConfig = async (args) => {
  try {
    // Reset secret keys for each invocation
    secretKeys = new Set();

    const configFiles = await findConfigFiles();

    if (configFiles.length === 0) {
      logger.debug("No jsonr-config.json files found");
      return args;
    }

    logger.debug(`Found ${configFiles.length} config file(s)`);

    // If environment is specified via -e flag, look for that environment
    if (args.environment && !args.environment.endsWith(".json")) {
      const envName = args.environment;
      logger.debug(`Looking for environment '${envName}' in config files`);

      const envConfig = mergeEnvironmentConfigs(configFiles, envName);

      if (!envConfig) {
        logger.error(
          `Error: Environment '${envName}' not found in any jsonr-config.json files.`,
        );
        logger.error(`Run 'jsonr --help' for details on configuration files.`);
        Deno.exit(1);
      }

      logger.debug(`Found environment '${envName}' configuration`);
      logger.debug(envConfig);

      return await applyConfigToArgs(args, envConfig);
    } else {
      // Use defaults
      logger.debug("Using default configuration (no environment specified)");
      const defaultConfig = mergeDefaultConfigs(configFiles);
      logger.debug("Merged default config:");
      logger.debug(defaultConfig);

      return await applyConfigToArgs(args, defaultConfig);
    }
  } catch (err) {
    logger.debug(`Error loading config: ${err}`);
    logger.error("Warning: Failed to load configuration files");
    return args;
  }
};

export default {
  loadAndApplyConfig,
  getSecretKeys,
  maskSecret,
};
