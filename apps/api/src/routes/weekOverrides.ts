/**
 * /api/week-overrides (S6-02): "this week, do N instead; keep the end date or push it back" for one assignment and child
 * (or every child). One row per assignment, child and week; setting it again replaces the row and bumps `updated_at`, which
 * is the edit order the plan reads (S6-01, C1: the most recent edit wins). Finished weeks are check-ins, not adjustments.
 */
import { OVERRIDE_MODES, humanList, weekStartOf, type OverrideMode } from "@hh/engine";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { query, withReadSnapshot, withTransaction, type Queryable } from "../db";
import { HttpError } from "../http/errors";
import { familyWeekStart } from "../http/familyWeek";
import { hasAtMostDecimals, LocalDate } from "../http/scheduleLimits";
import { parseBody, UUID_RE } from "../http/validate";
import { recordUndo, type WeekOverrideState } from "../services/undoService";

const Id = (label: string) => z.string(`${label} must be an id.`).regex(UUID_RE, `${label} must be a UUID.`).transform((s) => s.toLowerCase());
const PlannedUnits = z.number("plannedUnits must be a number.")
  .refine(Number.isFinite, "plannedUnits must be a finite number.")
  .refine((v) => v >= 0, "plannedUnits can't be negative.")
  .refine((v) => hasAtMostDecimals(v, 2), "plannedUnits can have at most 2 decimal places.");
const PutBody = z.strictObject({
  assignmentId: Id("assignmentId"),
  childId: Id("childId").nullable(),
  weekStart: LocalDate,
  plannedUnits: PlannedUnits,
  mode: z.enum(OVERRIDE_MODES, `mode must be ${humanList(OVERRIDE_MODES)}.`),
});
const ListQuery = z.strictObject({ weekStart: LocalDate });

interface Row {
  id: string; assignment_id: string; child_id: string | null; week_start: string;
  planned_units: number; mode: OverrideMode; updated_at: Date;
  /** Full-precision text of both stamps, so an undo (S6-06) puts the edit order back exactly. */
  created_text: string; updated_text: string;
}
const COLUMNS = `id, assignment_id, child_id, week_start::text AS week_start, planned_units::float AS planned_units, mode, updated_at,
  created_at::text AS created_text, updated_at::text AS updated_text`;

/** S6-06: what to put back for an adjustment. */
const stateOf = (r: Row): WeekOverrideState => ({
  assignmentId: r.assignment_id, childId: r.child_id, weekStart: r.week_start, plannedUnits: r.planned_units, mode: r.mode,
  createdAt: r.created_text, updatedAt: r.updated_text,
});

const toJson = (r: Row) => ({
  id: r.id, assignmentId: r.assignment_id, childId: r.child_id, weekStart: r.week_start,
  plannedUnits: r.planned_units, mode: r.mode, updatedAt: r.updated_at.toISOString(),
});

const WEEKDAY_NAME = { mon: "Monday", sun: "Sunday" } as const;
const notFound = () => new HttpError(404, "not_found", "No such week adjustment.");

/** The assignment must be this family's and not archived, the child active and on it, and the amount within its total. Returns its title. */
async function checkTarget(db: Queryable, familyId: string, b: z.infer<typeof PutBody>): Promise<string> {
  const [a] = await query<{ total_units: number; title: string }>(db,
    "SELECT total_units::float AS total_units, title FROM assignment WHERE id = $1 AND family_id = $2 AND archived_at IS NULL", [b.assignmentId, familyId]);
  if (!a) throw new HttpError(400, "invalid_request", "assignmentId: no such assignment.");
  if (b.childId !== null) {
    const [c] = await query(db,
      `SELECT 1 FROM assignment_child ac JOIN child c ON c.id = ac.child_id AND c.family_id = ac.family_id
        WHERE ac.assignment_id = $1 AND ac.child_id = $2 AND ac.family_id = $3 AND c.archived_at IS NULL`, [b.assignmentId, b.childId, familyId]);
    if (!c) throw new HttpError(400, "invalid_request", "childId: that child isn't on this assignment.");
  }
  if (b.plannedUnits > a.total_units) throw new HttpError(400, "invalid_request", `plannedUnits: more than the assignment's total (${a.total_units}).`);
  return a.title;
}

export async function weekOverridesRoutes(app: FastifyInstance): Promise<void> {
  app.put("/api/week-overrides", async (req) => {
    const b = parseBody(PutBody, req.body);
    const row = await withTransaction(app.db, async (tx) => {
      const { today, weekStart } = await familyWeekStart(tx, req);
      if (weekStartOf(b.weekStart, weekStart) !== b.weekStart)
        throw new HttpError(400, "invalid_request", `weekStart: must be the first day of a week (a ${WEEKDAY_NAME[weekStart]}).`);
      if (b.weekStart < weekStartOf(today, weekStart))
        throw new HttpError(400, "invalid_request", "weekStart: a finished week is changed with its check-in, not an adjustment.");
      const title = await checkTarget(tx, req.familyId, b);
      const [prev] = await query<Row>(tx,
        `SELECT ${COLUMNS} FROM week_override WHERE family_id = $1 AND assignment_id = $2 AND child_id IS NOT DISTINCT FROM $3 AND week_start = $4 FOR UPDATE`,
        [req.familyId, b.assignmentId, b.childId, b.weekStart]);
      // clock_timestamp(), not now(): the edit order must not tie with another edit in the same transaction.
      const [r] = await query<Row>(tx,
        `INSERT INTO week_override (family_id, assignment_id, child_id, week_start, planned_units, mode)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (assignment_id, COALESCE(child_id, '00000000-0000-0000-0000-000000000000'::uuid), week_start)
         DO UPDATE SET planned_units = EXCLUDED.planned_units, mode = EXCLUDED.mode, updated_at = clock_timestamp()
         RETURNING ${COLUMNS}`, [req.familyId, b.assignmentId, b.childId, b.weekStart, b.plannedUnits, b.mode]);
      // S6-06: undo puts the earlier amount back, or removes the adjustment if it is new.
      await recordUndo(tx, req.familyId, `Adjusted ${title}`, [{ op: "weekOverride", id: r!.id, set: prev ? stateOf(prev) : null }]);
      return r!;
    });
    return toJson(row);
  });

  app.get("/api/week-overrides", async (req) => {
    const { weekStart } = parseBody(ListQuery, req.query);
    const rows = await withReadSnapshot(app.db, async (tx) => {
      const f = await familyWeekStart(tx, req);
      if (weekStartOf(weekStart, f.weekStart) !== weekStart)
        throw new HttpError(400, "invalid_request", `weekStart: must be the first day of a week (a ${WEEKDAY_NAME[f.weekStart]}).`);
      return query<Row>(tx,
        `SELECT ${COLUMNS} FROM week_override WHERE family_id = $1 AND week_start = $2 ORDER BY updated_at, id`, [req.familyId, weekStart]);
    });
    return { overrides: rows.map(toJson) };
  });

  app.delete<{ Params: { id: string } }>("/api/week-overrides/:id", async (req, reply) => {
    if (!UUID_RE.test(req.params.id)) throw notFound();
    await withTransaction(app.db, async (tx) => {
      const [cur] = await query<Row>(tx, `SELECT ${COLUMNS} FROM week_override WHERE id = $1 AND family_id = $2 FOR UPDATE`, [req.params.id, req.familyId]);
      if (!cur) throw notFound();
      const [a] = await query<{ title: string }>(tx, "SELECT title FROM assignment WHERE id = $1 AND family_id = $2", [cur.assignment_id, req.familyId]);
      await query(tx, "DELETE FROM week_override WHERE id = $1 AND family_id = $2", [cur.id, req.familyId]);
      await recordUndo(tx, req.familyId, `Removed an adjustment to ${a?.title ?? "an assignment"}`, [{ op: "weekOverride", id: cur.id, set: stateOf(cur) }]);
    });
    return reply.code(204).send();
  });
}
