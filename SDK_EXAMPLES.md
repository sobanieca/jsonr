# jsonr SDK Examples

This document shows how to use jsonr as a JavaScript/TypeScript SDK for
programmatic API testing and request chaining.

## Response Format

The `jsonr()` function returns a promise that resolves to a response object with
the following structure:

```typescript
{
  status: number; // HTTP status code (e.g., 200, 404)
  statusText: string; // HTTP status text (e.g., "OK", "Not Found")
  headers: Headers; // Response headers
  body: unknown; // Response body (parsed as JSON if possible, otherwise string)
  elapsed: number; // Request duration in milliseconds
}
```

Access the response data using the `.body` property, status code using
`.status`, etc.

## Installation

```bash
# Import from JSR (note the /sdk subpath)
import { jsonr } from "https://jsr.io/@sobanieca/jsonr/sdk"

# Or use with Deno locally
import { jsonr } from "./mod.js"
```

## Basic Usage

### Simple GET Request

```javascript
import { jsonr } from "https://jsr.io/@sobanieca/jsonr/sdk";

// Using a .http file
const response = await jsonr("request.http");
console.log(response);

// Using a URL directly
const response2 = await jsonr("https://api.example.com/users");
console.log(response2);
```

### POST Request with Body

```javascript
import { jsonr } from "https://jsr.io/@sobanieca/jsonr/sdk";

const response = await jsonr("https://api.example.com/users", {
  method: "POST",
  body: JSON.stringify({
    name: "John Doe",
    email: "john@example.com",
  }),
});

console.log("Created user:", response);
```

## Request Configuration

### Adding Headers

```javascript
import { jsonr } from "https://jsr.io/@sobanieca/jsonr/sdk";

const response = await jsonr("api/users.http", {
  headers: {
    "Authorization": "Bearer token123",
    "X-Custom-Header": "value",
  },
});
```

### Using Variables

Variables use the `@@variable@@` syntax in .http files and can be provided via
the `input` option.

**example.http:**

```http
POST https://@@apiUrl@@/users

{
  "username": "@@username@@"
}
```

**JavaScript:**

```javascript
import { jsonr } from "https://jsr.io/@sobanieca/jsonr/sdk";

const response = await jsonr("example.http", {
  input: {
    apiUrl: "api.example.com",
    username: "john_doe",
  },
});
```

### Using Environment Files

Environment files are JSON files containing variable definitions.

**test.env.json:**

```json
{
  "apiUrl": "test.api.example.com",
  "apiKey": "test-key-123"
}
```

**request.http:**

```http
GET https://@@apiUrl@@/data
Authorization: Bearer @@apiKey@@
```

**JavaScript:**

```javascript
import { jsonr } from "https://jsr.io/@sobanieca/jsonr/sdk";

const response = await jsonr("request.http", {
  environment: "./test.env.json",
});
```

### Overriding Environment Variables

```javascript
import { jsonr } from "https://jsr.io/@sobanieca/jsonr/sdk";

const response = await jsonr("request.http", {
  environment: "./test.env.json",
  input: {
    apiUrl: "localhost:3000", // Override apiUrl from environment
  },
});
```

## Assertions

### Status Code Assertion

```javascript
import { jsonr } from "https://jsr.io/@sobanieca/jsonr/sdk";

// Will throw an error if status is not 200
const response = await jsonr("api/users.http", {
  status: 200,
});

// Will throw an error if status is not 201
const created = await jsonr("api/create-user.http", {
  status: 201,
});
```

### Response Body Text Assertion

```javascript
import { jsonr } from "https://jsr.io/@sobanieca/jsonr/sdk";

// Will throw an error if response doesn't contain "success"
const response = await jsonr("api/process.http", {
  text: "success",
});
```

### Combined Assertions

```javascript
import { jsonr } from "https://jsr.io/@sobanieca/jsonr/sdk";

const response = await jsonr("api/users.http", {
  status: 200,
  text: "john@example.com",
});
```

## Advanced Options

### Verbose Mode

```javascript
import { jsonr } from "https://jsr.io/@sobanieca/jsonr/sdk";

const response = await jsonr("api/users.http", {
  verbose: true, // Logs request/response headers
});
```

### Raw Mode

```javascript
import { jsonr } from "https://jsr.io/@sobanieca/jsonr/sdk";

const response = await jsonr("request.http", {
  raw: true, // Disables whitespace character replacement
});
```

### Follow Redirects

```javascript
import { jsonr } from "https://jsr.io/@sobanieca/jsonr/sdk";

const response = await jsonr("api/redirect.http", {
  followRedirects: true, // Automatically follow 3xx redirects
});
```

### Save Response to File

```javascript
import { jsonr } from "https://jsr.io/@sobanieca/jsonr/sdk";

const response = await jsonr("api/data.http", {
  output: "response.json", // Saves response to response.json
});
```

### Omit Default Content-Type Header

```javascript
import { jsonr } from "https://jsr.io/@sobanieca/jsonr/sdk";

const response = await jsonr("api/upload.http", {
  omitDefaultContentTypeHeader: true, // Don't add automatic "Content-Type: application/json"
});
```

## Request Chaining

One of the most powerful features of the SDK is the ability to chain requests
and pass data between them.

### Basic Chaining

```javascript
import { jsonr } from "https://jsr.io/@sobanieca/jsonr/sdk";

// First request - create a user
const createResponse = await jsonr("api/create-user.http", {
  body: JSON.stringify({ name: "John Doe" }),
});

// Second request - use the user ID from the first request
const userDetails = await jsonr("api/get-user.http", {
  input: {
    userId: createResponse.body.id,
  },
});

console.log("User details:", userDetails.body);
```

### Complex Chaining Example

```javascript
import { jsonr } from "https://jsr.io/@sobanieca/jsonr/sdk";

// Step 1: Authenticate and get token
const authResponse = await jsonr("auth/login.http", {
  input: {
    username: "admin",
    password: "password123",
  },
  status: 200,
});

// Step 2: Create an order using the auth token
const orderResponse = await jsonr("api/create-order.http", {
  headers: {
    Authorization: `Bearer ${authResponse.body.token}`,
  },
  input: {
    productId: "123",
    quantity: "2",
  },
  status: 201,
});

// Step 3: Verify the order was created
const verifyResponse = await jsonr("api/get-order.http", {
  headers: {
    Authorization: `Bearer ${authResponse.body.token}`,
  },
  input: {
    orderId: orderResponse.body.orderId,
  },
  status: 200,
  text: "confirmed",
});

console.log("Order created and verified:", verifyResponse.body);
```

### Chaining with Environment Variables

**create-user.http:**

```http
POST https://@@apiUrl@@/users

{
  "name": "Test User"
}
```

**get-user.http:**

```http
GET https://@@apiUrl@@/users/@@userId@@
Authorization: Bearer @@token@@
```

**JavaScript:**

```javascript
import { jsonr } from "https://jsr.io/@sobanieca/jsonr/sdk";

const env = {
  environment: "./test.env.json",
};

// Create user
const user = await jsonr("create-user.http", env);

// Get user details
const details = await jsonr("get-user.http", {
  ...env,
  input: {
    userId: user.id, // Override userId with response from first request
  },
});
```

## Error Handling

```javascript
import { jsonr } from "https://jsr.io/@sobanieca/jsonr/sdk";

try {
  const response = await jsonr("api/users.http", {
    status: 200,
    text: "success",
  });
  console.log("Success:", response);
} catch (error) {
  console.error("Request failed:", error.message);
  // Handle error (assertion failed, network error, etc.)
}
```

## Complete Example: E-commerce Test Flow

```javascript
import { jsonr } from "https://jsr.io/@sobanieca/jsonr/sdk";

async function testEcommerceFlow() {
  const config = {
    environment: "./environments/test.json",
  };

  try {
    // 1. Login
    console.log("1. Logging in...");
    const auth = await jsonr("auth/login.http", {
      ...config,
      status: 200,
      text: "token",
    });

    const headers = {
      Authorization: `Bearer ${auth.body.token}`,
    };

    // 2. Get product catalog
    console.log("2. Fetching products...");
    const products = await jsonr("products/list.http", {
      ...config,
      headers,
      status: 200,
    });

    // 3. Add product to cart
    console.log("3. Adding product to cart...");
    const cart = await jsonr("cart/add.http", {
      ...config,
      headers,
      input: {
        productId: products.body[0].id,
        quantity: "2",
      },
      status: 200,
    });

    // 4. Create order
    console.log("4. Creating order...");
    const order = await jsonr("orders/create.http", {
      ...config,
      headers,
      input: {
        cartId: cart.body.id,
      },
      status: 201,
      text: "order created",
    });

    // 5. Verify order
    console.log("5. Verifying order...");
    const orderDetails = await jsonr("orders/get.http", {
      ...config,
      headers,
      input: {
        orderId: order.body.id,
      },
      status: 200,
    });

    console.log("✓ E-commerce flow completed successfully!");
    console.log("Order ID:", orderDetails.body.id);
    console.log("Total:", orderDetails.body.total);
  } catch (error) {
    console.error("✗ E-commerce flow failed:", error.message);
    throw error;
  }
}

// Run the test
await testEcommerceFlow();
```

## Integration with Test Frameworks

### Using with Deno.test

```javascript
import { jsonr } from "https://jsr.io/@sobanieca/jsonr/sdk";
import { assertEquals } from "https://deno.land/std/assert/mod.ts";

Deno.test("User API - Create and retrieve user", async () => {
  // Create user
  const createResponse = await jsonr("api/create-user.http", {
    status: 201,
  });

  assertEquals(typeof createResponse.body.id, "number");

  // Retrieve user
  const getResponse = await jsonr("api/get-user.http", {
    input: {
      userId: createResponse.body.id,
    },
    status: 200,
  });

  assertEquals(getResponse.body.id, createResponse.body.id);
});
```

## Tips and Best Practices

1. **Use Environment Files**: Keep environment-specific configuration in
   separate JSON files
2. **Chain Requests**: Leverage the SDK's ability to pass data between requests
   for complex workflows
3. **Add Assertions**: Use `status` and `text` options to validate responses
   automatically
4. **Reuse .http Files**: The same .http files work for both CLI and SDK usage
5. **Error Handling**: Always wrap requests in try-catch blocks for production
   code
6. **Verbose Mode**: Use verbose mode during debugging to see full
   request/response details
7. **Type Safety**: Import the SDK in TypeScript projects for better IDE support

## See Also

- [CLI Documentation](./src/commands/help.js) - Using jsonr as a CLI tool
- [.http File Format](./README.md) - How to write .http files
