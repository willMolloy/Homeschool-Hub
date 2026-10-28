/**
 * Blocked ranges: vacations, holidays, sick days (S2a-07). Every query is scoped by family_id.
 * The table has no archived_at and nothing references a range, so delete really deletes.
 * No children = the whole family.
 */
import type { BlockedKind } from "@hh/engine";
import type { Queryable, Tx } from "../db";

export type { BlockedKind };

export interface BlockedRangeRow {
  id: string;
  label: string | null;
  kind: BlockedKind;
  start_date: string;
  end_date: string;
  child_ids: string[];
}

export interface BlockedRangeJson {
  id: string;
  label: string | null;
  kind: BlockedKind;
  startDate: string;
  endDate: string;
  /** [] = the whole family. */
  childIds: string[];
}

export interface BlockedRangeInput {
  label: string | null;
  kind: BlockedKind;
  startDate: string;
  endDate: string;
  childIds: string[];
}

export const toBlockedRangeJson = (r: BlockedRangeRow): BlockedRangeJson => ({
  id: r.id, label: r.label, kind: r.kind, startDate: r.start_date, endDate: r.end_date, childIds: r.child_ids,
});

const SELECT = `
  SELECT b.id, b.label, b.kind, b.start_date, b.end_date,
         COALESCE((SELECT array_agg(bc.child_id ORDER BY c.sort_order, c.id)
                     FROM blocked_range_child bc JOIN child c ON c.id = bc.child_id
                    WHERE bc.blocked_range_id = b.id), '{}') AS child_ids
    FROM blocked_range b`;

export async function listBlockedRanges(db: Queryable, familyId: string): Promise<BlockedRangeRow[]> {
  const { rows } = await db.query<BlockedRangeRow>(`${SELECT} WHERE b.family_id = $1 ORDER BY b.start_date, b.end_date, b.id`, [familyId]);
  return rows;
}

export async function getBlockedRange(db: Queryable, familyId: string, id: string): Promise<BlockedRangeRow | null> {
  const { rows } = await db.query<BlockedRangeRow>(`${SELECT} WHERE b.family_id = $1 AND b.id = $2`, [familyId, id]);
  return rows[0] ?? null;
}

/** Lock one of the family's ranges and return it, or null. */
export async function lockBlockedRange(tx: Tx, familyId: string, id: string): Promise<BlockedRangeRow | null> {
  const { rowCount } = await tx.query("SELECT 1 FROM blocked_range WHERE id = $1 AND family_id = $2 FOR UPDATE", [id, familyId]);
  return rowCount ? getBlockedRange(tx, familyId, id) : null;
}

async function setChildren(tx: Tx, familyId: string, id: string, childIds: string[]): Promise<void> {
  await tx.query("DELETE FROM blocked_range_child WHERE blocked_range_id = $1 AND family_id = $2", [id, familyId]);
  if (childIds.length) {
    await tx.query("INSERT INTO blocked_range_child (blocked_range_id, child_id, family_id) SELECT $1, unnest($2::uuid[]), $3", [id, childIds, familyId]);
  }
}

/** References must already be checked. */
export async function createBlockedRange(tx: Tx, familyId: string, b: BlockedRangeInput): Promise<string> {
  const { rows } = await tx.query<{ id: string }>(
    "INSERT INTO blocked_range (family_id, label, kind, start_date, end_date) VALUES ($1, $2, $3, $4, $5) RETURNING id",
    [familyId, b.label, b.kind, b.startDate, b.endDate]);
  await setChildren(tx, familyId, rows[0]!.id, b.childIds);
  return rows[0]!.id;
}

/** After lockBlockedRange. */
export async function updateBlockedRange(tx: Tx, familyId: string, id: string, p: Partial<BlockedRangeInput>): Promise<void> {
  const cols: Record<string, unknown> = { label: p.label, kind: p.kind, start_date: p.startDate, end_date: p.endDate };
  const sets = ["updated_at = now()"];
  const params: unknown[] = [id, familyId];
  for (const [col, v] of Object.entries(cols)) {
    if (v === undefined) continue;
    params.push(v);
    sets.push(`${col} = $${params.length}`);
  }
  await tx.query(`UPDATE blocked_range SET ${sets.join(", ")} WHERE id = $1 AND family_id = $2`, params);
  if (p.childIds) await setChildren(tx, familyId, id, p.childIds);
}

/** true when a row was deleted. Children rows go with it (ON DELETE CASCADE). */
export async function deleteBlockedRange(db: Queryable, familyId: string, id: string): Promise<boolean> {
  const { rowCount } = await db.query("DELETE FROM blocked_range WHERE id = $1 AND family_id = $2", [id, familyId]);
  return (rowCount ?? 0) > 0;
}
