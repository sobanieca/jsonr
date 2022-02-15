const usage = await Deno.readTextFile("../docs/usage.txt");
const readmeTemplate = await Deno.readTextFile("../docs/readme-template.md");
const helpTemplate = await Deno.readTextFile("../docs/help-template");

const readme = readmeTemplate.replaceAll("@@usage@@", usage);

await Deno.writeTextFile("../readme.md", readme);

const help = helpTemplate.replaceAll("@@help@@", usage);

await Deno.writeTextFile("../src/help.js", help);

