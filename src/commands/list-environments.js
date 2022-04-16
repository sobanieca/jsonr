export default {
  execute: (args) => console.log("Listing environments..."),
  match: (args) => args["_"]?.join(" ").toLowerCase() == "environments list",
};
