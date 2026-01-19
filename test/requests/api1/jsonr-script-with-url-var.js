// @ts-nocheck: jsonr specific script file
const response = await jsonr("@@baseUrl@@/sample");

console.log("Response:", response.body);
console.log("Status:", response.status);
