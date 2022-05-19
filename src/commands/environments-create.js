import logger from "../logger.js";

const createEnvironment = async (args) => {
  let environmentName = args["_"][2];
  const environmentFile = args["_"][3];
  if (!environmentName) {
    throw new Error("No environment name provided!");
  }

  if (!environmentFile) {
    throw new Error("No environment data file path provided!");
  }

  environmentName = environmentName.toLowerCase();
  logger.debug(
    `Trying to create environment ${environmentName} with data in file ${environmentFile}`,
  );

  const existingEnvironmentFile = localStorage.getItem(environmentName);
  if (existingEnvironmentFile) {
    logger.warning(
      `Environment with name ${environmentName} is already defined with file ${existingEnvironmentFile}. ` +
        `Delete it first with 'jsonr environments delete ${environmentName}'`,
    );
  } else {
    try {
      await Deno.lstat(environmentFile);
      localStorage.setItem(environmentName, environmentFile);
      logger.info(
        `Environment ${environmentName} with data in file ${environmentFile} created`,
      );
    } catch(err) {
      logger.debug(err);
      logger.error(`No file found: ${environmentFile}`);
    }
  }
};

export default {
  execute: (args) => createEnvironment(args),
  match: (args) =>
    args["_"]?.slice(0, 2)?.join(" ").toLowerCase() == "environments create",
};
