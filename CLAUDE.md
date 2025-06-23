# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## Project Overview

jsonr is a CLI tool for interacting with JSON HTTP APIs and writing simple smoke
tests. It's built with Deno and uses JavaScript with TypeScript checking
enabled.

## Development Commands

### Testing

- `cd test && deno task test` - Run all tests
- `cd test && deno task update-snapshots` - Update test snapshots

### Running the Application

- `deno task run` - Run the main application with all permissions
- `deno run --allow-all main.js` - Alternative way to run the application

### Manual Testing

- Use `.http` files in `test/requests/` directory as examples
- Example: `deno run --allow-all main.js test/requests/get.http`

## Architecture

### Entry Point and Command System

- `main.js` - Main entry point that orchestrates command matching and execution
- Uses a command pattern with three main commands: help, version, and
  send-request
- Each command implements `match()` and `execute()` methods

### Core Components

- `src/args.js` - Argument parsing using Deno's standard library flags
- `src/logger.js` - Logging system with debug/info/error levels
- `src/deps.js` - Centralized dependency imports from Deno standard library
- `src/commands/` - Command implementations
  - `help.js` - Help command
  - `version.js` - Version command
  - `send-request.js` - Main HTTP request functionality

### HTTP Request Processing

The `send-request.js` command handles:

- Parsing `.http` files with method, URL, headers, and body
- Variable substitution using `@@variable@@` syntax
- Environment file support (`-e` flag)
- Request/response logging and validation
- Response assertions (status codes, content matching)

### Key Features

- Supports standard HTTP methods (GET, POST, PUT, DELETE, etc.)
- Header management with `-h` flag
- Environment variables from JSON files
- Response validation with `-s` (status) and `-t` (text) flags
- Output to file with `-o` flag
- Raw request mode with `-r` flag
- Redirect following with `-f` flag

### Dependencies

All external dependencies are managed through `src/deps.js` and use Deno
standard library v0.174.0:

- Logging (`std/log`)
- Colors (`std/fmt/colors`)
- Argument parsing (`std/flags`)

### Testing Strategy

- Uses Deno's built-in testing with snapshot testing
- Test files are in `test/` directory
- Sample HTTP requests in `test/requests/` for integration testing
- Environment configurations in `test/requests/environments/`

## File Structure Notes

- No build step required - JavaScript runs directly with Deno
- TypeScript checking enabled via `deno.json` compilerOptions
- Main module exported through `main.js` with type definitions in `main.d.ts`
