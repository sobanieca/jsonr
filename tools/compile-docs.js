const help = await Deno.readTextFile("../docs/help.txt");
const readmeTemplate = await Deno.readTextFile("../docs/readme-template.md");

const readme = readmeTemplate.replaceAll("@@usage@@", help);

await Deno.writeTextFile("../readme.md", readme);

