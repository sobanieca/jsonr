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

## Overridng some options

```
import { jsonr } from 'https://jsr.io/@sobanieca/jsonr'

jsonr('some-request.http', {
 headers: {
    'Authorization': 'Bearer token123'
 }
});
```

