/** The join page's two calls (S14-02): what a link is for, and redeeming it. Public (no session) and throttled. */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { HttpError } from "../http/errors";
import { passwordProblem } from "../auth/passwordRules";
import { hashPassword, verifyPassword } from "../auth/password";
import { SESSION_COOKIE, SESSION_DAYS, hashSessionToken, sessionCookieOptions, sweepExpiredSessions } from "../auth/session";
import { AlreadyMember, EmailInUse, INVITE_UNAVAILABLE_MESSAGE, InviteUnavailable, previewInvite, redeemInvite, type Redeemer } from "../services/invites";

const JoinBody = z.strictObject({
  name: z.string().trim().min(1, "Enter your name.").max(100, "Names can be up to 100 characters.").refine((s) => !s.includes("\u0000"), "Enter your name."),
  email: z.string().trim().max(320).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address."),
  password: z.string().max(1000, "Use at most 1000 characters."),
});

// S15-01: someone who already has a login joins a view-only link by signing in ("existing") or, already signed in, with their session.
const ExistingBody = z.strictObject({ existing: z.literal(true), email: z.string().trim().min(1).max(320).refine((s) => !s.includes("\u0000")), password: z.string().min(1).max(1000) });
const SessionBody = z.strictObject({ useSession: z.literal(true) });
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= hashPassword("not-a-real-password-" + Math.random()));

/** One answer for every link that does not work: never says whether it was expired, used, cancelled or unknown. */
const unavailable = () => new HttpError(404, "invite_unavailable", INVITE_UNAVAILABLE_MESSAGE);

export async function joinRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { token: string } }>("/api/join/:token", { config: { public: true, rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (req) => {
    const preview = await previewInvite(app.db, req.params.token);
    if (!preview) throw unavailable();
    return preview;
  });

  app.post<{ Params: { token: string } }>("/api/join/:token", { config: { public: true, rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    let who: Redeemer;
    let sessionId: string | null = null;
    if (body.useSession !== undefined) {
      if (!SessionBody.safeParse(body).success) throw new HttpError(400, "invalid_request", "Check what you typed.");
      sessionId = hashSessionToken(req.cookies[SESSION_COOKIE] ?? "");
      const { rows } = await app.db.query<{ parent_id: string | null }>("SELECT parent_id FROM session WHERE id = $1 AND expires_at > now()", [sessionId]);
      if (!rows[0]?.parent_id) throw new HttpError(401, "unauthenticated", "Sign in first.");
      who = { type: "session", parentId: rows[0].parent_id, sessionId };
    } else if (body.existing !== undefined) {
      const parsed = ExistingBody.safeParse(body);
      if (!parsed.success) throw new HttpError(400, "invalid_request", "Email and password are required.");
      // Only a working link gets as far as checking a password, so this is not a way to guess passwords without one.
      if (!(await previewInvite(app.db, req.params.token))) throw unavailable();
      // The sign-in's own rules: the same answer and timing for an unknown email and a wrong password.
      const { rows } = await app.db.query<{ id: string; password_hash: string }>("SELECT id, password_hash FROM parent WHERE lower(email) = lower($1)", [parsed.data.email]);
      const ok = await verifyPassword(parsed.data.password, rows[0]?.password_hash ?? (await getDummyHash()));
      if (!rows[0] || !ok) throw new HttpError(401, "invalid_credentials", "That email and password don't match.");
      who = { type: "person", parentId: rows[0].id };
    } else {
      const parsed = JoinBody.safeParse(body);
      if (!parsed.success) throw new HttpError(400, "invalid_request", parsed.error.issues[0]?.message ?? "Check what you typed.");
      const problem = passwordProblem(parsed.data.password);
      if (problem) throw new HttpError(400, "invalid_request", problem);
      who = { type: "new", ...parsed.data };
    }
    try {
      const joined = await redeemInvite(app.db, req.params.token, who, SESSION_DAYS);
      await sweepExpiredSessions(app.db);
      if (joined.sessionToken) reply.setCookie(SESSION_COOKIE, joined.sessionToken, sessionCookieOptions(app.config.NODE_ENV === "production"));
      return reply.code(201).send({ familyId: joined.familyId, familyName: joined.familyName, parentName: joined.parentName, kind: joined.kind, role: joined.role });
    } catch (e) {
      if (e instanceof InviteUnavailable) throw unavailable();
      if (e instanceof EmailInUse) throw new HttpError(409, "email_in_use", "That email is already used for a sign-in. Try a different one.");
      if (e instanceof AlreadyMember) throw new HttpError(409, "already_member", "You already have access to this account.");
      throw e;
    }
  });
}
