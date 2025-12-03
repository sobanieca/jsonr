import { assertSnapshot } from "https://deno.land/std@0.185.0/testing/snapshot.ts";

export const run = async (cmd, cwd) => {
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

export const createTestRunner = (t) => {
  return async (jsonrCommand, cwd) => {
    let mainPath = "../main.js";
    let absoluteCwd;
    if (cwd) {
      const projectRoot = Deno.cwd().replace("/test", "");
      absoluteCwd = `${projectRoot}/${cwd}`;
      if (cwd.includes("api1") || cwd.includes("api2")) {
        mainPath = "../../../main.js";
      } else if (cwd === "test/requests") {
        mainPath = "../../main.js";
      }
    }
    await t.step(jsonrCommand + (cwd ? ` [cwd: ${cwd}]` : ""), async () => {
      const { code, output, outputError } = await run(
        jsonrCommand.replace("jsonr", `deno run -A ${mainPath}`),
        absoluteCwd,
      );

      await assertSnapshot(t, { jsonrCommand, code, output, outputError });
    });
  };
};
