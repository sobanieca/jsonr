import { assertSnapshot } from "https://deno.land/std@0.185.0/testing/snapshot.ts";

const run = async (command) => {
  const process = Deno.run({
    cmd: command.split(" "),
    stdout: "piped",
    stderr: "piped",
  });
  
  const [{ code }, rawOutput, rawError] = await Promise.all([
    process.status(),
    process.output(),
    process.stderrOutput(),
  ]);

  return {
    code,
    output: new TextDecoder().decode(rawOutput),
    outputError: new TextDecoder().decode(rawError)
  }
}

Deno.test("Given API", async (t) => {
  const apiProcess = Deno.run({ 
    cmd: ["deno", "run", "-A",  "test-api.js"],
    stdout: "piped",
    stderr: "piped"
  });

  const test = (jsonrCommand) => {
    jsonrCommand = jsonrCommand.replace("jsonr", "deno run -A ../../main.js");
    t.step(command, async () => {
      const { code, output, outputError } = await run(command);

      assertSnapshot(t, { code, output, outputError });      
    });
  }

  test("jsonr requests/get.http");
  test("jsonr requests/post.http");
  test("jsonr requests/delete.http");
  test("jsonr requests/put.http");
  test("jsonr requests/exception.http");
  test("jsonr -s 401 requests/auth-401.http");
  test("jsonr -e requests/environments/test.json requests/auth.http");

  apiProcess.kill("SIGINT");
});
