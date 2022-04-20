import logger from "../logger.js";

const deleteEnvironment = (args) => {
  let environmentName = args["_"][2];

  if (!environmentName) {
    throw new Error("No environment name provided!");
  }

  environmentName = environmentName.toLowerCase();
  logger.debug(`Trying to delete environment ${environmentName}`);

  const existingEnvironmentFile = localStorage.getItem(environmentName);
  if (existingEnvironmentFile) {
    localStorage.removeItem(environmentName);
    logger.info(`Environment ${environmentName} removed`);
  } else {
    logger.warning(`Environment ${environmentName} was not found.`);
  }
};

export default {
  execute: (args) => deleteEnvironment(args),
  match: (args) =>
    args["_"]?.slice(0, 2)?.join(" ").toLowerCase() == "environments delete",
};
