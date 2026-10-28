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
