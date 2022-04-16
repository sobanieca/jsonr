import logger from "../logger.js";

const listEnvironments = () => {
  logger.debug(`Listing environments`);

  logger.info("Following environments are defined:");
  logger.info({ ...localStorage });
};

export default {
  execute: (args) => listEnvironments(),
  match: (args) => args["_"]?.join(" ").toLowerCase() == "environments list",
};
