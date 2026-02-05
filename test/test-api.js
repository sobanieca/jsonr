import { Hono } from "jsr:@hono/hono@4.7.9";

const app = new Hono();

app.onError((err, c) => {
  console.log("Unhandled ERROR:");
  console.log(err);
  return c.text("Internal Server Error", 500);
});

app.get("/sample", (c) => {
  return c.json({ id: "sample-get" });
});

app.post("/sample", (c) => {
  return c.json({ id: "sample-post" });
});

app.delete("/sample", (c) => {
  return c.body(null, 204);
});

app.put("/sample", async (c) => {
  const body = await c.req.json();
  return c.json({ id: "sample-put", ...body });
});

app.get("/exception", () => {
  throw new Error("Sample exception");
});

app.get("/redirect", (c) => {
  return c.redirect("/redirect-target");
});

app.get("/redirect-target", (c) => {
  return c.json({ msg: "redirect-target" });
});

app.get("/users/:id", (c) => {
  return c.json({ id: c.req.param("id") });
});

app.get("/echo-headers", (c) => {
  const headers = {};
  for (const [key, value] of c.req.raw.headers.entries()) {
    headers[key] = value;
  }
  return c.json(headers);
});

app.get("/auth-required", (c) => {
  if (c.req.header("Authorization") == "123") {
    return c.json({ id: "sample-post" });
  } else {
    return c.body(null, 401);
  }
});

const port = 3000;
console.log(`Listening on port ${port}...`);
Deno.serve({ port }, app.fetch);
