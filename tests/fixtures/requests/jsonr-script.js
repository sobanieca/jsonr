// @ts-nocheck: jsonr specific script file
const response = await jsonr("http://localhost:3000/sample");

console.log("Response:", response.body);
console.log("Status:", response.status);
