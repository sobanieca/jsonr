import { Application, Router } from "https://deno.land/x/oak/mod.ts";
const app = new Application();
const router = new Router();

router.get("/sample-get", (context) => {
 context.response.body = { id: "sample-get" };
});

router.post("/sample-post", (context) => {
  context.response.body = { id: "sample-post" };
});

router.delete("/sample-delete", (context) => {
  context.response.status = 204;
});

router.put("/sample-put", (context) => {
  context.response.body = { id: "sample-put", ...context.request.body };
});

router.get("/sample-exception", (context) => {
  throw new Error("Sample exception");
});

app.use(router.routes());

const port = 3000;
console.log(`Listening on port ${port}...`);
await app.listen({ port });

