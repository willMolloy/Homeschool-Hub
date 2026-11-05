import type pg from "pg";
import { hashPassword } from "../../src/auth/password";
import { hashSessionToken, newSessionToken } from "../../src/auth/session";

/** A person who only views `familyId` (no home family), with a password and a live session looking at that family. */
export async function viewerOf(pool: pg.Pool, familyId: string, email: string, password = "viewer-test-password", name = "Test viewer"): Promise<{ parentId: string; cookies: { hh_session: string } }> {
  const { rows } = await pool.query<{ id: string }>("INSERT INTO parent (family_id, name, email, password_hash) VALUES (NULL, $1, $2, $3) RETURNING id", [name, email, await hashPassword(password)]);
  const parentId = rows[0]!.id;
  await pool.query("INSERT INTO family_member (family_id, parent_id, role) VALUES ($1, $2, 'viewer')", [familyId, parentId]);
  return { parentId, cookies: { hh_session: await sessionFor(pool, familyId, parentId) } };
}

/** A live session for a person who is a member of `familyId`. */
export async function sessionFor(pool: pg.Pool, familyId: string, parentId: string): Promise<string> {
  const token = newSessionToken();
  await pool.query("INSERT INTO session (id, family_id, parent_id, expires_at) VALUES ($1, $2, $3, now() + interval '1 day')", [hashSessionToken(token), familyId, parentId]);
  return token;
}
