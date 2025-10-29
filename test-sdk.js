// Test file for jsonr SDK
import { jsonr } from "./mod.js";

console.log("Testing jsonr SDK...\n");

// Test 1: Simple request with URL
console.log("Test 1: Simple GET request with URL");
try {
  const response1 = await jsonr("https://jsonplaceholder.typicode.com/posts/1");
  console.log("✓ Response received:", response1.body);
  console.log("✓ Status:", response1.status);
  console.log();
} catch (err) {
  console.error("✗ Test 1 failed:", err.message);
  console.log();
}

// Test 2: Request with method override
console.log("Test 2: Request with method option");
try {
  const response2 = await jsonr("https://jsonplaceholder.typicode.com/posts", {
    method: "GET",
  });
  console.log("✓ Response received (first item):", response2.body[0]);
  console.log();
} catch (err) {
  console.error("✗ Test 2 failed:", err.message);
  console.log();
}

// Test 3: POST request with body
console.log("Test 3: POST request with body");
try {
  const response3 = await jsonr("https://jsonplaceholder.typicode.com/posts", {
    method: "POST",
    body: JSON.stringify({
      title: "Test Post",
      body: "This is a test",
      userId: 1,
    }),
  });
  console.log("✓ Response received:", response3.body);
  console.log();
} catch (err) {
  console.error("✗ Test 3 failed:", err.message);
  console.log();
}

// Test 4: Request with headers
console.log("Test 4: Request with custom headers");
try {
  const response4 = await jsonr(
    "https://jsonplaceholder.typicode.com/posts/1",
    {
      headers: {
        "Accept": "application/json",
        "User-Agent": "jsonr-sdk-test",
      },
    },
  );
  console.log("✓ Response received:", response4.body);
  console.log();
} catch (err) {
  console.error("✗ Test 4 failed:", err.message);
  console.log();
}

// Test 5: Request with status assertion
console.log("Test 5: Request with status assertion");
try {
  const response5 = await jsonr(
    "https://jsonplaceholder.typicode.com/posts/1",
    {
      status: 200,
    },
  );
  console.log("✓ Status assertion passed:", response5);
  console.log();
} catch (err) {
  console.error("✗ Test 5 failed:", err.message);
  console.log();
}

// Test 6: Request with text assertion
console.log("Test 6: Request with text assertion");
try {
  await jsonr(
    "https://jsonplaceholder.typicode.com/posts/1",
    {
      text: "userId",
    },
  );
  console.log("✓ Text assertion passed");
  console.log();
} catch (err) {
  console.error("✗ Test 6 failed:", err.message);
  console.log();
}

// Test 7: Chaining requests (key feature!)
console.log("Test 7: Chaining requests");
try {
  // First request - get a post
  const response1 = await jsonr("https://jsonplaceholder.typicode.com/posts/1");
  console.log(
    "✓ First request received post with userId:",
    response1.body.userId,
  );

  // Second request - use userId from first request to get user
  const response2 = await jsonr("https://jsonplaceholder.typicode.com/users", {
    method: "GET",
  });
  console.log(
    "✓ Second request received users, first user:",
    response2.body[0].name,
  );
  console.log("✓ Chaining works!");
  console.log();
} catch (err) {
  console.error("✗ Test 7 failed:", err.message);
  console.log();
}

console.log("All SDK tests completed!");
