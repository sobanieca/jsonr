import { Application, Router } from "https://deno.land/x/oak@14.2.0/mod.ts";
const app = new Application();
const router = new Router();

app.addEventListener("error", (evt) => {
  console.log("Unhandled ERROR:");
  console.log(evt.error);
});

router.get("/sample", (context) => {
  context.response.body = { id: "sample-get" };
});

router.post("/sample", (context) => {
  context.response.body = { id: "sample-post" };
});

router.delete("/sample", (context) => {
  context.response.status = 204;
});

router.put("/sample", async (context) => {
  const body = await context.request.body.json();
  context.response.body = { id: "sample-put", ...body };
});

router.get("/exception", () => {
  throw new Error("Sample exception");
});

router.get("/redirect", (context) => {
  context.response.redirect("/redirect-target");
});

router.get("/redirect-target", (context) => {
  context.response.body = { msg: "redirect-target" };
});

router.get("/auth-required", (context) => {
  if (context.request.headers.get("Authorization") == "123") {
    context.response.body = { id: "sample-post" };
  } else {
    context.response.status = 401;
  }
});

app.use(router.routes());

const port = 3000;
console.log(`Listening on port ${port}...`);
await app.listen({ port });
