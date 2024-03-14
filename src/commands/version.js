const version = "1.5.3";

export default {
  execute: () => console.log(version),
  match: (args) => args.version ? true : false,
};
