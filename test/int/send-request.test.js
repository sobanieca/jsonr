import { runtime } from "../../src/deps.js";

const routeRules = [];
let currentRouteRuleIndex = -1;

const givenApi = (baseUrl) => {
  const initRule = (method, endpoint) => {
    routeRules.push({
      route: `${baseUrl}${endpoint}`,
      method: method,
    });
    currentRouteRuleIndex++;
  };

  const api = {
    withGetEndpoint: (endpoint) => {
      initRule("GET", endpoint);
      return api;
    },
    withPostEndpoint: (endpoint) => {
      initRule("POST", endpoint);
      return api;
    },
    withPutEndpoint: (endpoint) => {
      initRule("PUT", endpoint);
      return api;
    },
    withDeleteEndpoint: (endpoint) => {
      initRule("DELETE", endpoint);
      return api;
    },
    returning: (body, status = 200) => {
      routeRules[currentRouteRuleIndex].status = status;
      routeRules[currentRouteRuleIndex].body = body;
      return api;
    }
  };

  return api;
};

globalThis.fetch = async (url, opts) => {
  if (!opts) {
    opts.method = "GET";
  }

  const matchedRoute = routeRules.find((x) =>
    x.route == url && x.method == opts.method
  );

  if (matchedRoute) {
    return {
      status: matchedRoute.status,
      json: () => Promise.resolve(matchedRoute.body),
    };
  } else {
    throw new Error(`No matching route for ${url} found.`);
  }
}

runtime.Deno = {};
// TODO: replace used runtime variables

const jsonr = (cmd) => {

  import("../../main.js");
};

givenApi("http://localhost:3000")
  .withGetEndpoint("/pets")
  .returning({ id: 1, name: "dog" })
  .withPostEndpoint("/pets")
  .returning("Unknown exception occurred");

Deno.test("When calling post endpoint with status assert jsonr command should fail", () => {
  //jsonr() command behind the scene can call Deno.test?
  jsonr("localhost:3000/pets -m POST -s 200");
  //.shouldExitNonZeroCode()
  //.shouldContainOutput("invalid status returned");
  console.log("testing...");
});
