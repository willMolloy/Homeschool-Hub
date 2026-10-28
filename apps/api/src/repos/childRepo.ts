import type { Queryable } from "../db";

export interface ChildRow {
  id: string;
  family_id: string;
  name: string;
  color: string | null;
  sort_order: number;
  archived_at: Date | null;
}

export interface ChildJson {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
  archived: boolean;
}

export function toChildJson(row: ChildRow): ChildJson {
  return { id: row.id, name: row.name, color: row.color, sortOrder: row.sort_order, archived: row.archived_at !== null };
}

const COLS = "id, family_id, name, color, sort_order, archived_at";

/** The family's children, sort_order then name. Archived ones only when asked. */
export async function listChildren(db: Queryable, familyId: string, includeArchived = false): Promise<ChildRow[]> {
  const { rows } = await db.query<ChildRow>(
    `SELECT ${COLS} FROM child
      WHERE family_id = $1 AND ($2::boolean OR archived_at IS NULL)
      ORDER BY sort_order, lower(name), id`,
    [familyId, includeArchived]);
  return rows;
}

/** Insert a child at the end of the family's list (sort_order = max + 1). */
export async function createChild(db: Queryable, familyId: string, input: { name: string; color?: string | null }): Promise<ChildRow> {
  const { rows } = await db.query<ChildRow>(
    `INSERT INTO child (family_id, name, color, sort_order)
     SELECT $1, $2, $3, COALESCE(MAX(sort_order), -1) + 1 FROM child WHERE family_id = $1
     RETURNING ${COLS}`,
    [familyId, input.name, input.color ?? null]);
  return rows[0]!;
}
