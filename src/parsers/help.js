export default (args, jsonr) => {
  if(args.indexOf("--help") != -1)
    jsonr.help = true;

  return jsonr;
}
