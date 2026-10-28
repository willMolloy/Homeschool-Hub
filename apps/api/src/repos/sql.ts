/**
 * Small SQL helpers shared by the repos (RF-12). Not a query builder: column and table names come
 * only from literals in repo code (closed unions), never from request input; values are always params.
 */
import type { Tx } from "../db";

const IDENT = /^[a-z_][a-z0-9_]*$/;

export interface UpdateSet {
  /** `col = $n, …, updated_at = now()`; never empty. */
  set: string;
  /** The values for `$firstParam…`, in order. */
  params: unknown[];
}

/**
 * Build the SET list for a partial update. `undefined` means "not sent" and is skipped; `null` is a real
 * value (clears a column). `archived: true` keeps an existing archived_at, `false` clears it, absent leaves it.
 * `updated_at = now()` is always added, so an empty patch still touches the row.
 */
export function buildUpdateSet<C extends string>(
  cols: { readonly [K in C]?: unknown },
  opts: { firstParam: number; archived?: boolean },
): UpdateSet {
  const sets: string[] = [];
  const params: unknown[] = [];
  for (const [col, v] of Object.entries(cols)) {
    if (v === undefined) continue;
    if (!IDENT.test(col)) throw new Error(`buildUpdateSet: bad column name ${JSON.stringify(col)}`);
    params.push(v);
    sets.push(`${col} = $${opts.firstParam + params.length - 1}`);
  }
  if (opts.archived !== undefined) sets.push(opts.archived ? "archived_at = COALESCE(archived_at, now())" : "archived_at = NULL");
  sets.push("updated_at = now()");
  return { set: sets.join(", "), params };
}

/** The child-link tables and the column naming their owner row. */
const LINK_OWNER = {
  assignment_child: "assignment_id",
  event_child: "event_id",
  blocked_range_child: "blocked_range_id",
} as const;
export type LinkTable = keyof typeof LINK_OWNER;

/** Replace the owner's child links with exactly `childIds` (`[]` removes them all). References must already be checked. */
export async function replaceLinks(
  tx: Tx,
  table: LinkTable,
  link: { ownerId: string; familyId: string; childIds: readonly string[] },
): Promise<void> {
  const owner = LINK_OWNER[table];
  await tx.query(`DELETE FROM ${table} WHERE ${owner} = $1 AND family_id = $2`, [link.ownerId, link.familyId]);
  if (link.childIds.length) {
    await tx.query(
      `INSERT INTO ${table} (${owner}, child_id, family_id) SELECT $1, unnest($2::uuid[]), $3`,
      [link.ownerId, link.childIds, link.familyId]);
  }
}
