/**
 * /api/week-overrides (S6-02): "this week, do N instead; keep the end date or push it back" for one assignment and child
 * (or every child). One row per assignment, child and week; setting it again replaces the row and bumps `updated_at`, which
 * is the edit order the plan reads (S6-01, C1: the most recent edit wins). Finished weeks are check-ins, not adjustments.
 */
import { OVERRIDE_MODES, humanList, weekStartOf, type OverrideMode } from "@hh/engine";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { query, withReadSnapshot, withTransaction, type Queryable, type Tx } from "../db";
import { HttpError } from "../http/errors";
import { short as shortDate } from "../http/checkInDates";
import { familyWeekStart } from "../http/familyWeek";
import { hasAtMostDecimals, LocalDate } from "../http/scheduleLimits";
import { parseBody, UUID_RE } from "../http/validate";
import { recordUndo, type UndoStep, type WeekOverrideState } from "../services/undoService";

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
/** S7b-01: one save of the week sheet: the rows to set and the ids to remove, all for one week. */
const BatchBody = z.strictObject({
  weekStart: LocalDate,
  set: z.array(PutBody.omit({ weekStart: true }), "set must be a list.").max(100, "set can have at most 100 rows."),
  remove: z.array(Id("remove id"), "remove must be a list.").max(100, "remove can have at most 100 ids."),
}).refine((b) => b.set.length + b.remove.length > 0, "Nothing to change.");

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
/**
 * S6b-14: the undo bar says which child and week: "Adjusted Math 5 for Frank, week of Nov 2" (the undo bar adds the full stop). A null child is every
 * child on the assignment.
 */
async function adjustmentLabel(db: Queryable, familyId: string, verb: string, title: string, childId: string | null, weekStart: string): Promise<string> {
  const [c] = childId === null ? [] : await query<{ name: string }>(db, "SELECT name FROM child WHERE id = $1 AND family_id = $2", [childId, familyId]);
  return `${verb} ${title} for ${childId === null ? "every child" : c?.name ?? "a child"}, week of ${shortDate(weekStart)}`;
}
/**
 * S7b-01, S7b-20: the batch's label, "Adjusted week of Nov 2". It names the week only: the count and the child made it too long
 * for a phone's undo bar (it read "Adjusted 3 assignments for F... Undo" at 360 px).
 */
const batchLabel = (weekStart: string): string => `Adjusted week of ${shortDate(weekStart)}`;

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

/** The week must start on the family's week start day and not be finished. */
async function checkWeek(tx: Tx, req: FastifyRequest, week: string): Promise<void> {
  const { today, weekStart } = await familyWeekStart(tx, req);
  if (weekStartOf(week, weekStart) !== week)
    throw new HttpError(400, "invalid_request", `weekStart: must be the first day of a week (a ${WEEKDAY_NAME[weekStart]}).`);
  if (week < weekStartOf(today, weekStart))
    throw new HttpError(400, "invalid_request", "weekStart: a finished week is changed with its check-in, not an adjustment.");
}

/** Set one adjustment (insert or replace); returns the row, its assignment's title and the step that undoes it (S6-06). */
async function setOverride(tx: Tx, familyId: string, b: z.infer<typeof PutBody>): Promise<{ row: Row; title: string; step: UndoStep }> {
  const title = await checkTarget(tx, familyId, b);
  const [prev] = await query<Row>(tx,
    `SELECT ${COLUMNS} FROM week_override WHERE family_id = $1 AND assignment_id = $2 AND child_id IS NOT DISTINCT FROM $3 AND week_start = $4 FOR UPDATE`,
    [familyId, b.assignmentId, b.childId, b.weekStart]);
  // clock_timestamp(), not now(): the edit order must not tie with another edit in the same transaction.
  const [r] = await query<Row>(tx,
    `INSERT INTO week_override (family_id, assignment_id, child_id, week_start, planned_units, mode)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (assignment_id, COALESCE(child_id, '00000000-0000-0000-0000-000000000000'::uuid), week_start)
     DO UPDATE SET planned_units = EXCLUDED.planned_units, mode = EXCLUDED.mode, updated_at = clock_timestamp()
     RETURNING ${COLUMNS}`, [familyId, b.assignmentId, b.childId, b.weekStart, b.plannedUnits, b.mode]);
  // S6-06: undo puts the earlier amount back, or removes the adjustment if it is new.
  return { row: r!, title, step: { op: "weekOverride", id: r!.id, set: prev ? stateOf(prev) : null } };
}

export async function weekOverridesRoutes(app: FastifyInstance): Promise<void> {
  app.put("/api/week-overrides", async (req) => {
    const b = parseBody(PutBody, req.body);
    const row = await withTransaction(app.db, async (tx) => {
      await checkWeek(tx, req, b.weekStart);
      const { row: r, title, step } = await setOverride(tx, req.familyId, b);
      await recordUndo(tx, req.familyId, await adjustmentLabel(tx, req.familyId, "Adjusted", title, b.childId, b.weekStart), [step]);
      return r;
    });
    return toJson(row);
  });

  /**
   * S7b-01: one save of the week sheet. Every row is set or removed in one transaction (all or nothing) with ONE undo entry
   * whose steps put every row back as it was, so Undo reverts the whole save. The single-row endpoints are unchanged.
   */
  app.put("/api/week-overrides/batch", async (req) => {
    const b = parseBody(BatchBody, req.body);
    const keys = b.set.map((r) => `${r.assignmentId}|${r.childId}`);
    if (new Set(keys).size !== keys.length) throw new HttpError(400, "invalid_request", "set: an assignment and child can appear only once.");
    if (new Set(b.remove).size !== b.remove.length) throw new HttpError(400, "invalid_request", "remove: an id can appear only once.");
    const rows = await withTransaction(app.db, async (tx) => {
      await checkWeek(tx, req, b.weekStart);
      const steps: UndoStep[] = [];
      const titles: string[] = [];
      const children = new Set<string | null>();
      const saved: Row[] = [];
      for (const item of b.set) {
        const { row, title, step } = await setOverride(tx, req.familyId, { ...item, weekStart: b.weekStart });
        steps.push(step); titles.push(title); children.add(item.childId); saved.push(row);
      }
      for (const id of b.remove) {
        const [cur] = await query<Row>(tx, `SELECT ${COLUMNS} FROM week_override WHERE id = $1 AND family_id = $2 AND week_start = $3 FOR UPDATE`, [id, req.familyId, b.weekStart]);
        if (!cur) throw notFound();
        const [a] = await query<{ title: string }>(tx, "SELECT title FROM assignment WHERE id = $1 AND family_id = $2", [cur.assignment_id, req.familyId]);
        await query(tx, "DELETE FROM week_override WHERE id = $1 AND family_id = $2", [cur.id, req.familyId]);
        steps.push({ op: "weekOverride", id: cur.id, set: stateOf(cur) }); titles.push(a?.title ?? "an assignment"); children.add(cur.child_id);
      }
      const only = steps.length === 1;
      await recordUndo(tx, req.familyId,
        only ? await adjustmentLabel(tx, req.familyId, b.remove.length ? "Removed the adjustment to" : "Adjusted", titles[0]!, [...children][0]!, b.weekStart)
          : batchLabel(b.weekStart), steps);
      return saved;
    });
    return { overrides: rows.map(toJson) };
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
      const label = await adjustmentLabel(tx, req.familyId, "Removed the adjustment to", a?.title ?? "an assignment", cur.child_id, cur.week_start);
      await recordUndo(tx, req.familyId, label, [{ op: "weekOverride", id: cur.id, set: stateOf(cur) }]);
    });
    return reply.code(204).send();
  });
}
