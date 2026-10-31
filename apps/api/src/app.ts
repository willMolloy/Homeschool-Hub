import Fastify, { type FastifyError, type FastifyInstance } from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import { ENGINE_VERSION } from "@hh/engine";
import type { Config } from "./config";
import { createPool, type Db } from "./db";
import { authRoutes } from "./routes/auth";
import { meRoutes } from "./routes/me";
import { familyRoutes } from "./routes/family";
import { childrenRoutes } from "./routes/children";
import { subjectsRoutes } from "./routes/subjects";
import { planRoutes } from "./routes/plan";
import { assignmentsRoutes } from "./routes/assignments";
import { blockedRangesRoutes } from "./routes/blockedRanges";
import { eventsRoutes } from "./routes/events";
import { eventPreviewRoutes } from "./routes/eventPreview";
import { timeZonesRoutes } from "./routes/timezones";
import { weightsRoutes } from "./routes/weights";
import { checkInsRoutes } from "./routes/checkIns";
import { registerSessionAuth } from "./auth/session";
import { HttpError } from "./http/errors";
import { loggerOptions, type LogStream } from "./http/logging";
import { systemClock } from "./http/today";

declare module "fastify" {
  interface FastifyInstance {
    db: Db;
    config: Config;
    /** The clock for every "what day is it" (BuildOptions.now). */
    now: () => Date;
  }
}

export interface BuildOptions {
  /** Use an existing pool (tests share one). Otherwise one is created from config and closed with the app. */
  db?: Db;
  /** Send log lines here instead of stdout (tests capture them; set config.LOG_LEVEL to see anything in test). */
  logStream?: LogStream;
  /** The clock (tests pass a fixed instant). Default: the real one. */
  now?: () => Date;
}

export function buildApp(config: Config, opts: BuildOptions = {}): FastifyInstance {
  const app = Fastify({ logger: loggerOptions(config, opts.logStream) });

  app.setNotFoundHandler((_req, reply) => {
    reply.code(404).send({ error: "not_found" });
  });

  app.setErrorHandler((err: FastifyError | HttpError, req, reply) => {
    if (err instanceof HttpError) {
      return reply.code(err.statusCode).send({ error: err.code, message: err.message });
    }
    if ((err as FastifyError).validation) {
      return reply.code(400).send({ error: "invalid_request", message: err.message, details: (err as FastifyError).validation });
    }
    const status = typeof err.statusCode === "number" && err.statusCode >= 400 ? err.statusCode : 500;
    if (status >= 500) req.log.error({ err }, "request failed");
    return reply.code(status).send({
      error: status >= 500 ? "internal_error" : (err as FastifyError).code ?? "error",
      message: status >= 500 ? "Something went wrong." : err.message,
    });
  });

  const db = opts.db ?? createPool(config, app.log);
  app.decorate("db", db);
  app.decorate("config", config);
  app.decorate("now", opts.now ?? systemClock);
  if (!opts.db) app.addHook("onClose", async () => db.end());

  app.register(cookie, { secret: config.SESSION_SECRET });
  // Opt-in per route (config.rateLimit); only login uses it in Sprint 1.
  app.register(rateLimit, {
    global: false,
    errorResponseBuilder: () => new HttpError(429, "rate_limited", "Too many attempts. Wait a minute and try again."),
  });

  registerSessionAuth(app);

  // Always 200 so the web app can show a "database down" banner instead of an error page.
  app.get("/api/health", { config: { public: true } }, async () => {
    let dbStatus: "ok" | "down" = "ok";
    try {
      await db.query("select 1");
    } catch {
      dbStatus = "down";
    }
    return { ok: true, engineVersion: ENGINE_VERSION, db: dbStatus };
  });

  app.register(authRoutes);
  app.register(meRoutes);
  app.register(familyRoutes);
  app.register(timeZonesRoutes);
  app.register(childrenRoutes);
  app.register(subjectsRoutes);
  app.register(assignmentsRoutes);
  app.register(blockedRangesRoutes);
  app.register(eventsRoutes);
  app.register(planRoutes);
  app.register(eventPreviewRoutes);
  app.register(weightsRoutes);
  app.register(checkInsRoutes);

  return app;
}
