/**
 * Options for the jsonr SDK
 */
export interface JsonrOptions {
  /** Additional headers to add to the request */
  headers?: Record<string, string>;
  /** Path to environment JSON file */
  environment?: string;
  /** Input variables to replace in the request */
  input?: Record<string, string>;
  /** Expected response status code (assertion) */
  status?: number;
  /** Expected text in response body (assertion) */
  text?: string;
  /** HTTP method (GET, POST, etc.) */
  method?: string;
  /** Request body */
  body?: string;
  /** Enable verbose mode (show headers) */
  verbose?: boolean;
  /** Enable raw mode (don't replace whitespace in .http files) */
  raw?: boolean;
  /** Follow redirects automatically */
  followRedirects?: boolean;
  /** Output file path for response */
  output?: string;
  /** Don't add default Content-Type header */
  omitDefaultContentTypeHeader?: boolean;
}

/**
 * Sends an HTTP request using a .http file or URL
 * @param filePathOrUrl - Path to .http file or a URL
 * @param options - Request options
 * @returns Response body (parsed as JSON if possible)
 */
export function jsonr(
  filePathOrUrl: string,
  options?: JsonrOptions,
): Promise<unknown>;
