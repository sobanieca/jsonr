export default {
  execute: (args) => console.log("Delete environment..."),
  match: (args) => args["_"]?.slice(0, 2)?.join(";").toLowerCase() == "delete;environment"
}

