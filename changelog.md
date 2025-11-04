# 1.7.0

- Added `--js` flag to treat request body as JavaScript object literal
  - Allows writing objects with unquoted keys, single quotes, trailing commas,
    etc.
  - Works with both `.http` files and `-b` parameter
  - Automatically converts JavaScript object literals to valid JSON before
    sending
  - Available in both CLI and SDK

# 1.6.0

- Introduced `jsonr` SDK for simple request chaining

# 1.5.4

- Move to JSR.io

# 1.5.1

- Fix version number

# 1.5.0

- Add option to automatically follow redirects with `-f` option

# 1.4.0

- Ignore comments in .http files (lines starting from `#` or `//`)

# 1.3.9

- Fixed bug when http header contained `:` in value
- Updated documentation

# 1.3.8

- Readme updated, `main.js` file moved again to root folder

# 1.3.7

- Removed import maps to simplify release process, restored `deps.js` file

# 1.3.6

- Readme update about prerequisites

# 1.3.5

- Readme update about `deno install`

# 1.3.4

- `deno install` tool name fix

# 1.3.3

- Another fix for `deno install` - fix name of the tool

# 1.3.2

- Readme fix regarding `deno install`

# 1.3.1

- Fix for `deno install` - bundling whole app into single js file to handle
  import maps properly

# 1.3.0

- Migration to latest Deno std library
- Deno import maps used (this means Deno needs to be in version >= 1.30)

# 1.2.3

- Updated readme. Version bump only to update Deno module page (screenshot in
  readme updated)

# 1.2.2

- Updated readme. Version bump only to update Deno module page

# 1.2.1

- Updated readme. Version bump only to update Deno documentation

# 1.2.0

- Fixed console colors so they are compatible with dark background in console.
  Default ConsoleLogger colors are way too dark.

# 1.1.0

- Response status text added to logs
- Verbose mode (-v) will log request with headers as well (so it's more
  convenient to report issues with given endpoint)
- Fixed response body logs to console so it supports objects of depth up to 100
- Request raw mode (-r) introduced - by default all tabs and new lines in
  request body defined in http file will be removed. This option disables this
  behaviour.

# 1.0.0

- Initial release
