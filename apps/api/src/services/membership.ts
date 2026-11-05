/** S15-01: membership changes that more than one route makes. Roles live in `family_member`; a session names the person and the account. */
import type { Queryable } from "../db";

/**
 * Ends one person's view-only membership of one family (never a parent's). Their sessions for it go with it (the sessions' foreign key),
 * and a person who then belongs to nothing and has no home family is removed, so they are not left as an orphan login.
 */
export async function removeViewer(db: Queryable, familyId: string, parentId: string): Promise<boolean> {
  const gone = await db.query("DELETE FROM family_member WHERE family_id = $1 AND parent_id = $2 AND role = 'viewer'", [familyId, parentId]);
  if ((gone.rowCount ?? 0) === 0) return false;
  await db.query("DELETE FROM parent WHERE id = $1 AND family_id IS NULL AND NOT EXISTS (SELECT 1 FROM family_member WHERE parent_id = $1)", [parentId]);
  return true;
}

export interface AccountChoice { familyId: string; familyName: string; role: "parent" | "viewer" }

/** The account a person's sign-in opens: the one they used last (a person who has never switched opens their own family first). */
export async function lastUsedAccount(db: Queryable, parentId: string): Promise<AccountChoice | null> {
  const { rows } = await db.query<{ family_id: string; name: string; role: "parent" | "viewer" }>(
    `SELECT m.family_id, f.name, m.role FROM family_member m JOIN family f ON f.id = m.family_id WHERE m.parent_id = $1
      ORDER BY m.last_used_at DESC NULLS LAST, (m.role = 'parent') DESC, m.created_at, m.family_id LIMIT 1`, [parentId]);
  const r = rows[0];
  return r ? { familyId: r.family_id, familyName: r.name, role: r.role } : null;
}

/** Every account this person belongs to (their own memberships only), in the order they joined. */
export async function accountsOf(db: Queryable, parentId: string): Promise<AccountChoice[]> {
  const { rows } = await db.query<{ family_id: string; name: string; role: "parent" | "viewer" }>(
    `SELECT m.family_id, f.name, m.role FROM family_member m JOIN family f ON f.id = m.family_id WHERE m.parent_id = $1 ORDER BY m.created_at, m.family_id`, [parentId]);
  return rows.map((r) => ({ familyId: r.family_id, familyName: r.name, role: r.role }));
}
