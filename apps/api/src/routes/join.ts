/** The join page's two calls (S14-02): what a link is for, and redeeming it. Public (no session) and throttled. */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { HttpError } from "../http/errors";
import { passwordProblem } from "../auth/passwordRules";
import { SESSION_COOKIE, SESSION_DAYS, sessionCookieOptions, sweepExpiredSessions } from "../auth/session";
import { EmailInUse, INVITE_UNAVAILABLE_MESSAGE, InviteUnavailable, previewInvite, redeemInvite } from "../services/invites";

const JoinBody = z.strictObject({
  name: z.string().trim().min(1, "Enter your name.").max(100, "Names can be up to 100 characters.").refine((s) => !s.includes("\u0000"), "Enter your name."),
  email: z.string().trim().max(320).regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/, "Enter a valid email address."),
  password: z.string().max(1000, "Use at most 1000 characters."),
});

/** One answer for every link that does not work: never says whether it was expired, used, cancelled or unknown. */
const unavailable = () => new HttpError(404, "invite_unavailable", INVITE_UNAVAILABLE_MESSAGE);

export async function joinRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Params: { token: string } }>("/api/join/:token", { config: { public: true, rateLimit: { max: 30, timeWindow: "1 minute" } } }, async (req) => {
    const preview = await previewInvite(app.db, req.params.token);
    if (!preview) throw unavailable();
    return preview;
  });

  app.post<{ Params: { token: string } }>("/api/join/:token", { config: { public: true, rateLimit: { max: 10, timeWindow: "1 minute" } } }, async (req, reply) => {
    const parsed = JoinBody.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, "invalid_request", parsed.error.issues[0]?.message ?? "Check what you typed.");
    const problem = passwordProblem(parsed.data.password);
    if (problem) throw new HttpError(400, "invalid_request", problem);
    try {
      const joined = await redeemInvite(app.db, req.params.token, parsed.data, SESSION_DAYS);
      await sweepExpiredSessions(app.db);
      reply.setCookie(SESSION_COOKIE, joined.sessionToken, sessionCookieOptions(app.config.NODE_ENV === "production"));
      return reply.code(201).send({ familyId: joined.familyId, familyName: joined.familyName, parentName: joined.parentName, kind: joined.kind });
    } catch (e) {
      if (e instanceof InviteUnavailable) throw unavailable();
      if (e instanceof EmailInUse) throw new HttpError(409, "email_in_use", "That email is already used for a sign-in. Try a different one.");
      throw e;
    }
  });
}
