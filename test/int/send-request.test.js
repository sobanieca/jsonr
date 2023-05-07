import { deps } from "../../src/deps.js";

// API setup
const routeRules = [];

const givenApi = (baseUrl) => {
  const initRule = (method, endpoint, returnedStatus, returnedBody) => {
    routeRules.push({
      route: `${baseUrl}${endpoint}`,
      method: method,
      status: returnedStatus,
      body: returnedBody
    });
    currentRouteRuleIndex++;
  };

  const api = {
    withGetEndpoint: (endpoint, returnedStatus, returnedBody = null) => {
      initRule("GET", endpoint, returnedStatus, returnedBody);
      return api;
    },
    withPostEndpoint: (endpoint, returnedStatus, returnedBody) => {
      initRule("POST", endpoint, returnedStatus, returnedBody);
      return api;
    },
    withPutEndpoint: (endpoint, returnedStatus, returnedBody) => {
      initRule("PUT", endpoint, returnedStatus, returnedBody);
      return api;
    },
    withDeleteEndpoint: (endpoint, returnedStatus, returnedBody) => {
      initRule("DELETE", endpoint, returnedStatus, returnedBody);
      return api;
    }
  };

  return api;
};

deps.fetch = async (url, opts) => {
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
// EO API setup

deps.Deno = {};

// File system setup:
const files = [];

const givenFile = (file, content) => {
  files.push({ file, content });
}

deps.Deno.lstat = async (filePath) => {
  if(!files.find(x => x.file == filePath))
    throw new Error("File not found");

  return Promise.resolve();
}

deps.Deno.readTextFile = async (filePath) => {
  const file = files.find(x => x.file == filePath);
  return Promise.resolve(file.content);
}

// EO File system setup

// Deps setup
deps.Deno.exit = (code) => console.log(`Exiting with code: ${code}`);
deps.Deno.inspect = () => {};

const output = [];

deps.logging.log.getLogger = () => ({
  debug: (msg) => {
    output.push(msg);
  },
  info: (msg) => {
    output.push(msg);
  },
  warning: (msg) => {
    output.push(msg);
  },
  error: (msg) => {
    output.push(msg);
  }
});
// EO Deps setup

const test = (cmd) => {
  Deno.test(cmd, () => {
    import("../../main.js");
  });
};

givenApi("http://localhost:3000")
  .withGetEndpoint("/pets", 200, { id: 1, name: "dog" })
  .withPostEndpoint("/pets", 500, "Unknown exception occurred");

test("jsonr http://test/posts");

/*Deno.test("When calling post endpoint with status assert jsonr command should fail", () => {
  //jsonr() command behind the scene can call Deno.test?
  jsonr("localhost:3000/pets -m POST -s 200");
  //.shouldExitNonZeroCode()
  //.shouldContainOutput("invalid status returned");
  console.log("testing...");
});*/
