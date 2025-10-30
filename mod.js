/* @ts-self-types="./mod.d.ts" */
import { sendRequestCore } from "./src/commands/send-request.js";
import logger from "./src/logger.js";

export async function jsonr(filePathOrUrl, options = {}) {
  // Convert SDK options to internal args format
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
  };

  // Map headers option
  if (options.headers) {
    args.headers = [];
    for (const [key, value] of Object.entries(options.headers)) {
      args.headers.push(`${key}: ${value}`);
    }
  }

  // Map environment option
  if (options.environment) {
    args.environment = options.environment;
  }

  // Map input variables option
  if (options.input) {
    args.input = [];
    for (const [key, value] of Object.entries(options.input)) {
      args.input.push(`${key}: ${value}`);
    }
  }

  // Map assertion options
  if (options.status !== undefined) {
    args.status = options.status;
  }

  if (options.text !== undefined) {
    args.text = options.text;
  }

  // Map request configuration options
  if (options.method) {
    args.method = options.method;
  }

  if (options.body) {
    args.body = options.body;
  }

  // Map boolean flags
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

  // Execute the request and return response data
  try {
    const response = await sendRequestCore(args);
    return response;
  } catch (err) {
    logger.error(err instanceof Error ? err.message : String(err));
    throw err;
  }
}
