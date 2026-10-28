/**
 * Shared SQL for the family's "roster" tables: `child` and `subject`.
 * Both have the same shape (id, family_id, name, color, sort_order, archived_at, updated_at)
 * and the same rules (family-scoped, archive instead of delete), so one implementation serves both.
 */
import type { Queryable } from "../db";

export type RosterTable = "child" | "subject";

export interface RosterRow {
  id: string;
  family_id: string;
  name: string;
  color: string | null;
  sort_order: number;
  archived_at: Date | null;
}

export interface RosterJson {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
  archived: boolean;
}

export interface RosterPatch {
  name?: string;
  color?: string | null;
  sortOrder?: number;
  archived?: boolean;
}

export function toRosterJson(row: RosterRow): RosterJson {
  return { id: row.id, name: row.name, color: row.color, sortOrder: row.sort_order, archived: row.archived_at !== null };
}

const COLS = "id, family_id, name, color, sort_order, archived_at";

export function rosterRepo(table: RosterTable) {
  // `table` is a closed union, never user input, so interpolating it is safe.
  return {
    /** The family's rows, sort_order then name. Archived ones only when asked. */
    async list(db: Queryable, familyId: string, includeArchived = false): Promise<RosterRow[]> {
      const { rows } = await db.query<RosterRow>(
        `SELECT ${COLS} FROM ${table}
          WHERE family_id = $1 AND ($2::boolean OR archived_at IS NULL)
          ORDER BY sort_order, lower(name), id`,
        [familyId, includeArchived]);
      return rows;
    },

    /** Insert at the end of the family's list (sort_order = max + 1). */
    async create(db: Queryable, familyId: string, input: { name: string; color?: string | null }): Promise<RosterRow> {
      const { rows } = await db.query<RosterRow>(
        `INSERT INTO ${table} (family_id, name, color, sort_order)
         SELECT $1, $2, $3, COALESCE(MAX(sort_order), -1) + 1 FROM ${table} WHERE family_id = $1
         RETURNING ${COLS}`,
        [familyId, input.name, input.color ?? null]);
      return rows[0]!;
    },

    /** Update only the given fields of one of this family's rows. null = no such row for this family. */
    async update(db: Queryable, familyId: string, id: string, patch: RosterPatch): Promise<RosterRow | null> {
      const sets: string[] = [];
      const params: unknown[] = [id, familyId];
      const set = (col: string, v: unknown) => {
        params.push(v);
        sets.push(`${col} = $${params.length}`);
      };
      if (patch.name !== undefined) set("name", patch.name);
      if (patch.color !== undefined) set("color", patch.color);
      if (patch.sortOrder !== undefined) set("sort_order", patch.sortOrder);
      // Keep the original archived_at when archiving an already-archived row.
      if (patch.archived !== undefined) sets.push(patch.archived ? "archived_at = COALESCE(archived_at, now())" : "archived_at = NULL");
      const { rows } = await db.query<RosterRow>(
        `UPDATE ${table} SET ${[...sets, "updated_at = now()"].join(", ")}
          WHERE id = $1 AND family_id = $2
          RETURNING ${COLS}`,
        params);
      return rows[0] ?? null;
    },
  };
}
