import logger from "../logger.js";

export default {
  execute: async (args) => {
    if (args.deno) {
      logger.info("Updating jsonr to the latest version...");
      logger.info("");

      const command = new Deno.Command("deno", {
        args: [
          "install",
          "-g",
          "--allow-write",
          "--allow-net",
          "--allow-read",
          "--allow-env=HOME,USERPROFILE",
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
    } else {
      logger.info("To update jsonr to the latest version, run:");
      logger.info("");
      logger.info(
        "  deno install -g --allow-write --allow-net --allow-read --allow-env=HOME,USERPROFILE -f -r -n jsonr jsr:@sobanieca/jsonr",
      );
      logger.info("");
      logger.info("Or use deno updater:");
      logger.info("  jsonr update --deno");
      logger.info(
        "  (This will ask for run permission and perform the update)",
      );
      logger.info("");
      logger.info("For standalone binaries, run the install script:");
      logger.info(
        "  curl -fsSL sobanieca.github.io/jsonr/install.sh | bash",
      );
      logger.info("");
      logger.info("Or download manually from:");
      logger.info("  https://github.com/sobanieca/jsonr/releases/latest");
    }
  },
  match: (args) => args._[0] === "update",
};
