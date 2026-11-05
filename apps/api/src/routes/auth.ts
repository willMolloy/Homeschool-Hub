import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { HttpError } from "../http/errors";
import { hashPassword, verifyPassword } from "../auth/password";
import { SESSION_COOKIE, SESSION_DAYS, hashSessionToken, newSessionToken, sessionCookieOptions, sweepExpiredSessions } from "../auth/session";

const LoginBody = z.strictObject({ email: z.string().trim().min(1).max(320).refine((s) => !s.includes("\u0000")), password: z.string().min(1).max(1000) });

// Verified against when the email is unknown, so response time doesn't reveal which emails exist.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("not-a-real-password-" + Math.random()));

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/auth/login", {
    config: { public: true, rateLimit: { max: 10, timeWindow: "1 minute" } },
  }, async (req, reply) => {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) {
      const extra = parsed.error.issues.find((i) => i.code === "unrecognized_keys");
      throw new HttpError(400, "invalid_request", extra ? extra.message : "Email and password are required.");
    }
    const { email, password } = parsed.data;

    const { rows } = await app.db.query<{ id: string; family_id: string; name: string; family_name: string; password_hash: string }>(
      `SELECT p.id, p.family_id, p.name, f.name AS family_name, p.password_hash
         FROM parent p JOIN family f ON f.id = p.family_id WHERE lower(p.email) = lower($1)`, [email]);
    const family = rows[0];
    const ok = await verifyPassword(password, family?.password_hash ?? (await getDummyHash()));
    if (!family || !ok) {
      return reply.code(401).send({ error: "invalid_credentials", message: "That email and password don't match." });
    }

    const token = newSessionToken();
    await app.db.query(
      `INSERT INTO session (id, family_id, parent_id, expires_at) VALUES ($1, $2, $3, now() + make_interval(days => $4))`,
      [hashSessionToken(token), family.family_id, family.id, SESSION_DAYS]);
    await sweepExpiredSessions(app.db); // S14-04: expired sessions are cleaned up on sign-in
    reply.setCookie(SESSION_COOKIE, token, sessionCookieOptions(app.config.NODE_ENV === "production"));
    return { familyId: family.family_id, familyName: family.family_name, parentName: family.name };
  });

  // Public and idempotent: always 204, so the client can always get back to a clean state.
  app.post("/api/auth/logout", { config: { public: true } }, async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE];
    if (token) await app.db.query("DELETE FROM session WHERE id = $1", [hashSessionToken(token)]);
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return reply.code(204).send();
  });
}
