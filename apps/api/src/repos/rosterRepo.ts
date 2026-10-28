/**
 * Shared SQL for the family's "roster" tables: `child` and `subject`.
 * Both have the same shape (id, family_id, name, color, sort_order, archived_at, updated_at)
 * and the same rules (family-scoped, archive instead of delete), so one implementation serves both.
 */
import type { Queryable, Tx } from "../db";
import { buildUpdateSet } from "./sql";

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

    /** Insert at the end of the family's list (sort_order = max + 1). Runs inside the caller's transaction. */
    async create(tx: Tx, familyId: string, input: { name: string; color?: string | null }): Promise<RosterRow> {
      // Concurrent creates would read the same MAX and tie, so serialize them per family and table
      // with a transaction-scoped advisory lock, taken in its own statement before the INSERT reads MAX.
      await tx.query("SELECT pg_advisory_xact_lock(hashtextextended($1, 0))", [`${table}:${familyId}`]);
      const { rows } = await tx.query<RosterRow>(
        `INSERT INTO ${table} (family_id, name, color, sort_order)
         SELECT $1, $2, $3, COALESCE(MAX(sort_order), -1) + 1 FROM ${table} WHERE family_id = $1
         RETURNING ${COLS}`,
        [familyId, input.name, input.color ?? null]);
      return rows[0]!;
    },

    /** Update only the given fields of one of this family's rows. null = no such row for this family. */
    async update(db: Queryable, familyId: string, id: string, patch: RosterPatch): Promise<RosterRow | null> {
      // archived: true keeps the original archived_at when the row is already archived.
      const { set, params } = buildUpdateSet(
        { name: patch.name, color: patch.color, sort_order: patch.sortOrder }, { firstParam: 3, archived: patch.archived });
      const { rows } = await db.query<RosterRow>(
        `UPDATE ${table} SET ${set}
          WHERE id = $1 AND family_id = $2
          RETURNING ${COLS}`,
        [id, familyId, ...params]);
      return rows[0] ?? null;
    },
  };
}
