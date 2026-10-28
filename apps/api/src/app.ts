import { createServer, type IncomingMessage, type Server, type ServerResponse } from "node:http";
import { ENGINE_VERSION } from "@hh/engine";

// Placeholder API: health check only. Ticket S1-05 replaces node:http with Fastify.
export function buildServer(): Server {
  return createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.method === "GET" && req.url === "/api/health") {
      res.writeHead(200, { "content-type": "application/json" });
      res.end(JSON.stringify({ ok: true, engineVersion: ENGINE_VERSION }));
      return;
    }
    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: "not_found" }));
  });
}
