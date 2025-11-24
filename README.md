# About

- :pager: Are you tired of your UI http client asking you to sign in/sign up so
  they can create proper `workspace` for you? (and get your email to send you
  marketing emails)
- :hourglass_flowing_sand: Are you waiting for ages until your UI http client
  loads all it's functionalities and plugins that you don't need?
- :file_cabinet: Are you spending lots of time trying to find requests you've
  sent to given api months ago?
- :microscope: Are you searching how to change request method in `curl` because
  you don't use `curl` that often?
- :clipboard: Are you working with modern json http api's?
- :dash: Do you want to write smoke tests for your api?
- :link: Need a scripting tool to chain requests?

`jsonr` is a simple CLI tool for interacting with json http api's and writing
simple smoke tests. It's available from your terminal anytime when you need it
(so you don't need to switch context) and it's not aimed to be an ultimate
solution for everything. That's why it's so simple to use. No more need to
browse lots of documentation about tons of features that you don't need. 5
minutes and you are ready to send any requests.

## Usage

**1. Create .http files** (store them in your git repository to share with other developers)

```
POST https://petstore.swagger.io/v2/pet
Authorization: Bearer @@apiKey@@

{
  "name": "Sample Pet",
  "status": "available"
}
```

**2. Use simple command to send request and set input variable**

```bash
jsonr post-pet.http -i "apiKey: myApiKey123"
```

**3. Initialize jsonr config file**

```bash
jsonr config
```

This creates a `jsonr-config.json` file with environment configurations:

```json
{
  "environments": {
    "prod": {
      "inputVariables": {
        "baseUrl": "https://petstore.swagger.io/v2",
        "apiKey": "prod_ApiKey123"
      }
    }
  }
}
```

**4. Update .http file to use variables**

```
POST @@baseUrl@@/pet
Authorization: Bearer @@apiKey@@

{
  "name": "Sample Pet",
  "status": "available"
}
```

**5. Use environment from config when sending request**

```bash
jsonr post-pet.http -e prod
```

**6. Skip .http files and send request directly** (Content-Type: application/json is added automatically)

```bash
jsonr -m POST -h 'Authorization: myApiKey123' -b '{"name": "Sample Pet", "status": "available"}' https://petstore.swagger.io/v2/pet
```

**7. Write simple smoke tests with status code/response body assertions**

```bash
jsonr -m POST -h 'Authorization: myApiKey123' -b '{"name": "Sample Pet", "status": "available"}' https://petstore.swagger.io/v2/pet -s 201
```

Run `jsonr --help` for details.

**8. Programmatic Usage - chaining requests**

You can use `jsonr` programmatically in your Javascript scripts to chain
multiple requests and handle responses in code.

To get started, generate a template script:

```bash
jsonr init
jsonr init https://api.example.com/endpoint
```

This creates a `jsonr-script.js` file that you can customize. Here's an example
that creates a user and then posts an order using the returned user ID:

```javascript
// Create a new user
const userResponse = await jsonr("https://api.example.com/users", {
  method: "POST",
  body: {
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
    userId: userId,
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

## Prerequisites

Deno runtime environment `https://deno.com` (required for recommended
installation method)

## Installation

### Option 1: Install via Deno (Recommended)

```bash
deno install -g --allow-write --allow-net --allow-read -f -r -n jsonr jsr:@sobanieca/jsonr
```

`--allow-write` permission is needed only if you are planning to use `-o`
parameter (write response body to file, check `jsonr --help` for details)

### Option 2: Quick Install Script (Standalone Binary)

If you don't have Deno installed, you can install the pre-compiled binary with a
single command:

```bash
curl -fsSL sobanieca.github.io/jsonr/install.sh | bash
```

This script automatically detects your OS and architecture (Linux/macOS,
x64/arm64) and installs the appropriate binary to `/usr/local/bin`.

To install to a custom location:

```bash
curl -fsSL sobanieca.github.io/jsonr/install.sh | INSTALL_DIR=~/bin bash
```

### Option 3: Manual Binary Installation

Download the latest pre-compiled binary for your operating system from the
[releases page](https://github.com/sobanieca/jsonr/releases/latest):

**Example for Linux x64:**

```bash
curl -L -o jsonr https://github.com/sobanieca/jsonr/releases/latest/download/jsonr-linux-x64
chmod +x jsonr
sudo mv jsonr /usr/local/bin/
```

Available binaries: `jsonr-linux-x64`, `jsonr-linux-arm64`, `jsonr-macos-x64`,
`jsonr-macos-arm64`

## Updating

Use `jsonr update` command and follow presented instructions to update.

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
target server) you can run `temporary` command like:

`deno run --allow-net --unsafely-ignore-certificate-errors jsr:@sobanieca/jsonr ...`

It will display warning about disable ssl verification, but you should be able
to perform requests. If you work frequently with such unsafe servers you can
consider introducing `jsonr-unsafe` sitting next to your main `jsonr` instance:

`deno install -n jsonr-unsafe -g -f -r --unsafely-ignore-certificate-errors --allow-net --allow-read --allow-write jsr:@sobanieca/jsonr`

- If you want to disable colors (at least for main log messages), you can use:

```bash
NO_COLOR=1 jsonr ...
```

## Contribution

If you want to implement/request new features you are more than welcome to
contribute. Please keep in mind that this tool is supposed to be super simple to
use and cover ~80% of use cases for playing around with JSON HTTP API's.
Instructions (--help) for this tool should be possible to read in less than 5
minutes. If more features will be added this may be hard to achieve.

## Learn More

For complete documentation of all available options and detailed usage
instructions, view the help text at:

https://sobanieca.github.io/jsonr/src/commands/help.js

This URL is particularly useful when working with AI assistants or LLMs - you
can provide this link to give them comprehensive information about jsonr's
capabilities and command-line options.
