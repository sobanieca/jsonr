import { version } from "../version.js";

export default {
  execute: () => console.log(version),
  match: (args) => args._[0] === "version" || args.version === true,
};
