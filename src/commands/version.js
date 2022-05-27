const version = "0.1.0";

export default {
  execute: (args) => console.log(version),
  match: (args) => args.version ? true : false,
};
