/* @ts-self-types="./mod.d.ts" */
import { sendRequestCore } from "./src/commands/send-request.js";
import logger from "./src/logger.js";

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
    const response = await sendRequestCore(args);
    return response;
  } catch (err) {
    logger.error(err instanceof Error ? err.message : String(err));
    throw err;
  }
}
