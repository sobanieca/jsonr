import logger from "../logger.js";
import { jsonr } from "../sdk.js";

const generateTemplate = (urlOrFile) =>
  `// Run with: jsonr run jsonr-script.js

const response = await jsonr('${urlOrFile}', {
  // Headers to include in the request
  headers: { "Authorization": "Bearer token" },

  // Environment name from jsonr-config.json (e.g., "prod", "dev")
  // environment: "prod",

  // Input variables for @@variable@@ replacement in .http files
  inputVariables: { "key": "value" },

  // Expected response status code (assertion)
  // status: 200,

  // Expected text in response body (assertion)
  // text: "success",

  // HTTP method (GET, POST, PUT, DELETE, etc.)
  // method: "POST",

  // Request body (object or string)
  // body: { data: "example" },

  // Enable verbose output (show headers)
  // verbose: true,

  // Raw mode (don't strip whitespace from request body)
  // raw: true,

  // Follow HTTP redirects
  // followRedirects: true,

  // Save response to file
  // output: "./response.json",

  // Omit default Content-Type: application/json header
  // omitDefaultContentTypeHeader: true,

  // Treat body as JavaScript object literal (not strict JSON)
  // js: true,
});

console.log("Status:", response.status);
console.log("Status Text:", response.statusText);
console.log("Elapsed:", response.elapsed, "ms");
console.log("Body:", response.body);

for (const [key, value] of response.headers.entries()) {
  console.log(\`Header \${key}: \${value}\`);
}

`;

const executeInit = async (args) => {
  const filename = "jsonr-script.js";

  try {
    await Deno.stat(filename);
    logger.error(`Error: ${filename} already exists`);
    Deno.exit(1);
  } catch (err) {
    if (!(err instanceof Deno.errors.NotFound)) {
      throw err;
    }
  }

  const urlOrFile = args._[1] || "url or http file";
  const sdkTemplate = generateTemplate(urlOrFile);

  try {
    await Deno.writeTextFile(filename, sdkTemplate);
    console.log(`Created ${filename} with jsonr SDK template`);
  } catch (err) {
    throw new Error(
      `Failed to create ${filename}: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
};

const executeScript = async (args) => {
  const scriptPath = args._[1];

  if (!scriptPath) {
    throw new Error("Script path is required. Usage: jsonr run script.js");
  }

  try {
    await Deno.lstat(scriptPath);
  } catch (err) {
    if (err instanceof Deno.errors.NotFound) {
      throw new Error(`Script file not found: ${scriptPath}`);
    }
    throw err;
  }

  logger.debug(`Executing script: ${scriptPath}`);

  try {
    const absolutePath = scriptPath.startsWith("/")
      ? scriptPath
      : `${Deno.cwd()}/${scriptPath}`;

    // @ts-ignore: Expose jsonr SDK to the script
    globalThis.jsonr = jsonr;

    const fileUrl = new URL(`file://${absolutePath}`).href;
    await import(fileUrl);

    // @ts-ignore: Expose jsonr SDK to the script
    delete globalThis.jsonr;
  } catch (err) {
    throw new Error(
      `Failed to execute script: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
};

export default {
  execute: async (args) => {
    if (args.init === true) {
      await executeInit(args);
    } else {
      await executeScript(args);
    }
  },
  match: (args) => args._[0] === "run",
};
