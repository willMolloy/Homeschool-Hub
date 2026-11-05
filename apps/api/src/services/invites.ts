/**
 * Invite links (S14-02, S14-03). A token is 32 random bytes (base64url) shown once, to whoever makes the invite; only its SHA-256 is
 * stored. Redeeming is atomic and single use: one UPDATE claims an invite that is unused, not cancelled and not expired, inside the
 * same transaction that makes the parent, so a failed sign-up (an email already in use) does not burn the link. Nothing here
 * says WHY a link failed: unknown, expired, used and cancelled are all `InviteUnavailable`.
 */
import { createHash, randomBytes } from "node:crypto";
import type { Db, Queryable } from "../db";
import { withTransaction } from "../db";
import { hashPassword } from "../auth/password";
import { hashSessionToken, newSessionToken } from "../auth/session";

export const INVITE_DAYS = 7;
export const INVITE_UNAVAILABLE_MESSAGE = "This invite link has expired or was already used. Ask the person who sent it for a new one.";

export class InviteUnavailable extends Error {}
export class EmailInUse extends Error {}

export const newInviteToken = (): string => randomBytes(32).toString("base64url");
export const hashInviteToken = (token: string): string => createHash("sha256").update(token).digest("hex");
/** A token that cannot be one of ours is "unavailable" without touching the database. */
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export interface CreatedInvite { id: string; token: string; expiresAt: string }

/** Makes an invite for a new family (`familyId` null) or for another parent of `familyId`. The token is returned once and never stored. */
export async function createInvite(db: Queryable, o: { familyId: string | null; createdBy: string | null }): Promise<CreatedInvite> {
  const token = newInviteToken();
  const { rows } = await db.query<{ id: string; expires_at: Date }>(
    `INSERT INTO invite (token_hash, family_id, created_by, expires_at) VALUES ($1, $2, $3, now() + make_interval(days => $4)) RETURNING id, expires_at`,
    [hashInviteToken(token), o.familyId, o.createdBy, INVITE_DAYS]);
  return { id: rows[0]!.id, token, expiresAt: rows[0]!.expires_at.toISOString() };
}

export interface InvitePreview { kind: "new_family" | "parent"; familyName: string | null }

/** What a usable link is for, or null when it is unknown, expired, used or cancelled. */
export async function previewInvite(db: Queryable, token: string): Promise<InvitePreview | null> {
  if (!TOKEN_RE.test(token)) return null;
  const { rows } = await db.query<{ family_id: string | null; family_name: string | null }>(
    `SELECT i.family_id, f.name AS family_name FROM invite i LEFT JOIN family f ON f.id = i.family_id
      WHERE i.token_hash = $1 AND i.used_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()`, [hashInviteToken(token)]);
  const r = rows[0];
  return r ? { kind: r.family_id ? "parent" : "new_family", familyName: r.family_name } : null;
}

export interface Joined { familyId: string; familyName: string; parentId: string; parentName: string; kind: "new_family" | "parent"; sessionToken: string }

/** Redeems a link: makes the parent (and, for a new-family link, the family) and a session. Throws InviteUnavailable or EmailInUse. */
export async function redeemInvite(db: Db, token: string, p: { name: string; email: string; password: string }, sessionDays: number): Promise<Joined> {
  if (!TOKEN_RE.test(token)) throw new InviteUnavailable();
  const passwordHash = await hashPassword(p.password); // before the transaction: the claim should not be held while scrypt runs
  try {
    return await withTransaction(db, async (tx) => {
      const claimed = await tx.query<{ family_id: string | null }>(
        `UPDATE invite SET used_at = now()
          WHERE token_hash = $1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > now() RETURNING family_id`, [hashInviteToken(token)]);
      if (claimed.rowCount === 0) throw new InviteUnavailable();
      let familyId = claimed.rows[0]!.family_id;
      const kind = familyId ? "parent" : "new_family";
      if (!familyId) familyId = (await tx.query<{ id: string }>("INSERT INTO family (name) VALUES ('Our family') RETURNING id")).rows[0]!.id;
      const parent = await tx.query<{ id: string }>(
        "INSERT INTO parent (family_id, name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id", [familyId, p.name, p.email, passwordHash]);
      const fam = await tx.query<{ name: string }>("SELECT name FROM family WHERE id = $1", [familyId]);
      const sessionToken = newSessionToken();
      await tx.query("INSERT INTO session (id, family_id, parent_id, expires_at) VALUES ($1, $2, $3, now() + make_interval(days => $4))",
        [hashSessionToken(sessionToken), familyId, parent.rows[0]!.id, sessionDays]);
      return { familyId, familyName: fam.rows[0]!.name, parentId: parent.rows[0]!.id, parentName: p.name, kind, sessionToken };
    });
  } catch (e) {
    if ((e as { code?: string }).code === "23505" && (e as { constraint?: string }).constraint === "parent_email_uq") throw new EmailInUse();
    throw e;
  }
}

export interface OpenInvite { id: string; kind: "new_family" | "parent"; familyId: string | null; familyName: string | null; createdAt: string; expiresAt: string }

/** Invites still usable. `familyId` limits it to that family's own; undefined lists them all (the command). */
export async function listOpenInvites(db: Queryable, familyId?: string): Promise<OpenInvite[]> {
  const { rows } = await db.query<{ id: string; family_id: string | null; family_name: string | null; created_at: Date; expires_at: Date }>(
    `SELECT i.id, i.family_id, f.name AS family_name, i.created_at, i.expires_at FROM invite i LEFT JOIN family f ON f.id = i.family_id
      WHERE i.used_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now() AND ($1::uuid IS NULL OR i.family_id = $1)
      ORDER BY i.created_at DESC, i.id`, [familyId ?? null]);
  return rows.map((r) => ({ id: r.id, kind: r.family_id ? "parent" : "new_family", familyId: r.family_id, familyName: r.family_name, createdAt: r.created_at.toISOString(), expiresAt: r.expires_at.toISOString() }));
}

/** Cancels an open invite. `familyId` set: only that family's own (another family's id finds nothing). Returns whether one was cancelled. */
export async function revokeInvite(db: Queryable, id: string, familyId?: string): Promise<boolean> {
  const { rowCount } = await db.query(
    `UPDATE invite SET revoked_at = now() WHERE id = $1 AND used_at IS NULL AND revoked_at IS NULL AND ($2::uuid IS NULL OR family_id = $2)`, [id, familyId ?? null]);
  return (rowCount ?? 0) > 0;
}
