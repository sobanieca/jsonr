const routeRules = [];
const currentRouteRule = null;

const givenApi = (baseUrl) => {
  const initRuleIfRequired = (method, endpoint) => {
    if (currentRouteRule) {
      routeRules.push(currentRouteRule);
      currentRouteRule = {
        route: `${baseUrl}${endpoint}`,
        method: method,
      };
    }
  };

  const api = {
    withGetEndpoint: (endpoint) => {
      initRuleIfRequired("GET", endpoint);
      console.log("withGetEndpoint");
      return api;
    },
    withPostEndpoint: (endpoint) => {
      initRuleIfRequired("POST", endpoint);
      console.log("withPostEndpoint");
      return api;
    },
    withPutEndpoint: (endpoint) => {
      initRuleIfRequired("PUT", endpoint);
      console.log("withPutEndpoint");
      return api;
    },
    withDeleteEndpoint: (endpoint) => {
      initRuleIfRequired("DELETE", endpoint);
      console.log("withDeleteEndpoint");
      return api;
    },
    returning: () => {
      console.log("returning");
      return api;
    },
    returningStatus: () => {
      console.log("returning status");
      return api;
    },
    returningBody: () => {
      console.log("returning body");
      return api;
    },
    init: () => {
      if (currentRouteRule) {
        routeRules.push(currentRouteRule);
      }
    },
  };

  return api;
};

const jsonr = (cmd) => {
  console.log("running jsonr with cmd");
  console.log(cmd);
};

givenApi("http://localhost:3000")
  .withGetEndpoint("/pets")
  .returning({ id: 1, name: "dog" })
  .withPostEndpoint("/pets")
  .returningStatus(500)
  .returningBody("Unknown exception occurred")
  .init();

Deno.test("When calling post endpoint with status assert jsonr command should fail", () => {
  //jsonr() command behind the scene can call Deno.test?
  jsonr("localhost:3000/pets -m POST -s 200");
  //.shouldExitNonZeroCode()
  //.shouldContainOutput("invalid status returned");
  console.log("testing...");
});
