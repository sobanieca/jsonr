const version = "1.2.3";

export default {
  execute: () => console.log(version),
  match: (args) => args.version ? true : false,
};
