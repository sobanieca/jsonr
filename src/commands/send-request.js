import logger from "../logger.js";

/*
 * Available args:
 * input (i) input variable -i "variable1: abc"
 * headers (h) header -h "auth: abc"
 * status (s) expected response status code -s 200
 * text (t) expected text in response -t "abc"
 * environment (e) environment file path -e "./file.json"
 * method (m) http method -m POST
 * verbose (v) verbose - more details like response headers
 * body (b) body -b '{ test: "123" }'
 * --omit-default-content-type-header
 * output (o) output file -o output.json
 * raw (r) request raw mode
 * follow-redirects (f) follow redirects
 * input http file / url
 */

const getHeaderValues = (header) => {
  const [headerKey, ...headersValues] = header.split(":");
  const headerValue = headersValues?.join(":");
  return { key: headerKey?.trim(), value: headerValue?.trim() };
};

const parseHttpFile = async (filePath, variables, rawMode) => {
  logger.debug(`Attempting to read request data from file: ${filePath}`);
  try {
    let fileContent = await Deno.readTextFile(filePath);
    for (const [key, value] of variables) {
      logger.debug(
        `Replacing @@${key}@@ with ${value} for content of ${filePath}`,
      );
      fileContent = fileContent.replaceAll(`@@${key}@@`, value);
    }
    fileContent = removeComments(fileContent);
    let [mainPart, bodyPart] = fileContent.split(/\r?\n\r?\n/);

    const request = {};

    const [mainLine, ...headers] = mainPart.split(/\r?\n/);

    const [method, url] = mainLine.split(" ").map((x) => x.trim());

    logger.debug(`Read following method: ${method} and url: ${url}`);
    request.method = method;
    request.url = url;
    request.headers = [];

    if (headers && headers.length > 0) {
      for (const header of headers) {
        if (header) {
          const headerValues = getHeaderValues(header);
          request.headers.push(headerValues);
        }
      }
    }

    if (bodyPart) {
      logger.debug(`Read following request body: ${bodyPart}`);
      if (!rawMode) {
        bodyPart = bodyPart.replace(/\r?\n|\t/g, "");
      }
      request.body = bodyPart;
    }

    return request;
  } catch (err) {
    logger.debug(`Error when parsing file: ${err}`);
    throw new Error(
      "Unexpected error occurred when trying to parse http file. Ensure that the file is compatible with RFC2616 standard",
    );
  }
};

const removeComments = (input) => input.replace(/(\r?\n|^)(#|\/\/).*$/gm, "");

const getVariables = async (args) => {
  const result = new Map();
  if (args.environment) {
    const environmentFilePath = args.environment;
    try {
      const environmentFileVariables = JSON.parse(
        await Deno.readTextFile(environmentFilePath),
      );
      for (const variable of Object.keys(environmentFileVariables)) {
        result.set(variable, environmentFileVariables[variable]);
      }
    } catch (err) {
      logger.debug(err);
      logger.error(
        `There was a problem when reading variables for environment file ${environmentFilePath}. Ensure that the file exists and contains proper JSON structure. Refer to --help for details.`,
      );
    }
  }

  const setInputVariable = (variable) => {
    const [key, value] = variable.split(":").map((x) => x.trim());
    result.set(key, value);
  };

  if (args.input) {
    if (Array.isArray(args.input)) {
      for (const inputVariable of args.input) {
        setInputVariable(inputVariable);
      }
    } else {
      setInputVariable(args.input);
    }
  }

  return result;
};

export const sendRequestCore = async (args) => {
  const request = {
    method: "GET",
    headers: [{ key: "Content-Type", value: "application/json" }],
    body: "",
    url: "",
  };

  if (args["omit-default-content-type-header"]) {
    logger.debug(
      "Parameter --omit-default-content-type-header provided - removing default Content-Type header",
    );
    request.headers = [];
  }

  if (args["_"].length != 1) {
    throw new Error(
      "Invalid parameters provided. Provide exactly one url or .http file path.",
    );
  }

  const urlOrFilePath = args["_"][0];
  if (
    urlOrFilePath.startsWith("http://") || urlOrFilePath.startsWith("https://")
  ) {
    logger.debug(
      "http(s):// at the beginning of the file/url parameter detected. Assuming url.",
    );
    request.url = urlOrFilePath;
  } else {
    try {
      await Deno.lstat(urlOrFilePath);
      logger.debug(`File ${urlOrFilePath} found. Parsing http file content.`);
      const variables = await getVariables(args);
      const fileRequest = await parseHttpFile(
        urlOrFilePath,
        variables,
        args.raw,
      );
      request.method = fileRequest.method;
      request.url = fileRequest.url;
      request.body = fileRequest.body;
      if (fileRequest.headers.some((x) => x.key == "Content-Type")) {
        request.headers = fileRequest.headers;
      } else {
        request.headers = [...request.headers, ...fileRequest.headers];
      }
    } catch (err) {
      logger.debug(
        `Failed to lstat file/url parameter - ${urlOrFilePath}. Assuming url. Error: ${err}`,
      );
      request.url = urlOrFilePath;
    }
  }

  if (args.method) {
    logger.debug(
      `Parameter [m]ethod provided - HTTP method set to ${args.method}`,
    );
    request.method = args.method;
  }

  if (args.body) {
    logger.debug(`Parameter [b]ody provided - HTTP body set to ${args.body}`);
    request.body = args.body;
  }

  if (args.headers) {
    const appendHeader = (headerArg) => {
      logger.debug(`Adding ${headerArg} header to request`);
      const headerValues = getHeaderValues(headerArg);
      request.headers.push(headerValues);
    };
    if (Array.isArray(args.headers)) {
      for (const h of args.headers) {
        appendHeader(h);
      }
    } else {
      appendHeader(args.headers);
    }
  }

  logger.info(`${request.method} ${request.url}...`);
  let requestLog = (msg) => logger.debug(msg);

  if (args.verbose) {
    requestLog = (msg) => logger.info(msg);
  }

  let redirect = "manual";

  if (args["follow-redirects"]) {
    redirect = "follow";
  }

  requestLog("Request:");
  request.headers.forEach((x) => requestLog(`${x.key}: ${x.value}`));
  requestLog("");
  if (request.body) {
    requestLog(request.body);
  }

  const timestamp = new Date();
  const options = {
    method: request.method,
    body: request.body,
    redirect,
    headers: request.headers.reduce((acc, x) => {
      if (!acc) {
        // @ts-ignore too strict typing
        acc = new Headers();
      }
      acc.append(x.key, x.value);
      return acc;
    }, null),
  };
  if (!request.body || !request.body.trim()) {
    logger.debug("No request body provided, removing it from request object.");
    delete options.body;
  }

  request.url =
    request.url.startsWith("http://") || request.url.startsWith("https://")
      ? request.url
      : `http://${request.url}`;

  // @ts-ignore too strict typing
  const response = await fetch(request.url, options);

  // @ts-ignore timestamp is Date type
  const elapsed = new Date() - timestamp;

  let responseBody = await response.text();

  if (responseBody.trim()) {
    try {
      responseBody = JSON.parse(responseBody);
    } catch (err) {
      logger.debug("Exception thrown when parsing response body as JSON");
      logger.debug(err);
    }
  }

  const originalResponseBody = responseBody;

  logger.info("Response:");
  logger.info("");
  if (args.verbose) {
    for (const header of response.headers.entries()) {
      logger.info(`${header[0]}: ${header[1]}`);
    }
  }

  if (responseBody) {
    if (args.output) {
      await Deno.writeTextFile(args.output, JSON.stringify(responseBody));
      logger.info(`Response body written to file ${args.output}`);
    } else {
      responseBody = Deno.inspect(
        responseBody,
        {
          colors: true,
          strAbbreviateSize: 256000,
          iterableLimit: 20000,
          depth: 100,
        },
      );
      logger.info(responseBody);
    }
  } else {
    logger.info("No response body returned from server");
  }

  logger.info(
    `${response.status} - ${response.statusText} obtained in ${elapsed}ms`,
  );

  if (args.status) {
    if (args.status != response.status) {
      logger.error(
        `ERROR: Response status code (${response.status}) doesn't match expected value (${args.status})`,
      );
      Deno.exit(1);
    }
  }

  if (args.text) {
    const bodyText = typeof originalResponseBody === "string"
      ? originalResponseBody
      : JSON.stringify(originalResponseBody);
    if (!bodyText.includes(args.text)) {
      logger.error(
        `ERROR: Response body doesn't contain expected text (${args.text})`,
      );
      Deno.exit(1);
    }
  }

  return {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
    body: originalResponseBody,
    elapsed,
  };
};

const sendRequest = async (args) => {
  await sendRequestCore(args);
};

export default {
  execute: async (args) => await sendRequest(args),
  match: () => true,
};
