/**
 * Reference checks for schedule writes (S2a-05+): every subject/child id a body names must be one of the
 * session family's active rows. Checked up front so a foreign id is a clear 400, never an FK 500.
 */
import { HttpError } from "../http/errors";
import type { Queryable } from "../db";

async function checkActive(db: Queryable, table: "child" | "subject", familyId: string, ids: string[], field: string): Promise<void> {
  if (ids.length === 0) return;
  // `table` is a closed union, never user input.
  const { rows } = await db.query<{ n: number }>(
    `SELECT count(*)::int AS n FROM ${table} WHERE family_id = $1 AND archived_at IS NULL AND id = ANY($2::uuid[])`, [familyId, ids]);
  if (rows[0]!.n !== new Set(ids).size) {
    throw new HttpError(400, "invalid_reference", `${field}: every id must be one of your active ${table === "child" ? "children" : "subjects"}.`);
  }
}

export async function checkRefs(db: Queryable, familyId: string, refs: { subjectIds?: string[]; childIds?: string[] }): Promise<void> {
  await checkActive(db, "subject", familyId, refs.subjectIds ?? [], refs.subjectIds?.length === 1 ? "subjectId" : "subjectRules");
  await checkActive(db, "child", familyId, refs.childIds ?? [], "childIds");
}
