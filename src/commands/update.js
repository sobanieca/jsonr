import logger from "../logger.js";

export default {
  execute: async () => {
    logger.info("Updating jsonr to the latest version...");
    logger.info("");

    const command = new Deno.Command("deno", {
      args: [
        "install",
        "-g",
        "--allow-write",
        "--allow-net",
        "--allow-read",
        "-f",
        "-r",
        "-n",
        "jsonr",
        "jsr:@sobanieca/jsonr",
      ],
      stdout: "inherit",
      stderr: "inherit",
    });

    const { code } = await command.output();

    if (code === 0) {
      logger.info("");
      logger.info("jsonr has been updated successfully!");
    } else {
      logger.error("");
      logger.error("Failed to update jsonr");
      Deno.exit(1);
    }
  },
  match: (args) => args._[0] === "update",
};
