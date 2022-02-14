const usage = await Deno.readTextFile("../docs/usage.txt");
const readmeTemplate = await Deno.readTextFile("../docs/readme-template.md");

const readme = readmeTemplate.replaceAll("@@usage@@", usage);

await Deno.writeTextFile("../readme.md", readme);

