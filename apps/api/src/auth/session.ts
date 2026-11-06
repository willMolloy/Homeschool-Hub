import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { createHash, randomBytes } from "node:crypto";
import type { Queryable } from "../db";
import { viewerMayCall } from "./viewerAccess";

export type MemberRole = "parent" | "viewer";

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

/** S14-04: deletes sessions past their expiry (every device, every family: they are dead anyway). Returns how many. Run at sign-in and hourly. */
export async function sweepExpiredSessions(db: Queryable): Promise<number> {
  const { rowCount } = await db.query("DELETE FROM session WHERE expires_at <= now()");
  return rowCount ?? 0;
}

// ---------------------------------------------------------------- session check (S1-13)

declare module "fastify" {
  interface FastifyRequest {
    /** Set by the session hook on protected routes. The ONLY source of family id for queries. */
    familyId: string;
    /** S14-01: the parent who signed in on this session ("" for a session made without one). Never used to scope queries. */
    parentId: string;
    /** S15-01: this person's role in the account the session is looking at, read from the membership on every request. A session made
     *  without a person (old test fixtures only) counts as "parent". Anything that is not "parent" is view-only (auth/viewerAccess.ts). */
    role: MemberRole;
  }
  interface FastifyContextConfig {
    /** Route needs no session (health, login, logout). */
    public?: boolean;
  }
}

/**
 * Adds a preHandler on the root instance: every /api/* route except those with
 * `config: { public: true }` needs a live hh_session cookie, else 401 `unauthenticated`.
 * Sliding expiry (S14-04): a session lasts 30 days from its last use. At most once an hour, last_seen_at = now() and expires_at = now() + 30 days
 * (and the cookie is re-sent with a fresh max-age).
 */
export function registerSessionAuth(app: FastifyInstance): void {
  app.decorateRequest("familyId", "");
  app.decorateRequest("parentId", "");
  app.decorateRequest("role", "parent");
  // onRequest (S17-01, Sprint 15 N1; not preValidation or preHandler): a missing session is 401, and a viewer's write is refused (403), before the body is read or parsed,
  // so an invalid body from either gets no more of an answer than a valid one.
  app.addHook("onRequest", async (req: FastifyRequest, reply: FastifyReply) => {
    const url = req.routeOptions.url;
    if (!url || !url.startsWith("/api/") || req.routeOptions.config.public) return;
    const token = req.cookies[SESSION_COOKIE];
    if (!token) return reply.code(401).send({ error: "unauthenticated" });
    const id = hashSessionToken(token);
    // The membership is read with the session on every request: a person removed from an account (or who left) is refused at once.
    const { rows } = await app.db.query<{ family_id: string; parent_id: string | null; role: MemberRole | null; stale: boolean }>(
      `SELECT s.family_id, s.parent_id, m.role, s.last_seen_at < now() - interval '1 hour' AS stale
         FROM session s LEFT JOIN family_member m ON m.family_id = s.family_id AND m.parent_id = s.parent_id
        WHERE s.id = $1 AND s.expires_at > now()`, [id]);
    const s = rows[0];
    if (!s || (s.parent_id !== null && s.role === null)) return reply.code(401).send({ error: "unauthenticated" });
    req.familyId = s.family_id;
    req.parentId = s.parent_id ?? "";
    req.role = s.role ?? "parent";
    if (req.role === "viewer" && !viewerMayCall(req.method, url)) {
      return reply.code(403).send({ error: "view_only", message: "This account is view-only." });
    }
    if (s.stale) {
      await app.db.query(
        `UPDATE session SET last_seen_at = now(), expires_at = now() + make_interval(days => $2) WHERE id = $1`,
        [id, SESSION_DAYS]);
      reply.setCookie(SESSION_COOKIE, token, sessionCookieOptions(app.config.NODE_ENV === "production"));
    }
  });
}
