const version = "1.3.1";

export default {
  execute: () => console.log(version),
  match: (args) => args.version ? true : false,
};
