import logger from "../logger.js";
import { sendRequest } from "./send-request.js";

const generateTemplate = (urlOrFile) =>
  `// Run with: jsonr run jsonr-script.js

const response = await jsonr('${urlOrFile}', {
  headers: { "Authorization": "Bearer token" },
  environment: "prod",
  inputVariables: { "key": "value" },
  status: 200,
  text: "success",
  method: "POST",
  body: '{"data":"example"}',
  verbose: true,
  raw: false,
  followRedirects: false,
  output: "./response.json",
  omitDefaultContentTypeHeader: false,
  js: false
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
  const template = generateTemplate(urlOrFile);

  try {
    await Deno.writeTextFile(filename, template);
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

    // @ts-ignore: Expose jsonr wrapper to the script
    globalThis.jsonr = (urlOrFile, options = {}) => {
      return sendRequest({ _: [urlOrFile], ...options });
    };

    const fileUrl = new URL(`file://${absolutePath}`).href;
    await import(fileUrl);

    // @ts-ignore: Clean up jsonr from global scope
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
