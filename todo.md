# Main goal

Implement a new feature in jsonr. jsonr SDK. It's supposed to allow writing
interaction between API's responses and requests. Basing on already existing
http files, it allows to chain them so basing on response from one request, one
should be able to inject some data into another request. Sample usage:

# Examples

## Sending specific http file

```
import { jsonr } from 'https://jsr.io/@sobanieca/jsonr'

jsonr('some-request.http');
```

As an output one should see regular output from jsonr.

## Overriding some options

```
import { jsonr } from 'https://jsr.io/@sobanieca/jsonr'

jsonr('some-request.http', {
 headers: {
    'Authorization': 'Bearer token123'
 }
});
```

## Using environment variables

Environment files are JSON files with variables and their values (similar to
CLI's `-e` parameter).

```
import { jsonr } from 'https://jsr.io/@sobanieca/jsonr'

// Using environment file
jsonr('some-request.http', {
  environment: './test.json'
});
```

For a .http file like:

```
POST https://@@apiUrl@@/value

{
  "username": "user@email.com"
}
```

With environment file `test.json`:

```json
{
  "apiUrl": "my-api-on-test-environment.com"
}
```

## Overriding environment variables with input

You can combine environment files with input variables to override specific
values:

```
import { jsonr } from 'https://jsr.io/@sobanieca/jsonr'

// Load environment but override specific variables
jsonr('some-request.http', {
  environment: './test.json',
  input: {
    'apiUrl': 'localhost:3000'  // Overrides the apiUrl from test.json
  }
});
```

## Multiple input variables

```
import { jsonr } from 'https://jsr.io/@sobanieca/jsonr'

jsonr('some-request.http', {
  input: {
    'variable1': 'value-a',
    'variable2': 'value-b',
    'username': 'someuser@email.com'
  }
});
```

## Asserting response status

```
import { jsonr } from 'https://jsr.io/@sobanieca/jsonr'

// Assert that response status is 200
jsonr('some-request.http', {
  status: 200
});
```

## Asserting response body contains text

```
import { jsonr } from 'https://jsr.io/@sobanieca/jsonr'

// Assert that response body contains specific text
jsonr('some-request.http', {
  text: 'expected-value-in-response'
});
```

## Specifying HTTP method

```
import { jsonr } from 'https://jsr.io/@sobanieca/jsonr'

// Override method from .http file or specify for URL
jsonr('http://localhost:3000/api/users', {
  method: 'POST'
});
```

## Providing request body

```
import { jsonr } from 'https://jsr.io/@sobanieca/jsonr'

// Provide body directly (useful with URLs instead of .http files)
jsonr('http://myapi.com/values', {
  method: 'POST',
  body: '{ "username": "user@email.com" }'
});
```

## Verbose mode

```
import { jsonr } from 'https://jsr.io/@sobanieca/jsonr'

// Get detailed output with request and response headers
jsonr('some-request.http', {
  verbose: true
});
```

## Raw mode

```
import { jsonr } from 'https://jsr.io/@sobanieca/jsonr'

// Disable whitespace character replacement
jsonr('some-request.http', {
  raw: true
});
```

## Follow redirects

```
import { jsonr } from 'https://jsr.io/@sobanieca/jsonr'

// Automatically follow 3xx redirects
jsonr('some-request.http', {
  followRedirects: true
});
```

## Save response to file

```
import { jsonr } from 'https://jsr.io/@sobanieca/jsonr'

// Save response to output file
jsonr('some-request.http', {
  output: 'my-response'  // Saves to ./my-response.json
});
```

## Omit default Content-Type header

```
import { jsonr } from 'https://jsr.io/@sobanieca/jsonr'

// Disable automatic "Content-Type: application/json" header
jsonr('some-request.http', {
  omitDefaultContentTypeHeader: true
});
```

## Chaining requests

```
import { jsonr } from 'https://jsr.io/@sobanieca/jsonr'

const response1 = await jsonr('some-request.http', {
  headers: {
    'Authorization': 'Bearer token123'
  }
});

await jsonr('more-requests/some-request2.http', {
  input: {
    'orderId': response1.id
  }
});
```

## Complete example with multiple options

```
import { jsonr } from 'https://jsr.io/@sobanieca/jsonr'

const response = await jsonr('api/create-order.http', {
  environment: './environments/test.json',
  input: {
    'userId': '12345',
    'productId': '67890'
  },
  headers: {
    'Authorization': 'Bearer token123',
    'TrackingId': 'xyz'
  },
  status: 201,
  text: 'order created',
  verbose: true,
  followRedirects: true
});

// Use response data in next request
await jsonr('api/get-order.http', {
  environment: './environments/test.json',
  input: {
    'orderId': response.orderId
  },
  status: 200
});
```
