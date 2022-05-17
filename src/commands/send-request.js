import logger from "../logger.js";

/*
 * Available args:
 * i input variable -i "variable1: abc"
 * h header -h "auth: abc"
 * s expected response status code -s 200
 * t expected text in response -t "abc"
 * e environment name -e "./file.json"
 * m http method -m POST
 * v verbose - more details like response headers
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
    request.headers = [];

    if (headers && headers.length > 0) {
      for (let header of headers) {
        const [headerKey, headerValue] = header.split(":").map(x => x.trim());
        request.headers.push({ key: headerKey, value: headerValue });
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
    headers: [{ key: "Content-Type", value: "application/json" }],
    body: {},
    url: ""
  };
 
  if (args["omit-default-content-type-header"]) {
    logger.debug("Parameter--omit-default-content-type-header provided - removing default Content-Type header");
    request.headers = [];
  }

  if (args["_"].length != 1) {
    throw new Error("Invalid parameters provided. Provide exactly one url or .http file path.");
  }

  const urlOrFilePath = args["_"][0];
  if (urlOrFilePath.startsWith("http://") || urlOrFilePath.startsWith("https://")) {
    logger.debug("http(s):// at the beginning of the file/url parameter detected. Assuming url.");
    request.url = urlOrFilePath;
  } else {
    try {
      await Deno.lstat(urlOrFilePath);
      logger.debug(`File ${urlOrFilePath} found. Parsing http file content.`);
      let fileRequest = await parseHttpFile(urlOrFilePath);
      request.method = fileRequest.method;
      request.url = fileRequest.url;
      request.body = fileRequest.body;
      if (fileRequest.headers.some(x => x.key == "Content-Type")) {
        request.headers = fileRequest.headers;  
      } else {
        request.headers = [...request.headers, ...fileRequest.headers];
      }
    } catch {
      logger.debug(`Failed to lstat file/url parameter - ${urlOrFilePath}. Assuming url`);
      request.url = urlOrFilePath;
    }
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
      request.headers.push({ key: headerKey, value: headerValue });
    };
    if(Array.isArray(args.h)) {
      for(let h of args.h) {
        appendHeader(h);
      }
    } else {
      appendHeader(args.h);
    }
  }

  logger.info(`${request.method} ${request.url}...`);
  logger.debug("Request headers: ", request.headers);
  if(request.body)
    logger.debug("Request body: ", request.body);

  let timestamp = new Date();
  let response = await fetch(request.url, {
    method: request.method,
    //body: request.body ?? undefined,
    headers: request.headers.reduce((acc, x) => { 
      if(!acc) {
        acc = new Headers();
      }
      acc.append(x.key, x.value);
      return acc;
    })
  });

  let elapsed = new Date() - timestamp;
  logger.info(`Status ${response.status} obtained in ${elapsed}ms`);

  let responseBody = await response.text();

  if (args.s) {
    if (args.s != response.status) {
      logger.error(`Response status code (${response.status}) doesn't match expected value (${args.s})`);
      Deno.exit(1);
    }
  }

  if (args.t) {
    if (!responseBody.includes(args.t)) {
      logger.error(`Response body doesn't contain expected text (${args.t})`);
      Deno.exit(1);
    }
  }

  try {
    responseBody = JSON.parse(responseBody);
  } catch {
    logger.warning("Non JSON response received!");
  }

  if (args.v) {
    logger.info("Response headers:");
    for(let header of response.headers.entries()) {
      logger.info(`${header[0]}: ${header[1]}`);
    }
  }

  if (responseBody) {
    if (args.o) {
      await Deno.writeTextFile(args.o, responseBody);
      logger.info(`Response body written to file ${args.o}`);
    } else {
      responseBody = Deno.inspect(responseBody, { colors: true });
      logger.info(responseBody);
    }
  } else {
    logger.debug("No response body returned from server");
  }

  // TODO: handle environments and variable replacement
}

export default {
  execute: async (args) => await sendRequest(args),
  match: (args) => true,
};
