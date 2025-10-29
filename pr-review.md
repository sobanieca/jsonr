Summary
- This PR adds a first-cut JavaScript/TypeScript SDK (mod.js + mod.d.ts + docs + tests) that wraps the existing CLI logic (src/commands/send-request.js) into an async function jsonr(fileOrUrl, options) and exposes it via deno.json exports ./sdk.
- It also updates version, changelog, and includes example/test scripts and SDK docs.
- Overall approach looks good and largely consistent with the existing CLI behavior, but there are several functional/behavioral issues and some API/typing & ergonomics problems that should be addressed before merging.

High-priority issues (must fix)
1) Do not call Deno.exit() inside the SDK (sendRequestCore)
- Problem: send-request.js still uses Deno.exit(1) for assertion failures / fatal errors. sendRequestCore is now exported and used by the SDK; when used as a library that will terminate the host process unexpectedly instead of surfacing an error to the caller.
- Why it matters: libraries should throw exceptions (or return errors) and let the host decide whether to exit. Deno.exit should only be used in top-level CLI code.
- Fix: change code paths that call Deno.exit(1) (assertion failure, fatal fetch error) to throw an Error (or a specific Error subclass). The CLI wrapper (original sendRequest function) can catch those errors and call Deno.exit(1) for CLI usage.
  - Example replacement:
    - Before:
      logger.error("ERROR: Response body doesn't contain expected text ...");
      Deno.exit(1);
    - After:
      throw new Error(`Response body doesn't contain expected text (${args.t})`);
- Also ensure other Deno.exit usages in send-request.js are converted similarly for sendRequestCore.

2) sendRequestCore should not unconditionally log or mutate returned body
- Problem: The SDK should return structured data and should not mutate response body for logging side effects or call CLI-specific logging flows that change returned data.
- Fix:
  - Build the response object from internal variables and return it without further mutation.
  - Avoid calling Deno.exit or performing process-level side effects.
  - Keep verbose logging optional; only run it if args.v true and avoid mutating the returned body to create log-friendly strings.

3) Error type & behavior must be documented and consistent
- Problem: Current code logs and re-throws or exits in inconsistent ways (logger.error then throw). Consumers expect thrown Errors they can catch; the error message should be clear and machine-parseable where appropriate.
- Fix:
  - Define and document error behavior in SDK docs (which error types are thrown on assertion failure, network error, parse error).
  - Consider adding an Error subclass, e.g., JsonrAssertionError, JsonrRequestError, with fields (status, body, headers) to make programmatic handling easier.

Medium-priority / correctness & API issues
4) Type definitions for input and headers should accept non-strings
- Problem: mod.d.ts types use Record<string,string> for input and headers. Many legitimate values are numbers/booleans (postId, IDs). The test code mixes numbers and strings.
- Fix:
  - Change types to Record<string, string | number | boolean> or Record<string, unknown> and document that inputs are stringified.
  - Also reflect this in mod.js when mapping inputs/headers: explicitly coerce to String(value).

5) Mapping of options.input and options.headers to CLI args must be robust
- Problem: mod.js maps input/header entries to strings like "key: value". If values include ":" or multiline content, the CLI parser might mis-parse. Also whitespace/encoding edge cases need consideration.
- Fix:
  - Use the same escaping or encoding strategy as the CLI expects. If the CLI splits on first colon, it’s OK, but document this constraint.
  - Coerce values with JSON.stringify if they are objects, e.g., input: { user: { id: 1 } } -> args.i.push(`${key}: ${JSON.stringify(value)}`).

6) Ensure CLI behavior remains unchanged (backwards compatibility)
- Problem: send-request.js was modified: sendRequestCore exported and a new sendRequest wraps it. Confirm other modules (CLI) import the default export or function the same way; changes to default export shape could break imports.
- Fix:
  - Run a repo-wide search to ensure other modules that import send-request.js still receive the same API (default export function or object). If you changed the default export shape, restore compatibility or update imports accordingly.
  - Keep the old sendRequest function (for CLI) that converts thrown errors into Deno.exit where appropriate.

7) Return value shape and body parsing
- Problem: Returned response.body should be JSON-parsed if possible, otherwise raw text. The implementation attempts to preserve originalResponseBody — ensure it's the parsed value (or string) consistently.
- Fix:
  - Implement parse logic: attempt JSON.parse for text responses; catch parsing error and return raw text.
  - Explicitly document in mod.d.ts: body is unknown and may be object/string.

8) Avoid logging secrets by default
- Problem: verbose mode logs headers (which might include Authorization). For SDK usage, verbose should be opt-in and the docs must warn about logging credentials.
- Fix:
  - Keep verbose default false and update docs to warn. Optionally redact Authorization header from logs unless verbose is true and redact is disabled.

Low-priority / style / CI / docs
9) mod.d.ts: use proper global types and better JSDoc
- Suggest adding more precise JSDoc comments (e.g., what `text` assertion matches: substring search in body text after JSON.stringify).

10) Tests: network & environmental concerns
- Problem: test files (test-sdk.js, test-sdk-http-files.js) perform external network calls to jsonplaceholder.typicode.com and write files in repo root. That makes CI flaky and tests not unit-level.
- Fix:
  - Convert tests to use a mock HTTP server or Deno test server, or mark them as integration tests and run only in an environment where network allowed.
  - Use a temporary directory (Deno.makeTempDir / Deno.remove) instead of writing files into repo root.
  - Add tests for edge cases (assertion failure -> thrown Error, status mismatch -> thrown Error, body parse errors).

11) deno.json exports and packaging
- deno.json exports added "./sdk": "./mod.js" — good. Ensure package docs/README mention the new import path and version bump.

12) Examples & SDK_EXAMPLES.md
- Good coverage. Add a small usage snippet that shows try/catch around jsonr(...) and how to read response.body vs body fields. Document thrown error types.

13) Potential race/side-effect in send-request.js logging
- Problem: Logger calls may mutate the response body for printing (patch referenced "before logging mutates it" but ensure that no code mutates originalResponseBody).
- Fix: Always keep a copy: const returnedBody = deepClone(responseBody) or build output via JSON.stringify without altering the original variable.

14) Naming: `jsonr` vs JSONR
- Suggest documenting package name and import path carefully; examples show import from jsr.io — ensure tests/examples use local import for local dev.

Detailed file-by-file comments and suggested edits

mod.js (added)
- Good: concise converter from SDK options to CLI args.
- Improvements:
  1. Coerce header/input values using String(value) or JSON.stringify for objects:
     args.h.push(`${key}: ${typeof value === 'string' ? value : JSON.stringify(value)}`);
  2. Wrap sendRequestCore call so thrown errors bubble up. The code currently logs the error then rethrows; prefer to rethrow a new Error with context or just rethrow the original.
  3. Consider returning a promise rejection with a structured error (include original response if applicable).
  4. Example: ensure options.input supports number/boolean values by Stringifying before pushing.
- Suggest adding parameter validation: if filePathOrUrl is falsy throw TypeError early.

mod.d.ts (added)
- Issues:
  1. Change input and headers types to flexible types:
     headers?: Record<string, string | number | boolean>;
     input?: Record<string, unknown>;
  2. Clarify JsonrResponse.body type in docs: if JSON is parsable returns object, else string. Possibly add a helper generic: export function jsonr<T = unknown>(...): Promise<JsonrResponse<T>>;
- Suggest making JsonrResponse generic:
  export interface JsonrResponse<T = unknown> { body: T; ... }
  export function jsonr<T = unknown>(...): Promise<JsonrResponse<T>>;

src/commands/send-request.js (modified)
- Major behavioral issue: convert Deno.exit calls to throw when running in sendRequestCore.
- The change added sendRequestCore exported, and reintroduced sendRequest (that awaits sendRequestCore). But the file patch appended sendRequest = async (args) => { await sendRequestCore(args); }; and then export default { ... }.
  - Confirm the original default export is preserved and other modules import the same shape. If anyone imported sendRequest directly, you may need to export a function with the same name/behavior.
- The "originalResponseBody" local variable is introduced — ensure it is available and is the unmodified value that will be returned.
- text assertion now uses bodyText computed from originalResponseBody — good change, but prefer to call .toString consistently:
  const bodyText = typeof originalResponseBody === 'string' ? originalResponseBody : JSON.stringify(originalResponseBody);
- Add explicit throws rather than Deno.exit here.

test-sdk.js & test-sdk-http-files.js (added)
- These are useful integration tests for manual verification, but:
  1. Use temporary files/dirs instead of writing into repo root.
  2. Avoid calling public APIs in unit tests (or mark them as integration).
  3. Add an option or env var to skip network tests in CI.
  4. Add tests that assert behavior for assertion failures (e.g., status mismatch) and confirm they throw.

SDK_EXAMPLES.md (added)
- Well written; add a short "Error handling" section with example of catching assertion errors thrown by the SDK.
- Add a "Return value example" showing a sample JsonrResponse object.

deno.json / src/version.js / changelog.md
- These updates are correct for the bump; ensure the version matches package release.

todo.md
- Consider removing from PR or mark done / archive; it documents feature intent but duplicates SDK_EXAMPLES.

Security & privacy
- Be careful about logging Authorization tokens in verbose mode; ensure docs warn.
- When saving responses to file (output option), avoid writing to sensitive locations by default.

Suggested implementation snippet for replacing Deno.exit in send-request.js
- For assertion fail:
  // Instead of Deno.exit(1)
  throw new Error(`Assertion failed: response body doesn't contain expected text (${args.t})`);
- For status fail:
  throw new Error(`Assertion failed: expected status ${args.s} but got ${response.status}`);

Suggested changes to mod.d.ts to support generics and flexible types
- Example:
  export interface JsonrOptions {
    headers?: Record<string, string | number | boolean>;
    input?: Record<string, unknown>;
    ...
  }
  export interface JsonrResponse<T = unknown> { body: T; ... }
  export function jsonr<T = unknown>(path: string, opts?: JsonrOptions): Promise<JsonrResponse<T>>;

Checklist before merging (recommended)
- [ ] Replace Deno.exit() usage in sendRequestCore with thrown errors, and ensure CLI still exits appropriately.
- [ ] Update tests to use temp dirs and mark network tests as integration or mock network requests.
- [ ] Update mod.d.ts types (flexible input/header types + generic response).
- [ ] Add unit tests covering:
    - successful JSON response (body parsed)
    - text response parsing fallbacks
    - status/text assertion failure -> throws Error
    - headers mapping and input mapping
- [ ] Confirm the default export shape of src/commands/send-request.js hasn't changed in a breaking way. Run repo-wide import checks.
- [ ] Document in SDK_EXAMPLES.md error behavior and return shape; call out that jsonr throws on assertion failure and network errors.
- [ ] Add a short CHANGELOG note that clarifies error-handling semantics for SDK users.
- [ ] Consider adding CI workflow to run SDK tests in integration mode selectively.

Minor / optional suggestions
- Add a small examples/ directory with a minimal TypeScript example that imports the sdk and demonstrates try/catch.
- Consider exposing error classes to allow consumers to detect assertion vs network errors.
- Add a small utility to convert CLI-style header arrays back into object map for the SDK consumer (if useful).

If you want, I can:
- Prepare a patch for send-request.js that replaces Deno.exit with throws and moves exit handling to CLI wrapper.
- Update mod.d.ts to more flexible types and add a generic JsonrResponse.
- Update tests to use a temp directory and convert one network test to a mocked server.

