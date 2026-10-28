/**
 * The demo family (seeded by db/seed.ts) is for looking around, not for building a schedule:
 * it can't add events (hand-test fixes, 2026-10-28). The login email is the only marker the
 * demo has, so this module is the one place that knows it.
 */
import type { Queryable } from "../db";
import { HttpError } from "../http/errors";

export const DEMO_LOGIN_EMAIL = "demo@example.com";

/** True for the demo login, ignoring case and surrounding spaces (logins are matched case-insensitively). */
export const isDemoLogin = (email: string | null | undefined): boolean =>
  typeof email === "string" && email.trim().toLowerCase() === DEMO_LOGIN_EMAIL;

export async function isDemoFamily(db: Queryable, familyId: string): Promise<boolean> {
  const { rows } = await db.query<{ login_email: string | null }>("SELECT login_email FROM family WHERE id = $1", [familyId]);
  return isDemoLogin(rows[0]?.login_email);
}

/** 403 `demo_read_only` when the signed-in family is the demo. */
export async function assertNotDemo(db: Queryable, familyId: string, message: string): Promise<void> {
  if (await isDemoFamily(db, familyId)) throw new HttpError(403, "demo_read_only", message);
}
