export default {
  execute: (args) => console.log("Creating environments..."),
  match: (args) => args["_"]?.join(";").toLowerCase() == "create;environment"
}

