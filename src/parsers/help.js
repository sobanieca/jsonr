export default (args, jsonr) => {
  if(args.includes("--help")) {
    jsonr.help = true;
  }

  return jsonr;
}
