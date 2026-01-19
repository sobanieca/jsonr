import logger, { registerSecrets } from "./logger.js";
import { deps } from "./deps.js";

const CONFIG_FILE_NAME = "jsonr-config.json";

const stripJsonComments = (content) => {
  return content.replace(/^\s*(\/\/|#).*$/gm, "");
};

const removeTrailingCommas = (content) => {
  return content.replace(/,(\s*[}\]])/g, "$1");
};

const readJsonFile = async (filePath) => {
  try {
    let content = await Deno.readTextFile(filePath);
    content = stripJsonComments(content);
    content = removeTrailingCommas(content);
    return JSON.parse(content);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      throw err;
    }
    throw new Error(`Failed to parse JSON: ${err.message}`);
  }
};

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

const expandTilde = (filePath) => {
  if (filePath && filePath.startsWith("~")) {
    const homeDir = Deno.env.get("HOME") || Deno.env.get("USERPROFILE");
    if (homeDir) {
      return filePath.replace(/^~/, homeDir);
    }
  }
  return filePath;
};

const loadSecretsFile = async (secretsPath) => {
  if (!secretsPath) {
    return {};
  }

  secretsPath = expandTilde(secretsPath);
  logger.debug(`Loading secrets from ${secretsPath}`);

  try {
    const secrets = await readJsonFile(secretsPath);
    registerSecrets(secrets);
    logger.debug(
      `Loaded ${Object.keys(secrets).length} variables from secrets file`,
    );
    return secrets;
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      logger.error(
        `ERROR: Secrets file not found at ${secretsPath}. Please check the path in your config file.`,
      );
      Deno.exit(1);
    }
    logger.error(
      `ERROR: Failed to read secrets file at ${secretsPath}: ${err.message}`,
    );
    Deno.exit(1);
  }
};

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

  const directories = [];
  while (true) {
    directories.push(currentDir);

    if (currentDir === homeDirResolved) {
      break;
    }

    const parentDir = deps.dirname(currentDir);
    if (parentDir === currentDir) {
      break;
    }

    currentDir = parentDir;
  }

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

const mergeEnvironmentConfigs = (configs, envName) => {
  const merged = {};

  for (const config of configs) {
    if (
      config.environments &&
      config.environments[envName] &&
      typeof config.environments[envName] === "object"
    ) {
      for (const [key, value] of Object.entries(config.environments[envName])) {
        if (key === "inputVariables") {
          if (!merged.inputVariables) {
            merged.inputVariables = {};
          }
          Object.assign(merged.inputVariables, value);
        } else if (key === "secrets") {
          merged.secrets = value;
        } else if (
          typeof value === "object" && !Array.isArray(value) && value !== null
        ) {
          if (!merged[key]) {
            merged[key] = {};
          }
          Object.assign(merged[key], value);
        } else {
          merged[key] = value;
        }
      }
    }
  }

  return Object.keys(merged).length > 0 ? merged : null;
};

const mergeDefaultConfigs = (configs) => {
  const merged = {};

  for (const config of configs) {
    if (config.defaults && typeof config.defaults === "object") {
      for (const [key, value] of Object.entries(config.defaults)) {
        if (key === "inputVariables") {
          if (!merged.inputVariables) {
            merged.inputVariables = {};
          }
          Object.assign(merged.inputVariables, value);
        } else if (key === "secrets") {
          merged.secrets = value;
        } else if (
          typeof value === "object" && !Array.isArray(value) && value !== null
        ) {
          if (!merged[key]) {
            merged[key] = {};
          }
          Object.assign(merged[key], value);
        } else {
          merged[key] = value;
        }
      }
    }
  }

  return merged;
};

const applyConfigToArgs = async (args, configData) => {
  if (!configData) {
    return args;
  }

  const enrichedArgs = { ...args };

  let secretsVariables = {};
  const secretsPath = args.secrets || configData.secrets;
  if (secretsPath) {
    secretsVariables = await loadSecretsFile(secretsPath);
  }

  for (const [configKey, configValue] of Object.entries(configData)) {
    if (configKey === "secrets") {
      continue;
    }

    if (configKey === "inputVariables") {
      const allVariables = { ...configValue, ...secretsVariables };

      if (!enrichedArgs.inputVariables) {
        enrichedArgs.inputVariables = {};
      }
      Object.assign(enrichedArgs.inputVariables, allVariables);

      logger.debug(
        `Applied ${
          Object.keys(allVariables).length
        } input variables from config (${
          Object.keys(secretsVariables).length
        } from secrets)`,
      );
    } else if (configKey === "headers") {
      if (typeof configValue === "object" && !Array.isArray(configValue)) {
        if (!enrichedArgs.headers) {
          enrichedArgs.headers = {};
        }

        Object.assign(enrichedArgs.headers, configValue);

        logger.debug(
          `Applied ${Object.keys(configValue).length} headers from config`,
        );
      } else {
        enrichedArgs[configKey] = configValue;
      }
    } else if (
      enrichedArgs[configKey] === undefined && configValue !== undefined
    ) {
      logger.debug(
        `Applying config value: ${configKey} = ${configValue}`,
      );
      enrichedArgs[configKey] = configValue;
    } else if (
      typeof enrichedArgs[configKey] === "boolean" &&
      enrichedArgs[configKey] === false &&
      configValue !== undefined
    ) {
      logger.debug(
        `Applying config value for boolean flag: ${configKey} = ${configValue}`,
      );
      enrichedArgs[configKey] = configValue;
    } else if (enrichedArgs[configKey] !== undefined) {
      logger.debug(
        `CLI argument ${configKey} provided, skipping config value`,
      );
    }
  }

  if (Object.keys(secretsVariables).length > 0 && !configData.inputVariables) {
    if (!enrichedArgs.inputVariables) {
      enrichedArgs.inputVariables = {};
    }
    Object.assign(enrichedArgs.inputVariables, secretsVariables);
    logger.debug(
      `Applied ${
        Object.keys(secretsVariables).length
      } variables from secrets file`,
    );
  }

  return enrichedArgs;
};

export const loadAndApplyConfig = async (args) => {
  try {
    const configFiles = await findConfigFiles();

    if (configFiles.length === 0) {
      logger.debug("No jsonr-config.json files found");
      return args;
    }

    logger.debug(`Found ${configFiles.length} config file(s)`);

    if (args.environment && !args.environment.endsWith(".json")) {
      const envName = args.environment;
      logger.debug(`Looking for environment '${envName}' in config files`);

      const envConfig = mergeEnvironmentConfigs(configFiles, envName);

      if (!envConfig) {
        logger.error(
          `ERROR: Environment '${envName}' not found in any jsonr-config.json files.`,
        );
        logger.error(`Run 'jsonr --help' for details on configuration files.`);
        Deno.exit(1);
      }

      logger.debug(`Found environment '${envName}' configuration`);
      logger.debug(envConfig);

      const defaultConfig = mergeDefaultConfigs(configFiles);
      logger.debug("Merged default config:");
      logger.debug(defaultConfig);

      const mergedConfig = { ...defaultConfig, ...envConfig };
      if (defaultConfig.inputVariables || envConfig.inputVariables) {
        mergedConfig.inputVariables = {
          ...defaultConfig.inputVariables,
          ...envConfig.inputVariables,
        };
      }
      logger.debug("Final merged config (defaults + environment):");
      logger.debug(mergedConfig);

      return await applyConfigToArgs(args, mergedConfig);
    } else {
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
  findConfigFiles,
};
