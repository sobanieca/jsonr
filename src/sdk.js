import { sendRequestCore } from "./commands/send-request.js";
import logger from "./logger.js";

export async function jsonr(filePathOrUrl, options = {}) {
  const args = {
    _: [filePathOrUrl],
    headers: undefined,
    environment: undefined,
    inputVariables: undefined,
    status: undefined,
    text: undefined,
    method: undefined,
    body: undefined,
    verbose: false,
    raw: false,
    followRedirects: false,
    output: undefined,
    omitDefaultContentTypeHeader: false,
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
    args.inputVariables = [];
    for (const [key, value] of Object.entries(options.inputVariables)) {
      args.inputVariables.push(`${key}: ${value}`);
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
    args.followRedirects = true;
  }

  if (options.output) {
    args.output = options.output;
  }

  if (options.omitDefaultContentTypeHeader) {
    args.omitDefaultContentTypeHeader = true;
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
