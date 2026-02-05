// @ts-nocheck: jsonr specific script file
// This script tests that headers from environment config are merged
// with headers provided in the script options.
// traceId and x-tenant should come from environment, x-custom from script options.
const response = await jsonr("echo-headers.http", {
  headers: { "x-custom": "script-value" },
});

console.log("Response:", response.body);
console.log("Status:", response.status);
