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

const parseHttpFile = async (filePath) => {
  logger.debug(`Attempting to read request data from file: ${filePath}`);
  try {
  const file = await Deno.readTextFile(filePath);
  const [ mainPart, bodyPart ] = file.split(/\r?\n\r?\n/);

  let request = {};
  
  const [ mainLine, ...headers ] = mainPart.split(/\r?\n/);

  const [ method, url] = mainLine.split(" ").map(x => x.trim());

  logger.debug(`Read following method: ${method} and url: ${url}`);
  request.method = method;
  request.url = url;

  if (headers && headers.length > 0) {
    for (let header of headers) {
      const [headerKey, headerValue] = header.split(":").map(x => x.trim());
      request.headers = [];
      request.headers.push({ headerKey, headerValue });
    }
  }
  
  if (bodyPart) {
    logger.debug(`Read following request body: ${bodyPart}`);
    request.body = bodyPart;
  }

  return request;
  } catch {
    throw new Error("Unexpected error occurred when trying to parse http file. Ensure that the file is compatible with RFC2616 standard");
  }
}

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
      await parseHttpFile(urlOrFilePath);
      // todo: merge above
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
