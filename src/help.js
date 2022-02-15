const help = `
  Sample command:

jsonr -h "Authorization: Bearer ..." -m POST ./sample.http

Parameters:

path to .http file name or url

  You can use .http files to specify your requests or don't use additional files at all and provide url that should get called. This parameter is always the last one.

  EXAMPLE

  jsonr ./sample.http
  jsonr http://jsonapi.com/values
  jsonr -s some -o ther -f lags -t hat -w ill -b e -d escribed -b elow ./last-parameter.http

  .http files have following sample structure:

  POST http://www.my-api.com/values
  TrackingId: my-random-tracking-id

  {
    "username" : "sample.email@sample.com"
  }

  As you can see first line is about http method + url. Below there are http headers listed and at the bottom request body. If, for any reason, you don't want to create http file you can provide valid url value and use other parameters to provie more details for the request. If you use http file, keep in mind that you can still use parameters to override some of the requests properties defined in http file.

-i provide value for [i]nput variables

  Input variables allow you to specify variables for url, headers or request body parts. Simply put @@variable-name@@ inside .http file. This will allow to either provide it's value via -i flag, or via environments option (read further)

  EXAMPLE of sample.http file content with variables:

  POST http://my-api.com
  Authorization: Bearer 123

  {
    "username": "@@variable@@"
  }

  Keep in mind that variables work as a simple text replacement so you need to remember about " char or similar.

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

  This parameter works in a very similar way as the -s param. With one remark - it checks response body and searches if it's response contains specified text. It's a simple text search, no regular expressions available. If text is not contained - jsonr will report error. It may be useful for smoke tests scripts.

-p request [p]rocessor file path

  If you want to decorate request with anything that requires more complex steps, you can write simple javascript file that exports default function that takes as an input request object and outputs modified request object. You can use it for instance, if you need to prepare something before running request, like enabling port-forwarding, or obtaining bearer token for authorization.

  Use regular Javascript for coding and all methods from Deno runtime (https://deno.land for docs)

  Sample file content:

  export default (request) => {
    request.headers["Authorization"] = "{token obtained from other function}"
    return request;
  }

  You can export async function if needed.

  (request) parameter contains following:

  {
    method: "",
    url: "",
    headers: {
      "headerType1": "headerValue1"
    }
  }

  HINT
  You can use request properties like url to determine to which resources you need to connect to. For example, if url is from TEST environment, connect to TEST database to get Authorization header value.

-e [e]nvironment name from (jsonr environments list) (no .json extension required)

  Environment is the set of variables or additional configuration that allows you to reuse existing .http files. For instance you can have following sample.http file:

  POST https://@@apiUrl@@/value

  {
    "username": "user@email.com"
  }

  Now, you can create environment file test.json:

  {
    "input": {
      "apiUrl": "my-api-on-test-environment.com"
    }
  }

  You can register such environment with following command:

  jsonr environments create test ./test.json

  This will create a new environment so you can use it later as:

  jsonr -e test ./sample.http

  NOTE: You don't need to append .json file extension, it will be added automatically.

  All commands related to environemnts:

  jsonr environments list - list all registered environments
  jsonr environments delete {name} - remove environment with name from registry
  jsonr environments create {name} {path-to-file} - create/register new environment so it can be used later

  You can provide following data within environment json file:

  {
    "input": {
      "variable1": "value1",
      "variable2": 25
    },
    "headers": {
      "Authorization": "ApiKey 123"
    },
    "processor": {
      "/home/user1/some-request-processor.js"
    }
  } 

--no-processor

  If request processor (see -p parameter above) was defined earlier (for instance in environemnt file), you can cancel it.

-m HTTP [m]ethod

  Specify http method, like:

  jsonr -m POST ./sample.http
  jsonr -m GET http://localhost:3000/api/users

  Default (if nothing found in .http file and no parameter provided) - GET

-v [v]erbose mode

  Provide more details in output (like response headers)

--debug Debug mode 

  Provide more detailed logs (use it only for troubleshooting)

-b Request [b]ody (if not willing to use http file)

  EXAMPLE
  jsonr -m POST -b '{ "username": "user@email.com" }' http://myapi.com/values

--no-default-content-type-header 

  By default jsonr will append Content-Type "application/json" header to all requests (if such header won't be present in definition) so you don't need to repeat it. Use this option to disable this behavior.

--help Display this help text

--version Display version info

-o [o]utput file for response json, if this parameter is not provided default outputs is stdout. 

  WARNING: If file exists it will overwrite it. If no extension provided, it will automatically append .json

  EXAMPLE: jsonr ... -o my-response => saves to ./my-response.json, overwrites file if it already exists!


`;

export default () => {
  console.log(help);
}
