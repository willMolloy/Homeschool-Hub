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

export interface ChildPatch {
  name?: string;
  color?: string | null;
  sortOrder?: number;
  archived?: boolean;
}

/** Update only the given fields of one of this family's children. null = no such child for this family. */
export async function updateChild(db: Queryable, familyId: string, id: string, patch: ChildPatch): Promise<ChildRow | null> {
  const sets: string[] = [];
  const params: unknown[] = [id, familyId];
  const set = (col: string, v: unknown) => {
    params.push(v);
    sets.push(`${col} = $${params.length}`);
  };
  if (patch.name !== undefined) set("name", patch.name);
  if (patch.color !== undefined) set("color", patch.color);
  if (patch.sortOrder !== undefined) set("sort_order", patch.sortOrder);
  // Keep the original archived_at when archiving an already-archived child.
  if (patch.archived !== undefined) sets.push(patch.archived ? "archived_at = COALESCE(archived_at, now())" : "archived_at = NULL");
  const { rows } = await db.query<ChildRow>(
    `UPDATE child SET ${[...sets, "updated_at = now()"].join(", ")}
      WHERE id = $1 AND family_id = $2
      RETURNING ${COLS}`,
    params);
  return rows[0] ?? null;
}
