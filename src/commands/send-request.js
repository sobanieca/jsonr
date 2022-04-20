const sendRequest = async (args) => {
  console.log("Sending request...");
}

export default {
  execute: async (args) => await sendRequest(args),
  match: (args) => true,
};
