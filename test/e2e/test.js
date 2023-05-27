import { assertSnapshot } from "https://deno.land/std@0.185.0/testing/snapshot.ts";

const run = async (cmd) => {
  const command = new Deno.Command(Deno.execPath(), {
    args: cmd.replace("deno ", "").split(" "),
    stdout: "piped",
    stderr: "piped"
  });

  const { code, stdout, stderr } = await command.output();

  const removeAnsi = (input) => {
    // deno-lint-ignore no-control-regex
    const ansiEscapeSequences = /\u001b\[[0-9;]*[a-zA-Z]/g;
    return input.replace(ansiEscapeSequences, '');
  }

  const removeDuration = (input) => {
    const durationRegEx = /obtained in \d+ms/g;
    return input.replace(durationRegEx, 'obtained in *ms');
  }

  let output = new TextDecoder().decode(stdout);
  let outputError = new TextDecoder().decode(stderr);

  output = removeDuration(removeAnsi(output));
  outputError = removeAnsi(outputError);

  return {
    code,
    output,
    outputError
  }
}

Deno.test("Given API", async (t) => {
  const apiCommand = new Deno.Command("deno", {
    args: "run -A test-api.js".split(" "),
    stdout: "piped",
    stderr: "piped"
  });

  const apiProcess = apiCommand.spawn();

  do {
    const outputReader = apiProcess.stdout.getReader();
    const apiOutput = new TextDecoder().decode((await outputReader.read()).value);
    outputReader.releaseLock();
    if(apiOutput.indexOf("Listening on port 3000" != -1))
      break;

    await new Promise((resolve) => setTimeout(resolve, 100));
  } while (true);

  const test = async (jsonrCommand) => {
    jsonrCommand = jsonrCommand.replace("jsonr", "deno run -A ../../main.js");
    await t.step(jsonrCommand, async () => {
      const { code, output, outputError } = await run(jsonrCommand);

      await assertSnapshot(t, { code, output, outputError });      
    });
  }

  await test("jsonr requests/get.http");
  await test("jsonr requests/post.http");
  await test("jsonr requests/delete.http");
  await test("jsonr requests/put.http");
  await test("jsonr requests/exception.http");
  await test("jsonr -s 401 requests/auth-401.http");
  await test("jsonr -e requests/environments/test.json requests/auth.http");
  
  apiProcess.kill();
  await apiProcess.output();
});
