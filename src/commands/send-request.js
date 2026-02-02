import logger from "../logger.js";

const getHeaderValues = (header) => {
  const [headerKey, ...headersValues] = header.split(":");
  const headerValue = headersValues?.join(":");
  return { key: headerKey?.trim(), value: headerValue?.trim() };
};

const parseHttpFile = async (
  filePath,
  variables,
  rawMode,
  ignoreInputValidation,
) => {
  logger.debug(`Attempting to read request data from file: ${filePath}`);
  try {
    let fileContent = await Deno.readTextFile(filePath);
    for (const [key, value] of variables) {
      logger.debug(
        `Replacing @@${key}@@ with ${value} for content of ${filePath}`,
      );
      fileContent = fileContent.replaceAll(`@@${key}@@`, value);
    }

    if (!ignoreInputValidation) {
      const unreplacedVariables = [...fileContent.matchAll(/@@([^@]+)@@/g)];
      if (unreplacedVariables.length > 0) {
        const missingVariableNames = [
          ...new Set(unreplacedVariables.map((match) => match[1])),
        ];
        logger.error(
          `ERROR: Missing required input variable(s): ${
            missingVariableNames.join(", ")
          }. Provide them via -i flag or jsonr-config.json`,
        );
        Deno.exit(1);
      }
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

const convertJsObjectToJson = (jsCode) => {
  let result = jsCode.trim();

  const isInsideString = (str, index) => {
    let inString = false;
    let stringChar = null;
    let escaped = false;

    for (let i = 0; i < index; i++) {
      if (escaped) {
        escaped = false;
        continue;
      }
      if (str[i] === "\\") {
        escaped = true;
        continue;
      }
      if ((str[i] === '"' || str[i] === "'") && !inString) {
        inString = true;
        stringChar = str[i];
      } else if (str[i] === stringChar && inString) {
        inString = false;
        stringChar = null;
      }
    }

    return inString;
  };

  result = result.split("").map((char, index) => {
    if (isInsideString(result, index)) {
      if (char === "'") {
        return '"';
      }
    }
    return char;
  }).join("");

  result = result.replace(/,(\s*[}\]])/g, "$1");

  result = result.replace(
    /([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*:)/g,
    (match, prefix, key, suffix) => {
      const position = result.indexOf(match);
      if (!isInsideString(result, position)) {
        return `${prefix}"${key}"${suffix}`;
      }
      return match;
    },
  );

  return result;
};

const getVariables = (args) => {
  const result = new Map();

  if (
    args.inputVariables && typeof args.inputVariables === "object" &&
    !Array.isArray(args.inputVariables)
  ) {
    for (const [key, value] of Object.entries(args.inputVariables)) {
      result.set(key, value);
    }
  }

  return result;
};

export const sendRequest = async (args) => {
  const request = {
    method: "GET",
    headers: [{ key: "Content-Type", value: "application/json" }],
    body: "",
    url: "",
  };

  if (args.dry) {
    logger.debug("Dry mode enabled - request will be printed but not sent");
    args.verbose = true;
  }

  if (args.omitDefaultContentTypeHeader) {
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

  let urlOrFilePath = args["_"][0];
  const looksLikeFile = urlOrFilePath.endsWith(".http");

  const variables = getVariables(args);
  for (const [key, value] of variables) {
    urlOrFilePath = urlOrFilePath.replaceAll(`@@${key}@@`, value);
  }

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
      const fileRequest = await parseHttpFile(
        urlOrFilePath,
        variables,
        args.raw,
        args.ignoreInputValidation,
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
      if (looksLikeFile && err instanceof Deno.errors.NotFound) {
        logger.error(`ERROR: File not found: ${urlOrFilePath}`);
        Deno.exit(1);
      }

      if (looksLikeFile) {
        throw err;
      }

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
    if (typeof args.body === "object") {
      request.body = JSON.stringify(args.body);
      logger.debug(
        `Parameter [b]ody provided - HTTP body set to ${request.body} (stringified from object)`,
      );
    } else {
      logger.debug(`Parameter [b]ody provided - HTTP body set to ${args.body}`);
      request.body = args.body;
    }
  }

  if (args.js && request.body) {
    logger.debug("JS mode enabled - converting JS object to JSON");
    try {
      request.body = convertJsObjectToJson(request.body);
      JSON.parse(request.body);
      logger.debug(`Converted JS object to JSON: ${request.body}`);
    } catch (err) {
      logger.debug(`Error converting JavaScript body: ${err}`);
      throw new Error(
        "Failed to convert body from JavaScript object to JSON. Ensure the body contains valid JavaScript object literal syntax.",
      );
    }
  }

  if (args.headers && typeof args.headers === "object") {
    for (const [key, value] of Object.entries(args.headers)) {
      logger.debug(`Adding ${key}: ${value} header to request`);
      request.headers.push({ key, value });
    }
  }

  logger.info(`${request.method} ${request.url}...`);
  let requestLog = (msg) => logger.debug(msg);

  if (args.verbose) {
    requestLog = (msg) => logger.info(msg);
  }

  let redirect = "manual";

  if (args.followRedirects) {
    redirect = "follow";
  }

  requestLog("Request:");
  request.headers.forEach((x) => requestLog(`${x.key}: ${x.value}`));
  requestLog("");
  if (request.body) {
    requestLog(request.body);
  }

  if (args.dry) {
    logger.info("Dry mode: Request not sent");
    return null;
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

export default {
  execute: async (args) => await sendRequest(args),
  match: () => true,
};
