let help = await Deno.readTextFile("../docs/help.txt");
let readmeTemplate = await Deno.readTextFile("../docs/readme-template.md");

readme = readmeTemplate.replaceAll("@@usage@@", help);

await Deno.writeTextFile("../readme.md", readme);

