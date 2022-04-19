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

  logger.info(`${"Name".padEnd(maxEnvironmentNameLength - "Name".length, " ")} | ${"File".padEnd(maxFilePathLength - "File".length, " ")}`);
  logger.info("-".padEnd(maxEnvironmentNameLength + " | ".length + maxFilePathLength, "-"));

  for (const key of Object.keys(localStorage)) {
    const filePath = localStorage[key];

    logger.info(`${key.padEnd(maxEnvironmentNameLength - key.length, " ")} | ${filePath.padStart(maxFilePathLength - filePath.length, " ")}`);
  }
}


//  let nameSpacer = (new Array(maxEnvironmentNameLength - "Name".length)).map(_ => " ");
//  let fileSpacer = (new Array(maxFilePathLength - "File".length)).map(_ => " ");
//
//  logger.info(`Name${nameSpacer}|File${fileSpacer}`);
//  logger.info((new Array(maxEnvironmentNameLength + maxFilePathLength)).map(_ => "-"));
//  
//  for (let key of Object.keys(localStorage)) {
//    const filePath = localStorage[key];
//    nameSpacer = (new Array(maxEnvironmentNameLength - key.length)).map(_ => " ");
//    fileSpacer = (new Array(maxFilePathLength - filePath.length)).map(_ => " ");
//    logger.info(`${key}${nameSpacer}|${filePath}${fileSpacer}`);
//  }
//};

export default {
  execute: (args) => listEnvironments(),
  match: (args) => args["_"]?.join(" ").toLowerCase() == "environments list",
};
