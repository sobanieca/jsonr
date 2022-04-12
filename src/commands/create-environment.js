import logger from "../logger.js";

const createEnvironment = async (args) => {
  const environmentName = args["_"].slice(2, 3);
  logger.debug(`Trying to create environment ${environmentName}`);
}

export default {
  execute: async (args) => await createEnvironment(args),
  match: (args) => args["_"]?.slice(0, 2)?.join(";").toLowerCase() == "create;environment"
}

