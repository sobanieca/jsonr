# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Overview

`jsonr` is a CLI tool for interacting with JSON HTTP APIs and writing simple
smoke tests. It's built with Deno and JavaScript, using JSDoc type annotations
for type checking without TypeScript compilation.

## Development Commands

### Running the tool locally

```bash
deno task run [args]
```

This runs `main.js` with all permissions and ignores certificate errors for
testing.

### Code quality checks

```bash
deno task check
```

This is the primary pre-commit verification command that runs:

- `deno fmt --check` - Check code formatting
- `deno lint` - Lint the codebase
- `deno check main.js` - Type check main entry point
- `deno check test/test.js` - Type check test entry point
- Test suite in the `test/` directory

### Formatting and linting

```bash
deno fmt          # Format all code
deno fmt --check  # Check formatting without changes
deno lint         # Lint the codebase
```

### Type checking

```bash
deno check main.js       # Check main entry point
deno check test/test.js  # Check test entry point
```

### Testing

```bash
cd test && deno task test              # Run all tests
cd test && deno task update-snapshots  # Update test snapshots
cd test && deno task api               # Run the test API server
```

To run a single test, modify `test/test.js` to focus on specific test cases.

## Architecture

### Entry Point and Command System

The application uses a command pattern architecture (`main.js:12-45`):

1. **Args parsing** (`src/args.js`) - Uses `deno_std/cli/parseArgs` to parse CLI
   arguments, normalizes kebab-case to camelCase, and handles special key-value
   arguments (`-i`, `-h`) by converting them to objects
2. **Config loading** (`src/config.js`) - Searches for `jsonr-config.json` files
   from home directory down to current directory, merges them hierarchically,
   and applies environment-specific configuration
3. **Command matching** - Each command exports a `match(args)` function to
   determine if it should handle the request
4. **Command execution** - The first matching command's `execute(args)` function
   is called

### Commands

All commands are in `src/commands/`:

- `send-request.js` - Core functionality for sending HTTP requests (handles both
  .http files and direct URLs)
- `run.js` - Executes JavaScript files with jsonr API available, or generates
  example scripts
- `config.js` - Manages jsonr-config.json files
- `help.js` - Displays help text
- `version.js` - Shows version information
- `update.js` - Updates the tool to latest version

### Configuration System

The config system (`src/config.js`) has several key features:

1. **Hierarchical loading** - Searches from `$HOME` to current directory for
   `jsonr-config.json` files and merges them (closer to current directory wins)
2. **Environment support** - Config files can define named environments with
   different input variables, headers, and secrets
3. **Secrets management** - Supports separate JSON files for secrets (referenced
   via `secrets` field), which are automatically masked in debug logs
4. **JSON comment support** - Strips `//` and `#` comments from JSON files and
   removes trailing commas before parsing

### Request Processing

HTTP request handling (`src/commands/send-request.js`):

1. **Input sources**:
   - `.http` files (VSCode REST Client format)
   - Direct URL with options (`-m`, `-b`, `-h` flags)

2. **Variable substitution** - `@@variableName@@` placeholders are replaced with
   values from:
   - Command-line input variables (`-i`)
   - Config file input variables
   - Secrets files

3. **.http file format**:
   ```
   METHOD URL
   Header: value

   body content
   ```

4. **Response handling**:
   - Status code assertions (`-s` flag)
   - Text content assertions (`-t` flag)
   - Output to file (`-o` flag)
   - Raw mode (`-r` flag) - shows response without formatting

### Programmatic API

The `run` command (`src/commands/run.js`) enables JavaScript scripting:

- Exposes a global `jsonr()` function when executing scripts via
  `jsonr run script.js`
- The function accepts same arguments as CLI but in object form
- Allows chaining requests and programmatic response handling
- Can generate starter templates with `jsonr run --init`

## Type Checking

The project uses JavaScript with JSDoc type annotations:

- `main.js` has types defined in `main.d.ts` via `@ts-self-types` directive
- TypeScript checking is enabled via `deno.json` `compilerOptions.checkJs: true`
- Some strict checks are disabled (`noImplicitAny`, `strictNullChecks`,
  `useUnknownInCatchVariables`)

## Logging

`src/logger.js` provides debug logging:

- Debug logs only appear when `--debug` flag is used
- Secrets from secrets files are automatically masked in logs
- Color output can be disabled with `NO_COLOR=1` environment variable

## Publishing

The package is published to JSR as `@sobanieca/jsonr`. Precompiled binaries are
built for multiple platforms (Linux/macOS, x64/arm64) and distributed via GitHub
releases.
