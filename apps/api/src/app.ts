import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import { ENGINE_VERSION } from "@hh/engine";
import type { Config } from "./config";

/** Error with an HTTP status and a stable machine-readable code, rendered as `{ error: code, message }`. */
export class HttpError extends Error {
  constructor(public statusCode: number, public code: string, message?: string) {
    super(message ?? code);
  }
}

export function buildApp(config: Config): FastifyInstance {
  const app = Fastify({ logger: config.NODE_ENV === "development" ? { level: "warn" } : false });

  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({ error: "not_found" });
  });

  app.setErrorHandler((err: FastifyError | HttpError, _req, reply) => {
    if (err instanceof HttpError) {
      return reply.code(err.statusCode).send({ error: err.code, message: err.message });
    }
    if ((err as FastifyError).validation) {
      return reply.code(400).send({ error: "invalid_request", message: err.message, details: (err as FastifyError).validation });
    }
    const status = typeof err.statusCode === "number" && err.statusCode >= 400 ? err.statusCode : 500;
    if (status >= 500) app.log.error(err);
    return reply.code(status).send({
      error: status >= 500 ? "internal_error" : (err as FastifyError).code ?? "error",
      message: status >= 500 ? "Something went wrong." : err.message,
    });
  });

  app.get("/api/health", async () => ({ ok: true, engineVersion: ENGINE_VERSION }));

  return app;
}
