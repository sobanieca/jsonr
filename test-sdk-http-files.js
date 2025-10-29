// Test file for jsonr SDK with .http files
import { jsonr } from "./mod.js";

console.log("Testing jsonr SDK with .http files...\n");

// Test 1: Using .http file directly
console.log("Test 1: Using .http file");
try {
  const response1 = await jsonr("test/requests/get.http");
  console.log("✓ Response from .http file:", response1);
  console.log();
} catch (err) {
  console.error("✗ Test 1 failed:", err.message);
  console.log();
}

// Test 2: Using .http file with variables
console.log("Test 2: .http file with input variables");
// First, create a test .http file with variables
await Deno.writeTextFile(
  "test-with-vars.http",
  `GET https://jsonplaceholder.typicode.com/posts/@@postId@@`,
);

try {
  const response2 = await jsonr("test-with-vars.http", {
    input: {
      postId: "1",
    },
  });
  console.log("✓ Response with variable substitution:", response2);
  console.log();
} catch (err) {
  console.error("✗ Test 2 failed:", err.message);
  console.log();
}

// Test 3: Using environment file
console.log("Test 3: .http file with environment file");
// Create environment file
await Deno.writeTextFile(
  "test-env.json",
  JSON.stringify({
    apiUrl: "jsonplaceholder.typicode.com",
    postId: "2",
  }),
);

// Create .http file using environment variables
await Deno.writeTextFile(
  "test-with-env.http",
  `GET https://@@apiUrl@@/posts/@@postId@@`,
);

try {
  const response3 = await jsonr("test-with-env.http", {
    environment: "test-env.json",
  });
  console.log("✓ Response with environment variables:", response3);
  console.log();
} catch (err) {
  console.error("✗ Test 3 failed:", err.message);
  console.log();
}

// Test 4: Overriding environment variables with input
console.log("Test 4: Override environment with input");
try {
  const response4 = await jsonr("test-with-env.http", {
    environment: "test-env.json",
    input: {
      postId: "3", // Override postId from environment
    },
  });
  console.log("✓ Response with overridden variables:", response4);
  console.log();
} catch (err) {
  console.error("✗ Test 4 failed:", err.message);
  console.log();
}

// Test 5: POST with .http file
console.log("Test 5: POST with .http file and body");
await Deno.writeTextFile(
  "test-post.http",
  `POST https://jsonplaceholder.typicode.com/posts

{
  "title": "SDK Test Post",
  "body": "Testing the SDK",
  "userId": 1
}`,
);

try {
  const response5 = await jsonr("test-post.http", {
    status: 201, // Assert created status
  });
  console.log("✓ POST response:", response5);
  console.log();
} catch (err) {
  console.error("✗ Test 5 failed:", err.message);
  console.log();
}

// Test 6: Complete chaining example from todo.md
console.log("Test 6: Complete chaining example");
await Deno.writeTextFile(
  "test-create-user.http",
  `POST https://jsonplaceholder.typicode.com/users

{
  "name": "Test User",
  "username": "testuser",
  "email": "test@test.com"
}`,
);

await Deno.writeTextFile(
  "test-get-user.http",
  `GET https://jsonplaceholder.typicode.com/users/@@userId@@`,
);

try {
  // First request - create a user
  const createResponse = await jsonr("test-create-user.http");
  console.log("✓ Created user with id:", createResponse.id);

  // Second request - get user details using id from first request
  const getUserResponse = await jsonr("test-get-user.http", {
    input: {
      userId: createResponse.id.toString(),
    },
  });
  console.log("✓ Retrieved user:", getUserResponse);
  console.log("✓ Chaining with .http files works!");
  console.log();
} catch (err) {
  console.error("✗ Test 6 failed:", err.message);
  console.log();
}

// Cleanup test files
console.log("Cleaning up test files...");
await Deno.remove("test-with-vars.http");
await Deno.remove("test-env.json");
await Deno.remove("test-with-env.http");
await Deno.remove("test-post.http");
await Deno.remove("test-create-user.http");
await Deno.remove("test-get-user.http");

console.log("All .http file tests completed!");
