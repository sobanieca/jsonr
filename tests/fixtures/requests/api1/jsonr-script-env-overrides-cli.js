// @ts-nocheck: jsonr specific script file
// The environment passed to jsonr() replaces the one selected with -e:
// baseUrl and secrets come from "test", not from "staging".
const response = await jsonr("echo-headers.http", { environment: "test" });

console.log("Response:", response.body);
