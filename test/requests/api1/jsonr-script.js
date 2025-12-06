const response = await jsonr("get-auth.http");

console.log("Response:", response.body);
console.log("Status:", response.status);
