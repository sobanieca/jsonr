const help = await Deno.readTextFile("../docs/help.txt");
const readmeTemplate = await Deno.readTextFile("../docs/readme-template.md");
const helpTemplate = await Deno.readTextFile("../docs/help-template.js");

const readme = readmeTemplate.replaceAll("@@help@@", help);

await Deno.writeTextFile("../readme.md", readme);

const helpModule = helpTemplate.replaceAll("@@help@@", help);

await Deno.writeTextFile("../src/help.js", helpModule);

