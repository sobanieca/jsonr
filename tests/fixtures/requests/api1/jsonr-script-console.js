// @ts-nocheck: jsonr specific script file
// Exercises console.log formatting of different values.
const response = await jsonr("echo-headers.http", { environment: "test" });

console.log("Body:", response.body, "status", response.status);
console.log({
  nested: { deeper: { deepest: { tooDeep: { hidden: true } } } },
  list: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  words: ["alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta"],
  empty: {},
  nothing: null,
  missing: undefined,
  "needs-quotes": 'single \' and "double"',
  fn: function named() {},
  arrow: () => {},
});
console.log("%s is %d years and %i days, %f%% sure %o", "jsonr", "5.5", 3.9, "0.5", [1]);
console.log([undefined, null, -0, 1e21, 1e-7, 10n]);
console.log("text", 42, true);
console.log(response.headers.get("CONTENT-TYPE"), response.headers.has("x-missing"));
