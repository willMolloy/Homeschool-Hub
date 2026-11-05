import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { HttpError } from "../http/errors";
import { hashPassword, verifyPassword } from "../auth/password";
import { SESSION_COOKIE, SESSION_DAYS, hashSessionToken, newSessionToken, sessionCookieOptions, sweepExpiredSessions } from "../auth/session";
import { withTransaction } from "../db";
import { lastUsedAccount, removeViewer } from "../services/membership";

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

    const { rows } = await app.db.query<{ id: string; name: string; password_hash: string }>(
      "SELECT id, name, password_hash FROM parent WHERE lower(email) = lower($1)", [email]);
    const person = rows[0];
    const ok = await verifyPassword(password, person?.password_hash ?? (await getDummyHash()));
    // S15-01: the account that opens is the one this person used last (their own family, or a co-op they view).
    const account = person && ok ? await lastUsedAccount(app.db, person.id) : null;
    if (!person || !ok || !account) {
      return reply.code(401).send({ error: "invalid_credentials", message: "That email and password don't match." });
    }

    const token = newSessionToken();
    await app.db.query(
      `INSERT INTO session (id, family_id, parent_id, expires_at) VALUES ($1, $2, $3, now() + make_interval(days => $4))`,
      [hashSessionToken(token), account.familyId, person.id, SESSION_DAYS]);
    await app.db.query("UPDATE family_member SET last_used_at = now() WHERE family_id = $1 AND parent_id = $2", [account.familyId, person.id]);
    await sweepExpiredSessions(app.db); // S14-04: expired sessions are cleaned up on sign-in
    reply.setCookie(SESSION_COOKIE, token, sessionCookieOptions(app.config.NODE_ENV === "production"));
    return { familyId: account.familyId, familyName: account.familyName, parentName: person.name, role: account.role };
  });

  /**
   * S15-01: look at another of this person's accounts. The membership is re-checked here (the session's foreign key checks it again):
   * an account the person does not belong to, and one that does not exist, get the same answer.
   */
  app.post("/api/auth/switch", { config: { rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (req) => {
    const parsed = z.strictObject({ familyId: z.string().uuid() }).safeParse(req.body);
    const unavailable = () => new HttpError(404, "account_unavailable", "That account isn't available.");
    if (!parsed.success || !req.parentId) throw unavailable();
    const sessionId = hashSessionToken(req.cookies[SESSION_COOKIE] ?? "");
    const moved = await app.db.query<{ role: "parent" | "viewer"; name: string }>(
      `UPDATE session s SET family_id = m.family_id FROM family_member m JOIN family f ON f.id = m.family_id
        WHERE s.id = $1 AND s.parent_id = m.parent_id AND m.family_id = $2 RETURNING m.role, f.name`, [sessionId, parsed.data.familyId]);
    const to = moved.rows[0];
    if (!to) throw unavailable();
    await app.db.query("UPDATE family_member SET last_used_at = now() WHERE family_id = $1 AND parent_id = $2", [parsed.data.familyId, req.parentId]);
    return { familyId: parsed.data.familyId, familyName: to.name, role: to.role };
  });

  /** S15-01: a viewer leaves the account they are looking at. This device stays signed in to their next account, if there is one. */
  app.post("/api/auth/leave", async (req, reply) => {
    if (req.role !== "viewer" || !req.parentId) throw new HttpError(403, "not_a_viewer", "Only a viewer can leave an account.");
    const sessionId = hashSessionToken(req.cookies[SESSION_COOKIE] ?? "");
    const next = await withTransaction(app.db, async (tx) => {
      await removeViewer(tx, req.familyId, req.parentId);
      const person = await tx.query("SELECT 1 FROM parent WHERE id = $1", [req.parentId]);
      const to = person.rowCount ? await lastUsedAccount(tx, req.parentId) : null;
      // Removing the membership took this session with it; keep the device signed in to the next account.
      if (to) await tx.query("INSERT INTO session (id, family_id, parent_id, expires_at) VALUES ($1, $2, $3, now() + make_interval(days => $4))", [sessionId, to.familyId, req.parentId, SESSION_DAYS]);
      return to;
    });
    if (!next) reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return { next };
  });

  // Public and idempotent: always 204, so the client can always get back to a clean state.
  app.post("/api/auth/logout", { config: { public: true } }, async (req, reply) => {
    const token = req.cookies[SESSION_COOKIE];
    if (token) await app.db.query("DELETE FROM session WHERE id = $1", [hashSessionToken(token)]);
    reply.clearCookie(SESSION_COOKIE, { path: "/" });
    return reply.code(204).send();
  });
}
