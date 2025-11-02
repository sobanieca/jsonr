const sdkTemplate = `import { jsonr } from "jsr:@sobanieca/jsonr/sdk";

const response = await jsonr('url or http file');

if (response.status !== 200) {
  console.log("Non 200 response status received");
}
`;

export default {
  execute: async () => {
    const filename = "jsonr-sdk.js";
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
  match: (args) => args["sdk-init"] ? true : false,
};
