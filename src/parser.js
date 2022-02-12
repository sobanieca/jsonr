import parseHelp from "./parsers/help.js";

export default (args) => {
  let jsonr = parseHelp(args, {});

  return jsonr
}

