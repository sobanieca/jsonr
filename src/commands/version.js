const version = "1.2.2";

export default {
  execute: () => console.log(version),
  match: (args) => args.version ? true : false,
};
