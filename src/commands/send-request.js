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
 * input http file
 */

const sendRequest = async (args) => {
  logger.debug("Sending request");
}

export default {
  execute: async (args) => await sendRequest(args),
  match: (args) => true,
};
