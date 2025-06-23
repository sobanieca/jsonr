import { version } from "../version.js";

export default {
  execute: () => console.log(version),
  match: (args) => args.version ? true : false,
};
