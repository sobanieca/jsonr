const version = "0.1.4";

export default {
  execute: () => console.log(version),
  match: (args) => args.version ? true : false,
};
