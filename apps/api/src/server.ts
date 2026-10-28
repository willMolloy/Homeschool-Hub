import { buildApp } from "./app";

const port = Number(process.env.PORT ?? 3000);
const app = buildApp();
await app.listen({ port, host: "0.0.0.0" });
console.log(`api listening on http://localhost:${port}`);
