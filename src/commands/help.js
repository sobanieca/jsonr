const help = `
jsonr - A CLI tool for interacting with JSON HTTP APIs and writing simple smoke tests.

Usage:

  jsonr [url or .http file] [options]
  jsonr [command] [options]

Commands:

  help        Display this help text
  version     Display version info
  run         Execute a JavaScript file with the built-in runtime, or generate a jsonr example script.
              Usage: jsonr run script.js
                     jsonr run --init [url or .http file]

              Without --init: Executes a JavaScript file with the jsonr available.

              With --init: Generates a jsonr example script (jsonr-script.js) to get started using jsonr
                          programmatically in your code. Allows you to chain multiple requests and handle
                          responses programmatically. When you provide an optional URL or .http file path,
                          the generated script will include it as a starting example.

  config      Manage jsonr configuration.
              Usage: jsonr config [--init]

              Without --init: Displays the merged configuration from all jsonr-config.json files
                             found in the directory hierarchy (from home directory to current directory).

              With --init: Creates a new jsonr-config.json file in the current directory with all
                          available configuration options and example environments.

              See "Configuration Files" section below for more details.

  update      Display instructions for updating jsonr to the latest version.
              Usage: jsonr update [--deno]

              Shows the command to update jsonr for both Deno installations and standalone binaries.
              Use --deno flag to automatically run the update (will ask for run permission).

Sample usage:

jsonr -h "Authorization: Bearer ..." -m POST ./sample.http

Configuration Files:

jsonr supports configuration files named 'jsonr-config.json' for managing environments and default parameters.

Key features:
- Define named environments (e.g., prod, dev, test) with specific configurations
- Store sensitive variables in separate secrets files (masked in logs as *****)
- Set default values to avoid repeating common parameters
- Hierarchical search from current directory up to home directory
- Files closer to current directory take precedence
- Command-line parameters always override config values

EXAMPLE jsonr-config.json:

{
  "environments": {
    "prod": {
      "inputVariables": {
        "apiUrl": "https://api.example.com"
      },
      "secrets": "~/.secret/prod-secrets.json",
      "headers": {
        "X-TraceId": "jsonr"
      }
    },
    "dev": {
      "inputVariables": {
        "apiUrl": "https://dev-api.example.com"
      },
      "secrets": "~/.secret/dev-secrets.json"
    }
  },
  "defaults": {
    "inputVariables": {
      "apiUrl": "http://localhost:3000"
    },
    "headers": {
      "X-Request-Source": "jsonr-cli"
    }
  }
}

Example .http file:

GET @@apiUrl@@/users
Authorization: Bearer @@apiKey@@

Example secrets file (~/.secret/prod-secrets.json):

{
  "apiKey": "sk-1234567890abcdef",
  "token": "Bearer xyz123"
}

Using environments:
  jsonr -e prod ./sample.http     # Uses prod environment (apiUrl from config, apiKey from secrets)
  jsonr -e dev ./sample.http      # Uses dev environment
  jsonr ./sample.http              # Uses defaults section

Secrets files:
- Store sensitive variables (API keys, tokens) in a separate JSON file outside your repo
- Reference the secrets file path in your config with the "secrets" property
- Variables from secrets are merged with inputVariables and can be used with @@variable@@ syntax

Use 'jsonr config --init' to generate a complete sample configuration with all available options.
Use 'jsonr config' to view your current merged configuration.

Supported configuration keys (use camelCase for property names):

  inputVariables        Input variables for @@variable@@ replacement
  secrets               Path to secrets file (merged with inputVariables)
  headers               Default headers to include in all requests (object format)
                        Example: { "Authorization": "Bearer xyz", "X-Custom": "value" }
  status                Expected response status code for validation
  text                  Expected text in response body
  method                Default HTTP method
  body                  Default request body
  verbose               Enable verbose mode (true/false)
  raw                   Enable raw mode (true/false)
  followRedirects       Automatically follow HTTP redirects (true/false)
  output                Default output file path
  omitDefaultContentTypeHeader  Omit default Content-Type header (true/false)
  js                    Treat body as JavaScript object literal (true/false)

How configuration files work:

jsonr automatically searches for jsonr-config.json files starting from your
current directory and moving up to your home directory. Configuration files
closer to your current directory take precedence over those in parent
directories, and command-line parameters always override configuration defaults.

You can place jsonr-config.json files at different levels to create a
configuration hierarchy:

- ~/jsonr-config.json (global defaults for all projects)
- ~/projects/jsonr-config.json (defaults for all projects in this directory)
- ~/projects/my-app/jsonr-config.json (defaults specific to my-app)

When you run jsonr from ~/projects/my-app/, it will merge all three
configurations, with more specific configurations (closer to your working
directory) taking precedence.

Priority order (highest to lowest):
1. Command-line arguments (-i, -e <envName>, -h, etc.)
2. Named environment from config (when using -e <envName>)
3. Defaults section from config files (closer to cwd takes precedence)

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

-i, --input-variable

  Provide value for input variables.

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

-h, --header

  Provide value for additional header.

  If there are additional headers that you want to append to the request you can use this parameter multiple times:

  jsonr -h "Authorization: Bearer 123" -h "TrackingId: xyz" ./sample.http

-s, --status

  Expected response status code.

  If you provide this parameter jsonr will perform assertion against returned response status code. This is useful if you want to create smoke tests scripts.
  You can for instance  write a script with multiple requests:
  
  jsonr -s 200 ./request1.http
  jsonr -s 204 ./request2.http

  jsonr will return non-zero exit code if assertion failed, so you can prepare a script that will report error if any of the requests fail.

-t, --text

  Expected text that should be contained within response body.

  This parameter works in a very similar way as the -s param. With one remark - it checks response body and searches if it's response contains specified text.
  It's a simple text search, no regular expressions available. If text is not contained - jsonr will report error. It may be useful for smoke tests scripts.

-e, --environment

  Environment name from jsonr-config.json.

  Specify which environment to use from your jsonr-config.json file.

  EXAMPLE:
  jsonr -e prod ./sample.http      # Uses "prod" environment from config
  jsonr -e dev ./sample.http       # Uses "dev" environment from config

  jsonr will search for the environment in your jsonr-config.json files (starting from
  the current directory up to your home directory). If the environment is not found,
  jsonr will exit with an error.

  Named environments allow you to organize different configurations (prod, dev, test),
  manage secrets separately, and leverage hierarchical configuration across projects.

-m, --method

  HTTP method.

  Specify http method, like:

  jsonr -m POST ./sample.http
  jsonr -m GET http://localhost:3000/api/users

  Default (if nothing found in .http file and no parameter provided) - GET

-v, --verbose

  Verbose mode.

  Provide more details in output (output request and response headers). It may be useful for reporting issues with endpoints

--dry

  Dry run mode.

  Print the request that would be sent without actually sending it. Automatically enables verbose mode to show full request details including headers and body. Useful for verifying request configuration before sending.

--ignore-input-validation

  Skip validation for missing input variables.

  By default, jsonr validates that all @@variable@@ placeholders in .http files have corresponding values provided via -i flag or config files. When this flag is enabled, validation is skipped and unreplaced @@variable@@ placeholders will be sent as literal text in the request.

-r, --raw

  Request raw mode.

  By default jsonr replaces all new line and tab characters (whitespace characters) in http file so you can use new lines for human-friendly request body formatting.
  If you use this flag you will disable this behaviour.

-f, --follow-redirects

  Follow redirects.

  By default jsonr won't follow redirects when 3xx response is returned from server. Use this flag if you want to automatically follow all redirects, to return response from final destination server.

--js

  Treat body content as JavaScript object literal.

  When this flag is used, the request body (either from .http file or from -b parameter) will be treated as JavaScript object literal syntax.
  This allows you to write objects without strict JSON formatting (unquoted keys, single quotes, trailing commas, etc).
  The object will be automatically converted to valid JSON before sending the request.

  EXAMPLE with .http file:
  POST http://myapi.com/values

  {
    name: "test",
    items: ['a', 'b', 'c'],
    enabled: true,
  }

  Then run: jsonr --js ./sample.http

  EXAMPLE with -b parameter:
  jsonr --js -m POST -b '{ name: "test", enabled: true }' http://myapi.com/values

--debug

  Debug mode.

  Provide more detailed logs (use it only for troubleshooting)

-b, --body

  Request body (if not willing to use http file).

  EXAMPLE
  jsonr -m POST -b '{ "username": "user@email.com" }' http://myapi.com/values

--omit-default-content-type-header

  By default jsonr will append "Content-Type: application/json" header to all requests so you don't need to repeat it. Use this option to disable this behavior.

--help

  Display this help text (alternatively: jsonr help)

--version

  Display version info (alternatively: jsonr version)

-o, --output

  Output file for response json, if this parameter is not provided default output is stdout.

  WARNING: If file exists it will overwrite it.

  EXAMPLE: jsonr ... -o my-response 
  Saves to ./my-response.json, overwrites file if it already exists!
`;

export default {
  execute: () => console.log(help),
  match: (args) => args._[0] === "help" || args.help === true,
};
