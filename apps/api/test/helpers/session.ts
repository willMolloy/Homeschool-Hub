import type pg from "pg";
import { hashSessionToken, newSessionToken } from "../../src/auth/session";

/** A fresh family (no login needed) plus a valid session cookie for it. Delete with `family.id` afterwards. */
export async function signedInFamily(pool: pg.Pool, name = "Test family"): Promise<{ familyId: string; cookies: { hh_session: string } }> {
  const { rows } = await pool.query<{ id: string }>("INSERT INTO family (name) VALUES ($1) RETURNING id", [name]);
  const familyId = rows[0]!.id;
  const token = newSessionToken();
  await pool.query("INSERT INTO session (id, family_id, expires_at) VALUES ($1, $2, now() + interval '1 day')", [hashSessionToken(token), familyId]);
  return { familyId, cookies: { hh_session: token } };
}
