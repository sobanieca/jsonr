import { sendRequestCore } from "./commands/send-request.js";
import logger from "./logger.js";

export async function jsonr(filePathOrUrl, options = {}) {
  const args = {
    _: [filePathOrUrl],
    headers: undefined,
    environment: undefined,
    input: undefined,
    status: undefined,
    text: undefined,
    method: undefined,
    body: undefined,
    verbose: false,
    raw: false,
    "follow-redirects": false,
    output: undefined,
    "omit-default-content-type-header": false,
    js: false,
  };

  if (options.headers) {
    args.headers = [];
    for (const [key, value] of Object.entries(options.headers)) {
      args.headers.push(`${key}: ${value}`);
    }
  }

  if (options.environment) {
    args.environment = options.environment;
  }

  if (options.inputVariables) {
    args.input = [];
    for (const [key, value] of Object.entries(options.inputVariables)) {
      args.input.push(`${key}: ${value}`);
    }
  }

  if (options.status !== undefined) {
    args.status = options.status;
  }

  if (options.text !== undefined) {
    args.text = options.text;
  }

  if (options.method) {
    args.method = options.method;
  }

  if (options.body !== undefined) {
    args.body = typeof options.body === "string"
      ? options.body
      : JSON.stringify(options.body);
  }

  if (options.verbose) {
    args.verbose = true;
  }

  if (options.raw) {
    args.raw = true;
  }

  if (options.followRedirects) {
    args["follow-redirects"] = true;
  }

  if (options.output) {
    args.output = options.output;
  }

  if (options.omitDefaultContentTypeHeader) {
    args["omit-default-content-type-header"] = true;
  }

  if (options.js) {
    args.js = true;
  }

  try {
    const response = await sendRequestCore(args);
    return response;
  } catch (err) {
    logger.error(err instanceof Error ? err.message : String(err));
    throw err;
  }
}
