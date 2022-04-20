import logger from "../logger.js";

const listEnvironments = () => {
  logger.debug(`Listing environments`);

  logger.info("Following environments are defined:");

  let maxEnvironmentNameLength = "Name".length;
  let maxFilePathLength = "File".length;
  for (const key of Object.keys(localStorage)) {
    if (key.length > maxEnvironmentNameLength)
      maxEnvironmentNameLength = key.length;

    const filePath = localStorage[key];

    if (filePath.length > maxFilePathLength)
      maxFilePathLength = filePath.length;
  }

  logger.info(`${"Name".padEnd(maxEnvironmentNameLength, " ")} | ${"File".padEnd(maxFilePathLength, " ")}`);
  logger.info("-".padEnd(maxEnvironmentNameLength + " | ".length + maxFilePathLength, "-"));

  for (const key of Object.keys(localStorage)) {
    const filePath = localStorage[key];

    logger.info(`${key.padEnd(maxEnvironmentNameLength, " ")} | ${filePath.padEnd(maxFilePathLength, " ")}`);
  }
};

export default {
  execute: (args) => listEnvironments(),
  match: (args) => args["_"]?.join(" ").toLowerCase() == "environments list",
};
