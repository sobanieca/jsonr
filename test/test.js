import { createSdkTestRunner, createTestRunner } from "./test-utils.js";

Deno.test("Given API", async (t) => {
  const apiProcess = await startTestApi();
  const test = createTestRunner(t);
  const sdkTest = createSdkTestRunner(t);

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
  await test(
    "jsonr -e test -h 'X-SampleHeader: abc' -v get-auth.http",
    "test/requests/api1",
  );
  await test(
    "jsonr -e test -h 'X-SampleHeader: abc' -v get.http",
    "test/requests/api2",
  );
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

const startTestApi = async () => {
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

  return apiProcess;
};
