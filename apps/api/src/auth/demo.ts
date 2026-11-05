/**
 * The demo family (seeded by db/seed.ts) is for looking around, not for building a schedule:
 * it can't add events (hand-test fixes, 2026-10-28). The demo parent's email (S14-01: a parent row) is the only marker the
 * demo has, so this module is the one place that knows it.
 */
import type { Queryable } from "../db";
import { HttpError } from "../http/errors";

export const DEMO_LOGIN_EMAIL = "demo@example.com";

/** True for the demo login, ignoring case and surrounding spaces (logins are matched case-insensitively). */
export const isDemoLogin = (email: string | null | undefined): boolean =>
  typeof email === "string" && email.trim().toLowerCase() === DEMO_LOGIN_EMAIL;

export async function isDemoFamily(db: Queryable, familyId: string): Promise<boolean> {
  const { rows } = await db.query("SELECT 1 FROM parent WHERE family_id = $1 AND lower(email) = $2", [familyId, DEMO_LOGIN_EMAIL]);
  return rows.length > 0;
}

/** 403 `demo_read_only` when the signed-in family is the demo. */
export async function assertNotDemo(db: Queryable, familyId: string, message: string): Promise<void> {
  if (await isDemoFamily(db, familyId)) throw new HttpError(403, "demo_read_only", message);
}
