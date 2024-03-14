const version = "1.5.2";

export default {
  execute: () => console.log(version),
  match: (args) => args.version ? true : false,
};
