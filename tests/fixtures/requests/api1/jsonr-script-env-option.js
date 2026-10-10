// @ts-nocheck: jsonr specific script file
// This script tests that the `environment` option passed to jsonr() in a script
// is honored just like the CLI -e flag: it should apply the environment's
// inputVariables (baseUrl), headers (x-env-header) and secrets.
const response = await jsonr("get-user.http", {
  environment: "test",
  inputVariables: { userId: "42" },
});

console.log("Response:", response.body);
console.log("Status:", response.status);
