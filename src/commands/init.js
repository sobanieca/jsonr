import logger from "../logger.js";

const generateTemplate = (urlOrFile) =>
  `// Run with: deno run -A jsonr-script.js

import { jsonr } from "jsr:@sobanieca/jsonr/sdk";

const response = await jsonr('${urlOrFile}', {
  headers: { "Authorization": "Bearer token" },
  // environment: "./env.json",
  input: { "key": "value" },
  // status: 204,
  // text: "success",
  // method: "POST",
  // body: { data: "example" },
  verbose: false,
  raw: false,
  followRedirects: false,
  // output: "./response.json",
  omitDefaultContentTypeHeader: false,
  js: false,
});

console.log("Status:", response.status);
console.log("Status Text:", response.statusText);
console.log("Elapsed:", response.elapsed, "ms");
console.log("Body:", response.body);

for (const [key, value] of response.headers.entries()) {
  console.log(\`Header \${key}: \${value}\`);
}

if (response.status !== 200) {
  console.log("Non 200 response status received");
}
`;

export default {
  execute: async (args) => {
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
  },
  match: (args) => args._[0] === "init",
};
