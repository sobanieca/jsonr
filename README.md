Website: https://sobanieca.github.io/jsonr/

# About

- :pager: Tired of UI HTTP clients forcing sign-in just to create a workspace
  (and collect your email)?
- :hourglass_flowing_sand: Waiting forever for UI clients to load features and
  plugins you don’t need?
- :file_cabinet: Struggling to find past requests from months ago?
- :microscope: Searching how to change the request method in `curl` because you
  rarely use it?
- :clipboard: Working with modern JSON HTTP APIs?
- :dash: Want to write quick smoke tests for your API?
- :link: Need a scripting tool to chain requests together?
- :lock: Worried about AI agents leaking your API secrets?

`jsonr` is a simple CLI tool for interacting with json http api's and writing
simple smoke tests. It's available from your terminal anytime when you need it
(so you don't need to switch context) and it's not aimed to be an ultimate
solution for everything. That's why it's so simple to use. No more need to
browse lots of documentation about tons of features that you don't need. 5
minutes and you are ready to send any requests.

## Usage

**1. Create .http files** (store them in your git repository to share with other
developers)

```
POST https://api.example.com/users
Authorization: Bearer @@apiKey@@

{
  "name": "John Doe",
  "email": "john.doe@example.com"
}
```

**2. Use simple command to send request and set input variable**

```bash
jsonr create-user.http -i "apiKey: myApiKey123"
```

**3. Initialize jsonr config file**

```bash
jsonr config --init
```

This creates a `jsonr-config.json` file with environment configurations:

```json
{
  "environments": {
    "prod": {
      "inputVariables": {
        "baseUrl": "https://prod.api.example.com"
      },
      "secrets": "~/.secrets/jsonr-prod.json"
    }
  }
}
```

The secrets file (`~/.secrets/jsonr-prod.json`) stores sensitive values
separately:

```json
{
  "apiKey": "prod_ApiKey123"
}
```

**4. Update .http file to use more variables**

```
POST @@baseUrl@@/users
Authorization: Bearer @@apiKey@@

{
  "name": "John Doe",
  "example": "john.doe@example.com"
}
```

**5. Use environment from config when sending request**

```bash
jsonr create-user.http -e prod
```

**6. Skip .http files and send request directly**
(`Content-Type: application/json` header is added automatically)

```bash
jsonr -m POST -h 'Authorization: myApiKey123' -b '{"name": "John Doe", "email": "john.doe@example.com"}' https://api.example.com/users
```

**7. Write simple smoke tests with response status code assertion (text
assertion also available)**

```bash
jsonr create-user.http -e prod -s 201
```

**8. Programmatic Usage - chaining requests**

You can use `jsonr` programmatically in your Javascript scripts to chain
multiple requests and handle responses in code.

To get started, generate a template script:

```bash
jsonr run --init https://api.example.com/users
```

This creates a `jsonr-script.js` file that you can customize. Here's an example
that creates a user and then posts an order using the returned user ID:

```javascript
// Create a new user
const userResponse = await jsonr("create-user.http", {
  inputVariables: {
    name: "John Doe",
    email: "john@example.com",
  },
  status: 201,
});

const userId = userResponse.body.id;
console.log(`Created user with ID: ${userId}`);

// Create an order for the newly created user
const orderResponse = await jsonr("https://api.example.com/orders", {
  method: "POST",
  body: {
    userId,
    items: ["product-123", "product-456"],
    total: 99.99,
  },
  status: 201,
});

console.log(`Order created with ID: ${orderResponse.body.id}`);
```

Run your script with:

```bash
jsonr run jsonr-script.js
```

The `jsonr` function is automatically available in scripts run with
`jsonr run` - no import needed!

### Input variables syntax

Input variables can be referenced using either of two interchangeable syntaxes:

- `@@variableName@@`
- `{{variableName}}` (handlebars style, whitespace inside the braces is allowed,
  e.g. `{{ variableName }}`)

Both forms are resolved from the same sources (`-i` flag, config
`inputVariables`, and secrets files), so you can mix and match them freely:

```
# GET request using handlebars-style variables
GET {{baseUrl}}/users
Authorization: Bearer {{ apiKey }}
```

## Using with AI agents

`jsonr` is safe to hand to an AI agent: secrets are read from files referenced
in `jsonr-config.json` and masked in every log line, so the command an agent
runs (`jsonr create-user.http -e prod`) never contains a credential.

To let the agent learn the tool, have it run `jsonr skill` (the help text with
an agent preamble). To make it a slash command in your project:

```bash
jsonr skill --init
```

This writes `SKILL.md` to `.agents/skills/jsonr/` (Codex, Cursor) and
`.claude/skills/jsonr/` (Claude Code, Cursor). Inside a git repository the skill
goes to the git root, so the agent sees it in every folder of the repository,
monorepo packages included. Outside a git repository the skill goes to your home
directory (`~/.agents/skills/jsonr/` and `~/.claude/skills/jsonr/`), so agents
see it in every project. Then:

```
/jsonr send the create-user request against prod and check it returns 201
```

## Learn More

For complete documentation of all available options and detailed usage
instructions run `jsonr --help` or view the help text at:

https://sobanieca.github.io/jsonr/help.txt

This URL is particularly useful when working with AI assistants or LLMs - you
can provide this link to give them comprehensive information about jsonr's
capabilities and command-line options.

## Installation

`jsonr` is a single binary for Linux and macOS (x64 and arm64). No runtime is
needed.

### Option 1: Quick Install Script (Recommended)

```bash
curl -fsSL sobanieca.github.io/jsonr/install.sh | bash
```

This script automatically detects your OS and architecture (Linux/macOS,
x64/arm64) and installs the appropriate binary to `/usr/local/bin`, for all users. If you
can't write to `/usr/local/bin`, the script stops with an error. Run it with
`sudo`:

```bash
curl -fsSL sobanieca.github.io/jsonr/install.sh | sudo bash
```

Or install to a custom location: set `INSTALL_DIR` to a directory that is on
your `PATH`:

```bash
curl -fsSL sobanieca.github.io/jsonr/install.sh | INSTALL_DIR=~/.local/bin bash
```

### Option 2: Manual Binary Installation

Download the latest binary for your operating system from the
[releases page](https://github.com/sobanieca/jsonr/releases/latest):

**Example for Linux x64:**

```bash
curl -L -o jsonr https://github.com/sobanieca/jsonr/releases/latest/download/jsonr-linux-x64
chmod +x jsonr
sudo mv jsonr /usr/local/bin/
```

Available binaries: `jsonr-linux-x64`, `jsonr-linux-arm64`, `jsonr-macos-x64`,
`jsonr-macos-arm64`

### Migrating from the Deno version (4.x)

Versions up to 4.x were distributed for Deno (`jsr:@sobanieca/jsonr`). Remove
the Deno installation with `deno uninstall -g jsonr` and install the binary as
described above. `.http` files, `jsonr-config.json` files and secrets work
unchanged. Scripts run with `jsonr run` now use a built-in JavaScript engine:
plain JavaScript with `jsonr()` and `console` works as before, but Deno APIs
(`Deno.*`, `fetch`, `jsr:`/`npm:` imports) are not available.

## Updating

```bash
jsonr update
```

This downloads the latest release and replaces the binary. If `jsonr` is
installed in a system directory (like `/usr/local/bin`) run
`sudo jsonr update`. `jsonr` checks for new versions once a day and prints a
notice when one is available (set `JSONR_NO_UPDATE_CHECK=1` to disable it).

## Hints

- It is recommended to wrap URLs with quotes to avoid shell conflicts:

```bash
jsonr "https://api.example.com/users?filter=active&sort=name"
```

- Working with Large Responses

When dealing with large response bodies, you can pipe the output to `grep` to
filter specific content:

```bash
# Search for a specific property in a large JSON response
jsonr my-api-request.http | grep "someProperty" -C 10

# Extract specific fields from JSON responses
jsonr my-api-request.http | grep -E '"(id|name|email)"' -C 2
```

- SSL Certificate Issues

If your requests are failing due to certificate validation errors (and you trust
target server), use the `--insecure` flag to skip certificate verification:

```bash
jsonr --insecure https://self-signed.example.com/users
```

- If you want to disable colors (at least for main log messages), you can use:

```bash
NO_COLOR=1 jsonr ...
```

## Contribution

If you want to implement/request new features you are more than welcome to
contribute. Please keep in mind that this tool is supposed to be super simple to
use and cover ~80% of use cases for playing around with JSON HTTP API's.
Instructions (`jsonr --help`) for this tool should be possible to read in less
than 5 minutes. If more features will be added this may be hard to achieve.
