import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { HttpError } from "../app";
import { hashPassword, verifyPassword } from "../auth/password";
import { SESSION_COOKIE, SESSION_DAYS, hashSessionToken, newSessionToken, sessionCookieOptions } from "../auth/session";

const LoginBody = z.object({ email: z.string().trim().min(1).max(320), password: z.string().min(1).max(1000) });

// Verified against when the email is unknown, so response time doesn't reveal which emails exist.
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("not-a-real-password-" + Math.random()));

export async function authRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/auth/login", {
    config: { rateLimit: { max: 10, timeWindow: "1 minute" } },
  }, async (req, reply) => {
    const parsed = LoginBody.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "invalid_request", "Email and password are required.");
    const { email, password } = parsed.data;

    const { rows } = await app.db.query<{ id: string; name: string; password_hash: string | null }>(
      "SELECT id, name, password_hash FROM family WHERE lower(login_email) = lower($1)", [email]);
    const family = rows[0];
    const ok = await verifyPassword(password, family?.password_hash ?? (await getDummyHash()));
    if (!family || !family.password_hash || !ok) {
      return reply.code(401).send({ error: "invalid_credentials", message: "That email and password don't match." });
    }

    const token = newSessionToken();
    await app.db.query(
      `INSERT INTO session (id, family_id, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))`,
      [hashSessionToken(token), family.id, SESSION_DAYS]);
    reply.setCookie(SESSION_COOKIE, token, sessionCookieOptions(app.config.NODE_ENV === "production"));
    return { familyId: family.id, familyName: family.name };
  });
}
