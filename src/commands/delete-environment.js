export default {
  execute: (args) => console.log("Delete environment..."),
  match: (args) => args["_"]?.join(";").toLowerCase() == "delete;environment"
}

