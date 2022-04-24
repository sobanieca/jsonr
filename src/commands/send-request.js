import logger from "../logger.js";

/*
 * Available args:
 * i input variable -i "variable1: abc"
 * h header -h "auth: abc"
 * s expected response status code -s 200
 * t expected text in response -t "abc"
 * e environment name -e "./file.json"
 * m http method -m POST
 * b body -b '{ test: "123" }'
 * --no-default-content-type-header
 * o output file -o output.json
 * input http file / url
 */

const sendRequest = async (args) => {
  let request = {
    method: "GET",
    redirect: "manual",
    headers: new Headers({
      "Content-Type": "application/json"
    }),
    body: {},
    url: ""
  };

  if (args["_"].length != 1) {
    throw new Error("Invalid parameters provided. Provide exactly one url or .http file path.");
  }

  if (!args["default-content-type-header"]) {
    logger.debug("Parameter--no-default-content-type-header provided - removing default Content-Type header");
    request.headers.delete("Content-Type");
  }

  if (args.m) {
    logger.debug(`Parameter [m]ethod provided - HTTP method set to ${args.m}`);
    request.method = args.m;
  }

  if (args.b) {
    logger.debug(`Parameter [b]ody provided - HTTP body set to ${args.b}`);
  }


  logger.debug("Sending request");
}

export default {
  execute: async (args) => await sendRequest(args),
  match: (args) => true,
};
