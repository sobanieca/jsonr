givenApi("http://localhost:3000")
  .withGetEndpoint("/pets")
  .returning({ id: 1, name: "dog" })
  .withPostEndpoint("/pets")
  .returningStatus(500)
  .returningBody("Unknown exception occurred");


Deno.test("When calling post endpoint with status assert jsonr command should fail", () => {
//jsonr() command behind the scene can call Deno.test?
  jsonr("localhost:3000/pets -m POST -s 200")
    .shouldExitNonZeroCode()
    .shouldContainOutput("invalid status returned");
  console.log('testing...');
});

