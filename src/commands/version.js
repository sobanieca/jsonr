const version = "1.4.0";

export default {
  execute: () => console.log(version),
  match: (args) => args.version ? true : false,
};
