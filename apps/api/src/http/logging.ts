import type { FastifyReply, FastifyRequest, FastifyServerOptions } from "fastify";
import { defaultLogLevel, type Config } from "../config";

/**
 * Paths censored in every log line. Defense in depth: the serializers below never log headers or bodies,
 * but an `req.log.info({ req })` or a stray object with a password must not leak either.
 */
export const REDACT_PATHS = [
  "req.headers.cookie",
  "req.headers.authorization",
  'res.headers["set-cookie"]',
  "headers.cookie",
  "headers.authorization",
  'headers["set-cookie"]',
  "password",
  "password_hash",
  "*.password",
  "*.password_hash",
];

/** Only what we need to follow a request: no headers, no body, no cookies. Query strings carry no secrets. */
export const serializers = {
  req: (req: FastifyRequest) => ({
    method: req.method,
    url: req.url,
    route: req.routeOptions?.url,
    ip: req.ip,
  }),
  res: (res: Pick<FastifyReply, "statusCode">) => ({ statusCode: res.statusCode }),
};

export interface LogStream {
  write(line: string): void;
}

/** Fastify logger options: structured JSON (pino) to stdout, or to `stream` (tests capture lines). */
export function loggerOptions(config: Pick<Config, "NODE_ENV" | "LOG_LEVEL">, stream?: LogStream): FastifyServerOptions["logger"] {
  return {
    level: config.LOG_LEVEL ?? defaultLogLevel(config.NODE_ENV),
    redact: { paths: REDACT_PATHS, censor: "[redacted]" },
    serializers,
    ...(stream ? { stream } : {}),
  };
}
