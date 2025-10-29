# Main goal

Implement a new feature in jsonr. jsonr SDK. It's supposed to allow writing interaction between API's responses and requests. Basing on already existing http
files, it allows to chain them so basing on response from one request, one should be able to inject some data into another request. Sample usage:

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
