import { assertSnapshot } from "https://deno.land/std@0.185.0/testing/snapshot.ts";

const run = async (cmd) => {
  const command = new Deno.Command(Deno.execPath(), {
    args: command.split(" "),
    stdout: "piped",
    stderr: "piped",
  });

  const process = command.spawn();
  
  const { code, rawOutput, rawError } = await process.output();
  
  process.kill();

  const removeAnsi = (input) => {
    const ansiEscapeSequences = /\u001b\[[0-9;]*[a-zA-Z]/g;
    return input.replace(ansiEscapeSequences, '');
  }

  const removeDuration = (input) => {
    const durationRegEx = /obtained in \d+ms/g;
    return input.replace(durationRegEx, 'obtained in *ms');
  }

  let output = new TextDecoder().decode(rawOutput);
  let outputError = new TextDecoder().decode(rawError);

  output = removeDuration(removeAnsi(output));
  outputError = removeAnsi(outputError);

  return {
    code,
    output,
    outputError
  }
}

Deno.test("Given API", async (t) => {
  const apiCommand = new Deno.Command(Deno.execPath(), {
    args: "deno run -A test-api.js".split(" ")
  });

  const apiProcess = apiCommand.spawn();
  
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const test = async (jsonrCommand) => {
    jsonrCommand = jsonrCommand.replace("jsonr", "deno run -A ../../main.js");
    await t.step(jsonrCommand, async () => {
      const { code, output, outputError } = await run(jsonrCommand);

      assertSnapshot(t, { code, output, outputError });      
    });
  }

  await test("jsonr requests/get.http");
  await test("jsonr requests/post.http");
  await test("jsonr requests/delete.http");
  await test("jsonr requests/put.http");
  await test("jsonr requests/exception.http");
  await test("jsonr -s 401 requests/auth-401.http");
  await test("jsonr -e requests/environments/test.json requests/auth.http");

  apiProcess.kill("SIGINT");
});
