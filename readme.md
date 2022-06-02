# About

Simple CLI tool for sending HTTP JSON requests.

With jsonr you can create collection of requests (for instance inside GIT
repository) and easily use them. This tool is supposed to be very simple to use
and already provide you with all utilities need to play with JSON HTTP API's.
Run `jsonr --help` for details.

## Prerequisites

Deno runtime environment `https://deno.land`

## Installation

`deno install --allow-net --allow-read -n jsonr https://deno.land/x/jsonr/src/main.js`

If you plan to write output of response to files (`-o` parameter, check `jsonr --help` for details):

`deno install --allow-net --allow-read --allow-write -n jsonr https://deno.land/x/jsonr/src/main.js`

If your requests are failing due to certificate validation errors (and you trust target server):

`deno install --unsafely-ignore-certificate-errors ...`

## Usage

Sample usage:

`jsonr -h "Authorization: Bearer MyToken" my-request.http`

`my-request.http` file content:

```
POST http://my-api.com/endpoint

{
  "someKey": "someValue"
}
```

Type `jsonr --help` for more details on usage once you have a tool installed.

## Contribution

If you want to implement/request new features, please keep in
mind that this tool is supposed to be super simple to use and cover ~80% of 
use cases for playing around with JSON HTTP API's. Instructions (--help) for 
this tool should be possible to read in less than 5 minutes. If more features will be
added this may be hard to achieve.
