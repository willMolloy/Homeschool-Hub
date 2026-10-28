import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createHash, randomBytes } from "node:crypto";

export const SESSION_COOKIE = "hh_session";
export const SESSION_DAYS = 30;
export const SESSION_MAX_AGE_S = SESSION_DAYS * 24 * 60 * 60;

/** 32 random bytes, base64url. This goes in the cookie and is never stored. */
export function newSessionToken(): string {
  return randomBytes(32).toString("base64url");
}

/** session.id = SHA-256 hex of the cookie token. */
export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function sessionCookieOptions(production: boolean) {
  return { httpOnly: true, sameSite: "lax" as const, secure: production, path: "/", maxAge: SESSION_MAX_AGE_S };
}

// ---------------------------------------------------------------- session check (S1-13)

declare module "fastify" {
  interface FastifyRequest {
    /** Set by the session hook on protected routes. The ONLY source of family id for queries. */
    familyId: string;
  }
  interface FastifyContextConfig {
    /** Route needs no session (health, login, logout). */
    public?: boolean;
  }
}

/**
 * Adds a preHandler on the root instance: every /api/* route except those with
 * `config: { public: true }` needs a live hh_session cookie, else 401 `unauthenticated`.
 * Sliding expiry: at most once an hour, last_seen_at = now() and expires_at = now() + 30 days
 * (and the cookie is re-sent with a fresh max-age).
 */
export function registerSessionAuth(app: FastifyInstance): void {
  app.decorateRequest("familyId", "");
  app.addHook("preHandler", async (req: FastifyRequest, reply: FastifyReply) => {
    const url = req.routeOptions.url;
    if (!url || !url.startsWith("/api/") || req.routeOptions.config.public) return;
    const token = req.cookies[SESSION_COOKIE];
    if (!token) return reply.code(401).send({ error: "unauthenticated" });
    const id = hashSessionToken(token);
    const { rows } = await app.db.query<{ family_id: string; stale: boolean }>(
      `SELECT family_id, last_seen_at < now() - interval '1 hour' AS stale
         FROM session WHERE id = $1 AND expires_at > now()`, [id]);
    const s = rows[0];
    if (!s) return reply.code(401).send({ error: "unauthenticated" });
    req.familyId = s.family_id;
    if (s.stale) {
      await app.db.query(
        `UPDATE session SET last_seen_at = now(), expires_at = now() + make_interval(days => $2) WHERE id = $1`,
        [id, SESSION_DAYS]);
      reply.setCookie(SESSION_COOKIE, token, sessionCookieOptions(app.config.NODE_ENV === "production"));
    }
  });
}
