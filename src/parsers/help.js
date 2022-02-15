export default (args, command) => {
  if(args.includes("--help")) {
    command.help = true;
  }

  return command;
}
