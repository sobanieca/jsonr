/* @ts-self-types="./mod.d.ts" */
import { sendRequestCore } from "./src/commands/send-request.js";
import logger from "./src/logger.js";

/**
 * Sends an HTTP request using a .http file or URL
 * @param {string} filePathOrUrl - Path to .http file or a URL
 * @param {Object} [options={}] - Request options
 * @param {Object<string, string>} [options.headers] - Additional headers to add to the request
 * @param {string} [options.environment] - Path to environment JSON file
 * @param {Object<string, string>} [options.input] - Input variables to replace in the request
 * @param {number} [options.status] - Expected response status code (assertion)
 * @param {string} [options.text] - Expected text in response body (assertion)
 * @param {string} [options.method] - HTTP method (GET, POST, etc.)
 * @param {string} [options.body] - Request body
 * @param {boolean} [options.verbose] - Enable verbose mode (show headers)
 * @param {boolean} [options.raw] - Enable raw mode (don't replace whitespace in .http files)
 * @param {boolean} [options.followRedirects] - Follow redirects automatically
 * @param {string} [options.output] - Output file path for response
 * @param {boolean} [options.omitDefaultContentTypeHeader] - Don't add default Content-Type header
 * @returns {Promise<any>} Response body (parsed as JSON if possible)
 */
export async function jsonr(filePathOrUrl, options = {}) {
  // Convert SDK options to internal args format
  const args = {
    _: [filePathOrUrl],
    h: undefined,
    e: undefined,
    i: undefined,
    s: undefined,
    t: undefined,
    m: undefined,
    b: undefined,
    v: false,
    r: false,
    f: false,
    o: undefined,
    "omit-default-content-type-header": false,
  };

  // Map headers option
  if (options.headers) {
    args.h = [];
    for (const [key, value] of Object.entries(options.headers)) {
      args.h.push(`${key}: ${value}`);
    }
  }

  // Map environment option
  if (options.environment) {
    args.e = options.environment;
  }

  // Map input variables option
  if (options.input) {
    args.i = [];
    for (const [key, value] of Object.entries(options.input)) {
      args.i.push(`${key}: ${value}`);
    }
  }

  // Map assertion options
  if (options.status !== undefined) {
    args.s = options.status;
  }

  if (options.text !== undefined) {
    args.t = options.text;
  }

  // Map request configuration options
  if (options.method) {
    args.m = options.method;
  }

  if (options.body) {
    args.b = options.body;
  }

  // Map boolean flags
  if (options.verbose) {
    args.v = true;
  }

  if (options.raw) {
    args.r = true;
  }

  if (options.followRedirects) {
    args.f = true;
  }

  if (options.output) {
    args.o = options.output;
  }

  if (options.omitDefaultContentTypeHeader) {
    args["omit-default-content-type-header"] = true;
  }

  // Execute the request and return response data
  try {
    const response = await sendRequestCore(args, { returnResponse: true });
    return response.body;
  } catch (err) {
    logger.error(err instanceof Error ? err.message : String(err));
    throw err;
  }
}
