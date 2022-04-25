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
 * --omit-default-content-type-header
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

  // TODO: check if args["_"][0] is file (test path), if yes, read it's content into request, 
  // otherwise set value as url
  const urlOrFilePath = args["_"][0];
  if (urlOrFilePath.startsWith("http://") || urlOrFilePath.startsWith("https://")) {
    logger.debug("http(s):// at the beginning of the file/url parameter detected. Assuming url.");
    request.url = urlOrFilePath;
  } else {
    try {
      await Deno.lstat(urlOrFilePath);
      logger.debug(`File ${urlOrFilePath} found. Parsing http file content.`);
    } catch {
      logger.debug(`Failed to lstat file/url parameter - ${urlOrFilePath}. Assuming url`);
      request.url = urlOrFilePath;
    }
  }


  if (args["omit-default-content-type-header"]) {
    logger.debug("Parameter--omit-default-content-type-header provided - removing default Content-Type header");
    request.headers.delete("Content-Type");
  }

  if (args.m) {
    logger.debug(`Parameter [m]ethod provided - HTTP method set to ${args.m}`);
    request.method = args.m;
  }

  if (args.b) {
    logger.debug(`Parameter [b]ody provided - HTTP body set to ${args.b}`);
    request.body = args.b;
  }

  if (args.h) {
    let appendHeader = (headerArg) => {
      logger.debug(`Adding ${headerArg} header to request`);
      let [ headerKey, headerValue ] = headerArg.split(":")?.map(x => x.trim());
      request.headers.append(headerKey, headerValue);
    };
    if(Array.isArray(args.h)) {
      for(let h of args.h) {
        appendHeader(h);
      }
    } else {
      appendHeader(args.h);
    }
  }

  logger.debug("Sending request");
  // TODO: send request + handle output file if args.o provided
  // TODO: handle args.s and args.t to validate response
}

export default {
  execute: async (args) => await sendRequest(args),
  match: (args) => true,
};
