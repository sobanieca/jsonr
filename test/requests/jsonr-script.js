// @ts-nocheck
const response = await jsonr("http://localhost:3000/sample");

console.log("Response:", response.body);
console.log("Status:", response.status);
