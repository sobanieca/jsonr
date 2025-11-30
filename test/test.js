import { assertSnapshot } from "https://deno.land/std@0.185.0/testing/snapshot.ts";

const run = async (cmd, cwd) => {
  const command = new Deno.Command("sh", {
    args: ["-c", cmd],
    stdout: "piped",
    stderr: "piped",
    cwd: cwd,
  });

  const { code, stdout, stderr } = await command.output();

  const removeAnsi = (input) => {
    // deno-lint-ignore no-control-regex
    const ansiEscapeSequences = /\u001b\[[0-9;]*[a-zA-Z]/g;
    return input.replace(ansiEscapeSequences, "");
  };

  const removeVaryingOutput = (input) => {
    return input
      .replace(/obtained in \d+ms/g, "obtained in *ms")
      .replace(/date: [^\n]+/g, "date: *")
      .replace(/content-length: [^\n]+/g, "content-length: *");
  };

  let output = new TextDecoder().decode(stdout);
  let outputError = new TextDecoder().decode(stderr);

  output = removeVaryingOutput(removeAnsi(output));
  outputError = removeAnsi(outputError);

  return {
    code,
    output,
    outputError,
  };
};

Deno.test("Given API", async (t) => {
  const apiCommand = new Deno.Command("deno", {
    args: "run -A test-api.js".split(" "),
    stdout: "piped",
    stderr: "piped",
  });

  const apiProcess = apiCommand.spawn();

  do {
    const outputReader = apiProcess.stdout.getReader();
    const apiOutput = new TextDecoder().decode(
      (await outputReader.read()).value,
    );
    outputReader.releaseLock();
    if (apiOutput.indexOf("Listening on port 3000") != -1) {
      break;
    }

    await new Promise((resolve) => setTimeout(resolve, 100));
  } while (true);

  const test = async (jsonrCommand, cwd) => {
    const originalCommand = jsonrCommand;
    let mainPath = "../main.js";
    let absoluteCwd;
    if (cwd) {
      const projectRoot = Deno.cwd().replace("/test", "");
      absoluteCwd = `${projectRoot}/${cwd}`;
      if (cwd.includes("api1") || cwd.includes("api2")) {
        mainPath = "../../../main.js";
      }
    }
    jsonrCommand = jsonrCommand.replace("jsonr", `deno run -A ${mainPath}`);
    await t.step(originalCommand + (cwd ? ` [cwd: ${cwd}]` : ""), async () => {
      const { code, output, outputError } = await run(
        jsonrCommand,
        absoluteCwd,
      );

      await assertSnapshot(t, { code, output, outputError });
    });
  };

  const sdkTest = async (jsonrCommand) => {
    jsonrCommand = jsonrCommand.replace("jsonr", "deno run -A ../main.js");
    await t.step(jsonrCommand, async () => {
      const initResult = await run(jsonrCommand);

      const scriptResult = await run(
        "deno run -A ../main.js run jsonr-script.js",
      );

      const normalizeScriptOutput = (output) => {
        return output
          .replace(/Elapsed: \d+ ms/g, "Elapsed: * ms")
          .replace(/Header date: [^\n]+/g, "Header date: *");
      };

      await assertSnapshot(t, {
        initCode: initResult.code,
        initOutput: initResult.output,
        initOutputError: initResult.outputError,
        scriptCode: scriptResult.code,
        scriptOutput: normalizeScriptOutput(scriptResult.output),
        scriptOutputError: scriptResult.outputError,
      });

      try {
        await Deno.remove("jsonr-script.js");
      } catch {
        // Ignore if file doesn't exist
      }
    });
  };

  await test("jsonr -e test get.http", "test/requests/api2");
  await test("jsonr -e test post.http", "test/requests/api2");
  await test("jsonr -e test delete.http", "test/requests/api2");
  await test("jsonr -e test put.http", "test/requests/api2");
  await test("jsonr -e test exception.http", "test/requests/api2");
  await test("jsonr -e test get-auth-401.http -s 401", "test/requests/api1");
  await test("jsonr -e test get-auth.http", "test/requests/api1");
  await test(
    'jsonr -m PUT -b \'{"name":"test"}\' localhost:3000/sample',
  );
  await test("jsonr http://localhost:3000/sample");
  await test("jsonr -e test put.http -s 303", "test/requests/api2");
  await test("jsonr -e test put.http -s 200", "test/requests/api2");
  await test("jsonr -e test get.http -t test", "test/requests/api2");
  await test("jsonr -e test -h 'X-SampleHeader: abc' -v get-auth.http", "test/requests/api1")
  await test("jsonr -e test -h 'X-SampleHeader: abc' -v get.http", "test/requests/api2")
  await test("jsonr -e test get.http -t sample-get", "test/requests/api2");
  await test("jsonr http://localhost:3000/redirect");
  await test("jsonr http://localhost:3000/redirect -f");
  await test("jsonr -e test --js post-js.http", "test/requests/api2");
  await test(
    "jsonr --js -m POST -b '{ name: \"test\", count: 8 }' localhost:3000/sample",
  );
  await test("jsonr help");
  await test("jsonr -e nonExistentEnv get.http", "test/requests/api2");
  await test("jsonr config", "test/requests/api1");

  await sdkTest("jsonr run --init http://localhost:3000/sample");

  apiProcess.kill();
  await apiProcess.output();
});
