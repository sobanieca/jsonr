const help = `
Sample command:

jsonr -h "Authorization: Bearer ..." -m POST ./sample.http

Parameters:

path to .http file name or url

  You can use .http files (utf-8 encoded, RFC 2616 standard content) to specify your requests or don't use additional files at all and provide url that should get called.

  EXAMPLE

  jsonr ./sample.http
  jsonr http://jsonapi.com/values

  .http files have following sample structure:

  POST http://www.my-api.com/values
  TrackingId: my-random-tracking-id

  {
    "username" : "sample.email@sample.com"
  }

  First line represents http method + url. Below there are http headers and at the bottom (after two empty lines) request body. 
  If, for any reason, you don't want to create http file you can provide valid url value and use other parameters to provide more details for the request. 
  If you use http file, keep in mind that you can still use parameters to override some of the requests properties defined in http file.
  Http files can include comments. In order to provide comment start a new line with '#' or '//'.

-i provide value for [i]nput variables

  Input variables allow you to specify variables for url, headers or request body parts. Simply put @@variable-name@@ inside .http file. 
  This will allow to either provide it's value via -i flag, or via environment file option (read further)

  EXAMPLE of sample.http file content with variables:

  POST http://my-api.com
  Authorization: Bearer 123

  {
    "username": "@@variable@@"
  }

  Input variables work as a simple text replacement (case sensitive).

  For such sample file, you can run:

  jsonr -i "variable: someuser@email.com" ./sample.http

  If you have many input variables, use many -i flags:

  jsonr -i "variable1: a" -i "variable2: b" ./some-other-sample.http

-h provide value for additional [h]eaders

  If there are additional headers that you want to append to the request you can use this parameter. If there are many headers you want to append, use many -h flags:

  jsonr -h "Authorization: Bearer 123" -h "TrackingId: xyz" ./sample.http

-s expected response [s]tatus code

  If you provide this parameter jsonr will perform assertion against returned response status code. This is useful if you want to create smoke tests scripts.
  You can for instance  write a script with multiple requests:
  
  jsonr -s 200 ./request1.http
  jsonr -s 204 ./request2.http

  jsonr will return non-zero exit code if assertion failed, so you can prepare a script that will report error if any of the requests fail.

-t expected [t]ext that should be contained within response body

  This parameter works in a very similar way as the -s param. With one remark - it checks response body and searches if it's response contains specified text.
  It's a simple text search, no regular expressions available. If text is not contained - jsonr will report error. It may be useful for smoke tests scripts.

-e [e]nvironment file path

  Environment file a json file with variables and their values (similar to -i parameter) it allows you to reuse existing .http files.
  For instance you can have following sample.http file:

  POST https://@@apiUrl@@/value

  {
    "username": "user@email.com"
  }

  Now, you can create environment file test.json:

  {
    "apiUrl": "my-api-on-test-environment.com"
  }

  And use it later as:

  jsonr -e ./test.json ./sample.http

-m HTTP [m]ethod

  Specify http method, like:

  jsonr -m POST ./sample.http
  jsonr -m GET http://localhost:3000/api/users

  Default (if nothing found in .http file and no parameter provided) - GET

-v [v]erbose mode

  Provide more details in output (output request and response headers). It may be useful for reporting issues with endpoints

-r request [r]aw mode

  By default jsonr replaces all new line and tab characters (whitespace characters) in http file so you can use new lines for human-friendly request body formatting. 
  If you use this flag you will disable this behaviour.

--debug Debug mode 

  Provide more detailed logs (use it only for troubleshooting)

-b Request [b]ody (if not willing to use http file)

  EXAMPLE
  jsonr -m POST -b '{ "username": "user@email.com" }' http://myapi.com/values

--omit-default-content-type-header 

  By default jsonr will append "Content-Type: application/json" header to all requests so you don't need to repeat it. Use this option to disable this behavior.

--help 

  Display this help text

--version 

  Display version info

-o [o]utput file for response json, if this parameter is not provided default output is stdout. 

  WARNING: If file exists it will overwrite it.

  EXAMPLE: jsonr ... -o my-response 
  Saves to ./my-response.json, overwrites file if it already exists!
`;

export default {
  execute: () => console.log(help),
  match: (args) => args.help ? true : false,
};
