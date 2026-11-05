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
/** S15-01: the person already belongs to that account (as a parent or already as a viewer). The link is not used up. */
export class AlreadyMember extends Error {}

export type InviteRole = "parent" | "viewer";

export const newInviteToken = (): string => randomBytes(32).toString("base64url");
export const hashInviteToken = (token: string): string => createHash("sha256").update(token).digest("hex");
/** A token that cannot be one of ours is "unavailable" without touching the database. */
const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

export interface CreatedInvite { id: string; token: string; expiresAt: string }

/**
 * Makes an invite for a new family (`familyId` null), for another parent of `familyId`, or (S15-01, `role` "viewer") a view-only
 * sign-up link for `familyId` with an optional label. The token is returned once and never stored.
 */
export async function createInvite(db: Queryable, o: { familyId: string | null; createdBy: string | null; role?: InviteRole; label?: string | null }): Promise<CreatedInvite> {
  const token = newInviteToken();
  const { rows } = await db.query<{ id: string; expires_at: Date }>(
    `INSERT INTO invite (token_hash, family_id, created_by, expires_at, role, label) VALUES ($1, $2, $3, now() + make_interval(days => $4), $5, $6) RETURNING id, expires_at`,
    [hashInviteToken(token), o.familyId, o.createdBy, INVITE_DAYS, o.role ?? "parent", o.label ?? null]);
  return { id: rows[0]!.id, token, expiresAt: rows[0]!.expires_at.toISOString() };
}

export type InviteKind = "new_family" | "parent" | "viewer";
export interface InvitePreview { kind: InviteKind; familyName: string | null }
const kindOf = (familyId: string | null, role: InviteRole): InviteKind => (!familyId ? "new_family" : role === "viewer" ? "viewer" : "parent");

/** What a usable link is for, or null when it is unknown, expired, used or cancelled. */
export async function previewInvite(db: Queryable, token: string): Promise<InvitePreview | null> {
  if (!TOKEN_RE.test(token)) return null;
  const { rows } = await db.query<{ family_id: string | null; role: InviteRole; family_name: string | null }>(
    `SELECT i.family_id, i.role, f.name AS family_name FROM invite i LEFT JOIN family f ON f.id = i.family_id
      WHERE i.token_hash = $1 AND i.used_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now()`, [hashInviteToken(token)]);
  const r = rows[0];
  return r ? { kind: kindOf(r.family_id, r.role), familyName: r.family_name } : null;
}

export interface Joined { familyId: string; familyName: string; parentId: string; parentName: string; kind: InviteKind; role: InviteRole; sessionToken: string | null }

/** Who is redeeming: a new person (name, email, password), a person who signed in with their credentials (the route verified them), or the person already signed in on this session. */
export type Redeemer =
  | { type: "new"; name: string; email: string; password: string }
  | { type: "person"; parentId: string }
  | { type: "session"; parentId: string; sessionId: string };

/**
 * Redeems a link in one transaction: claims it, makes the membership (and for a new person the parent, and for a new-family link the family),
 * and gives the session. Throws InviteUnavailable, EmailInUse or AlreadyMember; each rolls back, so the link is not burned.
 * Only a view-only link (role viewer) can be redeemed by someone who already has a login.
 * `sessionToken` is null when the person's own session was moved to the new account instead of starting another.
 */
export async function redeemInvite(db: Db, token: string, who: Redeemer, sessionDays: number): Promise<Joined> {
  if (!TOKEN_RE.test(token)) throw new InviteUnavailable();
  const passwordHash = who.type === "new" ? await hashPassword(who.password) : ""; // before the transaction: the claim should not be held while scrypt runs
  try {
    return await withTransaction(db, async (tx) => {
      const claimed = await tx.query<{ family_id: string | null; role: InviteRole }>(
        `UPDATE invite SET used_at = now()
          WHERE token_hash = $1 AND used_at IS NULL AND revoked_at IS NULL AND expires_at > now() RETURNING family_id, role`, [hashInviteToken(token)]);
      if (claimed.rowCount === 0) throw new InviteUnavailable();
      let familyId = claimed.rows[0]!.family_id;
      const role = claimed.rows[0]!.role;
      const kind = kindOf(familyId, role);
      if (who.type !== "new" && role !== "viewer") throw new InviteUnavailable(); // a parent link makes a new login, never an existing one
      if (!familyId) familyId = (await tx.query<{ id: string }>("INSERT INTO family (name) VALUES ('Our family') RETURNING id")).rows[0]!.id;

      let parentId: string; let parentName: string;
      if (who.type === "new") {
        // A parent's own family is their home (the insert trigger adds the parent membership); a viewer has none.
        const made = await tx.query<{ id: string }>(
          "INSERT INTO parent (family_id, name, email, password_hash) VALUES ($1, $2, $3, $4) RETURNING id", [role === "parent" ? familyId : null, who.name, who.email, passwordHash]);
        parentId = made.rows[0]!.id; parentName = who.name;
        if (role === "viewer") await tx.query("INSERT INTO family_member (family_id, parent_id, role, last_used_at) VALUES ($1, $2, 'viewer', now())", [familyId, parentId]);
      } else {
        const person = await tx.query<{ name: string }>("SELECT name FROM parent WHERE id = $1", [who.parentId]);
        if (!person.rows[0]) throw new InviteUnavailable();
        parentId = who.parentId; parentName = person.rows[0].name;
        const added = await tx.query("INSERT INTO family_member (family_id, parent_id, role, last_used_at) VALUES ($1, $2, 'viewer', now()) ON CONFLICT DO NOTHING", [familyId, parentId]);
        if (added.rowCount === 0) throw new AlreadyMember();
      }
      await tx.query("UPDATE family_member SET last_used_at = now() WHERE family_id = $1 AND parent_id = $2", [familyId, parentId]);

      let sessionToken: string | null = null;
      if (who.type === "session") {
        await tx.query("UPDATE session SET family_id = $2 WHERE id = $1 AND parent_id = $3", [who.sessionId, familyId, parentId]);
      } else {
        sessionToken = newSessionToken();
        await tx.query("INSERT INTO session (id, family_id, parent_id, expires_at) VALUES ($1, $2, $3, now() + make_interval(days => $4))",
          [hashSessionToken(sessionToken), familyId, parentId, sessionDays]);
      }
      const fam = await tx.query<{ name: string }>("SELECT name FROM family WHERE id = $1", [familyId]);
      return { familyId, familyName: fam.rows[0]!.name, parentId, parentName, kind, role, sessionToken };
    });
  } catch (e) {
    if ((e as { code?: string }).code === "23505" && (e as { constraint?: string }).constraint === "parent_email_uq") throw new EmailInUse();
    throw e;
  }
}

export interface OpenInvite { id: string; kind: InviteKind; familyId: string | null; familyName: string | null; label: string | null; createdAt: string; expiresAt: string }

/** Invites still usable. `familyId` limits it to that family's own; undefined lists them all (the command). `role` limits it to parent links or view-only links. */
export async function listOpenInvites(db: Queryable, familyId?: string, role?: InviteRole): Promise<OpenInvite[]> {
  const { rows } = await db.query<{ id: string; family_id: string | null; role: InviteRole; label: string | null; family_name: string | null; created_at: Date; expires_at: Date }>(
    `SELECT i.id, i.family_id, i.role, i.label, f.name AS family_name, i.created_at, i.expires_at FROM invite i LEFT JOIN family f ON f.id = i.family_id
      WHERE i.used_at IS NULL AND i.revoked_at IS NULL AND i.expires_at > now() AND ($1::uuid IS NULL OR i.family_id = $1) AND ($2::text IS NULL OR i.role = $2)
      ORDER BY i.created_at DESC, i.id`, [familyId ?? null, role ?? null]);
  return rows.map((r) => ({ id: r.id, kind: kindOf(r.family_id, r.role), familyId: r.family_id, familyName: r.family_name, label: r.label, createdAt: r.created_at.toISOString(), expiresAt: r.expires_at.toISOString() }));
}

/** Cancels an open invite. `familyId` set: only that family's own (another family's id finds nothing); `role` set: only that kind of link. Returns whether one was cancelled. */
export async function revokeInvite(db: Queryable, id: string, familyId?: string, role?: InviteRole): Promise<boolean> {
  const { rowCount } = await db.query(
    `UPDATE invite SET revoked_at = now() WHERE id = $1 AND used_at IS NULL AND revoked_at IS NULL AND ($2::uuid IS NULL OR family_id = $2) AND ($3::text IS NULL OR role = $3)`, [id, familyId ?? null, role ?? null]);
  return (rowCount ?? 0) > 0;
}
