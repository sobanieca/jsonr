const version = "1.0.0";

export default {
  execute: () => console.log(version),
  match: (args) => args.version ? true : false,
};
