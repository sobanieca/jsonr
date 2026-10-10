// @ts-nocheck: jsonr specific script file
const response = await jsonr("http://localhost:3000/sample", {
  method: "PUT",
  body: { name: "test-object", count: 42 },
});

console.log("Response:", response.body);
console.log("Status:", response.status);
