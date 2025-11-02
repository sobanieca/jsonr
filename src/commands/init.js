const generateTemplate = (urlOrFile) => `// Run with: deno run --allow-write --allow-net --allow-read jsonr-script.ts

import { jsonr } from "jsr:@sobanieca/jsonr/sdk";

const response = await jsonr('${urlOrFile}');

if (response.status !== 200) {
  console.log("Non 200 response status received");
}
`;

export default {
  execute: async (args) => {
    const filename = "jsonr-script.ts";
    // Get the URL/file from --init argument or use default placeholder
    const urlOrFile = args["init"] || 'url or http file';
    const sdkTemplate = generateTemplate(urlOrFile);

    try {
      await Deno.writeTextFile(filename, sdkTemplate);
      console.log(`Created ${filename} with jsonr SDK template`);
    } catch (err) {
      throw new Error(
        `Failed to create ${filename}: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  },
  match: (args) => args["init"] !== undefined,
};
