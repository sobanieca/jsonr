// @ts-nocheck: jsonr specific script file
// This script tests that inputVariables from environment config are merged
// with inputVariables provided in the script options.
// baseUrl should come from environment, userId from script options.
const response = await jsonr("get-user.http", {
  inputVariables: { userId: "42" },
});

console.log("Response:", response.body);
console.log("Status:", response.status);
