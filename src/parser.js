import parseHelp from "./parsers/help.js";

export default (args) => {
  let command = parseHelp(args, {});

  return command
}

