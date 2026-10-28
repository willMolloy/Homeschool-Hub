/**
 * "How did last week go?" (S2b-23/24): one finished week's planned ranges per assignment × child, the stored
 * actual positions, and the week's review status. The planned range comes from the engine
 * (`plannedRangeForWeek`), counting only check-ins from earlier weeks, so it shows what was planned, not what
 * happened. No HTTP here beyond HttpError; the route parses and calls in.
 */
import {
  addDays, planAll, planChild, plannedRangeForWeek, weekStartOf,
  type Assignment, type ChildPlan, type LocalDate, type OverrideMode, type UnitType, type WeekReviewStatus, type WeekStart,
} from "@hh/engine";
import type { Queryable, Tx } from "../db";
import { HttpError } from "../http/errors";
import { readPlanInputs, type PlanInputs } from "../plan/loadPlanInputs";

export interface CheckInItemJson {
  assignmentId: string;
  childId: string;
  childName: string;
  title: string;
  unitType: UnitType;
  /** Planned position at the start and end of the week (cumulative units, 2 decimals). */
  plannedFrom: number;
  plannedTo: number;
  totalUnits: number;
  /** The stored position, or null = as planned. */
  actual: number | null;
  mode: OverrideMode | null;
}

export interface WeekCheckInJson {
  weekStart: LocalDate;
  weekEnd: LocalDate;
  status: WeekReviewStatus | null;
  items: CheckInItemJson[];
}

/** How the service reads plan inputs; a fake one makes it testable without the loader's SQL. */
export type PlanLoader = (db: Queryable, familyId: string) => Promise<PlanInputs>;

const WEEKDAY_NAME: Record<WeekStart, string> = { mon: "Monday", sun: "Sunday" };
const round2 = (n: number): number => Math.round(n * 100) / 100;

/**
 * The week to review: `requested`, or last week (the one before the week containing `today`).
 * 400 unless it is a week start and the week is finished.
 */
export function resolveWeek(weekStart: WeekStart, today: LocalDate, requested?: LocalDate): LocalDate {
  const current = weekStartOf(today, weekStart);
  if (requested === undefined) return addDays(current, -7);
  if (weekStartOf(requested, weekStart) !== requested)
    throw new HttpError(400, "invalid_request", `weekStart: must be the first day of a week (a ${WEEKDAY_NAME[weekStart]}).`);
  if (requested >= current) throw new HttpError(400, "invalid_request", "weekStart: you can only check in on a finished week.");
  return requested;
}

interface StoredRow {
  assignment_id: string; child_id: string; position: number; mode: OverrideMode | null;
  subject_id: string; title: string; unit_type: UnitType; total_units: number;
  start_date: string; end_date: string; weight_per_unit: number | null;
}

/** This week's stored check-ins with their assignment, archived rows included (a past edit stays visible). */
const storedFor = (db: Queryable, familyId: string, w0: LocalDate) =>
  db.query<StoredRow>(
    `SELECT pc.assignment_id, pc.child_id, pc.position, pc.mode,
            a.subject_id, a.title, a.unit_type, a.total_units, a.start_date, a.end_date, a.weight_per_unit
       FROM progress_checkin pc JOIN assignment a ON a.id = pc.assignment_id AND a.family_id = pc.family_id
      WHERE pc.family_id = $1 AND pc.week_start = $2`, [familyId, w0]).then((r) => r.rows);

const namesFor = async (db: Queryable, familyId: string, table: "child" | "subject"): Promise<Map<string, string>> => {
  // `table` is a closed union, never user input.
  const { rows } = await db.query<{ id: string; name: string }>(`SELECT id, name FROM ${table} WHERE family_id = $1`, [familyId]);
  return new Map(rows.map((r) => [r.id, r.name]));
};

const key = (assignmentId: string, childId: string) => `${assignmentId}/${childId}`;

/** Plans as they stood before `w0`'s own check-in: only check-ins from earlier weeks count. */
function plansBefore(inputs: PlanInputs, w0: LocalDate, today: LocalDate) {
  const ctx = { ...inputs.ctx, checkIns: inputs.ctx.checkIns.filter((c) => c.weekStart < w0), asOf: today };
  return { ctx, plans: planAll(inputs.assignments, ctx) };
}

/** The week's view, given its inputs: planned ranges (earlier check-ins only), stored actuals and status. */
async function weekView(db: Queryable, familyId: string, inputs: PlanInputs, w0: LocalDate, today: LocalDate): Promise<WeekCheckInJson> {
  const stored = await storedFor(db, familyId, w0);
  const childNames = await namesFor(db, familyId, "child");
  const subjectNames = await namesFor(db, familyId, "subject");
  const { rows: review } = await db.query<{ status: WeekReviewStatus }>(
    "SELECT status FROM week_review WHERE family_id = $1 AND week_start = $2", [familyId, w0]);

  const { ctx, plans } = plansBefore(inputs, w0, today);
  const storedBy = new Map(stored.map((r) => [key(r.assignment_id, r.child_id), r]));
  const byPair = new Map<string, { a: Assignment; plan: ChildPlan }>();
  const assignmentOf = new Map(inputs.assignments.map((a) => [a.id, a]));
  for (const plan of plans) byPair.set(key(plan.assignmentId, plan.childId), { a: assignmentOf.get(plan.assignmentId)!, plan });
  // Stored check-ins on an archived assignment or child aren't planned by the loader: plan them on their own.
  for (const r of stored) {
    if (byPair.has(key(r.assignment_id, r.child_id))) continue;
    const a: Assignment = {
      id: r.assignment_id, childIds: [r.child_id], subjectId: r.subject_id, title: r.title, unitType: r.unit_type,
      totalUnits: Number(r.total_units), start: r.start_date, end: r.end_date,
      weightPerUnit: r.weight_per_unit == null ? null : Number(r.weight_per_unit),
    };
    byPair.set(key(a.id, r.child_id), { a, plan: planChild(a, r.child_id, ctx) });
  }

  const items: (CheckInItemJson & { subjectName: string })[] = [];
  for (const [k, { a, plan }] of byPair) {
    const range = plannedRangeForWeek(plan, w0);
    const s = storedBy.get(k);
    if (!range.hasPlannedWork && !s) continue;
    items.push({
      assignmentId: a.id, childId: plan.childId, childName: childNames.get(plan.childId) ?? "", title: a.title ?? "", unitType: a.unitType,
      plannedFrom: round2(range.from), plannedTo: round2(range.to), totalUnits: a.totalUnits,
      // A total edited below a stored position: show what the engine plans from (it clamps, S2b-28 case 10).
      actual: s ? Math.min(Number(s.position), a.totalUnits) : null, mode: s?.mode ?? null,
      subjectName: subjectNames.get(a.subjectId) ?? "",
    });
  }
  const cmp = (x: string, y: string) => x.localeCompare(y, "en", { sensitivity: "base" });
  items.sort((x, y) => cmp(x.childName, y.childName) || cmp(x.subjectName, y.subjectName) || cmp(x.title, y.title)
    || x.assignmentId.localeCompare(y.assignmentId) || x.childId.localeCompare(y.childId));
  return {
    weekStart: w0, weekEnd: addDays(w0, 6), status: review[0]?.status ?? null,
    items: items.map(({ subjectName: _s, ...item }) => item),
  };
}

/** Read one finished week (S2b-23). `todayIn(zone)` is the family's local today. */
export async function readWeek(
  db: Queryable, familyId: string, opts: { requested?: LocalDate; todayIn: (timeZone: string) => LocalDate },
  load: PlanLoader = readPlanInputs,
): Promise<WeekCheckInJson> {
  const inputs = await load(db, familyId);
  const today = opts.todayIn(inputs.timeZone);
  return weekView(db, familyId, inputs, resolveWeek(inputs.calendar.weekStart, today, opts.requested), today);
}

export interface PastWeekJson {
  weekStart: LocalDate;
  weekEnd: LocalDate;
  status: WeekReviewStatus | null;
  /** Some assignment × child has a stored check-in that week (so it drives the plan from then on). */
  hasCheckIns: boolean;
}

/** The week picker lists at most this many weeks, newest first (two school years). */
export const MAX_PAST_WEEKS = 104;

/**
 * Finished weeks a parent can reopen (S2b-27), newest first: from last week back to the earliest assignment
 * start, keeping weeks with planned work (as planned then, earlier check-ins only) or a stored check-in or
 * review. Plans are recomputed only where an earlier week's check-in could have changed them.
 */
export async function listWeeks(
  db: Queryable, familyId: string, opts: { todayIn: (timeZone: string) => LocalDate },
  load: PlanLoader = readPlanInputs,
): Promise<PastWeekJson[]> {
  const inputs = await load(db, familyId);
  const today = opts.todayIn(inputs.timeZone);
  const ws = inputs.calendar.weekStart;
  const last = resolveWeek(ws, today);
  const { rows: checked } = await db.query<{ week_start: LocalDate }>(
    "SELECT DISTINCT week_start FROM progress_checkin WHERE family_id = $1", [familyId]);
  const { rows: reviews } = await db.query<{ week_start: LocalDate; status: WeekReviewStatus }>(
    "SELECT week_start, status FROM week_review WHERE family_id = $1", [familyId]);
  const withCheckIns = new Set(checked.map((r) => r.week_start));
  const statusOf = new Map(reviews.map((r) => [r.week_start, r.status]));
  const starts = [...inputs.assignments.map((a) => a.start), ...withCheckIns, ...statusOf.keys()];
  if (starts.length === 0) return [];
  const first = weekStartOf(starts.reduce((a, b) => (a < b ? a : b)), ws);

  const weeks: PastWeekJson[] = [];
  let cachedEarlier = -1;
  let plans: ChildPlan[] = [];
  for (let w = last; w >= first && weeks.length < MAX_PAST_WEEKS; w = addDays(w, -7)) {
    const earlier = inputs.ctx.checkIns.filter((c) => c.weekStart < w).length;
    if (earlier !== cachedEarlier) {
      plans = plansBefore(inputs, w, today).plans;
      cachedEarlier = earlier;
    }
    const planned = plans.some((p) => plannedRangeForWeek(p, w).hasPlannedWork);
    if (planned || withCheckIns.has(w) || statusOf.has(w))
      weeks.push({ weekStart: w, weekEnd: addDays(w, 6), status: statusOf.get(w) ?? null, hasCheckIns: withCheckIns.has(w) });
  }
  return weeks;
}

/** Within this many units of the plan, a position counts as "as planned" (D11). */
export const AS_PLANNED_TOLERANCE = 0.5;

export interface CheckInWrite {
  assignmentId: string;
  childId: string;
  position: number;
  mode: OverrideMode | null;
}

export interface SaveWeekRequest {
  weekStart: LocalDate;
  status: WeekReviewStatus;
  items: CheckInWrite[];
  todayIn: (timeZone: string) => LocalDate;
}

/**
 * Check one reported item against the week's plan (S2b-24, D11) and say whether it is stored:
 * as planned (within the tolerance) is not, anything else is. Throws 400 for a bad position or mode.
 */
export function checkItem(
  item: CheckInWrite, planned: Pick<CheckInItemJson, "plannedFrom" | "plannedTo" | "totalUnits">, where: string,
): boolean {
  if (item.position > planned.totalUnits + 1e-9)
    throw new HttpError(400, "invalid_request", `${where}.position: can't be more than the total (${planned.totalUnits}).`);
  // D26 (S2c-02): the week can't end before it started; repeated work isn't recorded as going backwards.
  if (item.position < planned.plannedFrom - 1e-9)
    throw new HttpError(400, "invalid_request", `${where}.position: can't be below where the week started (${planned.plannedFrom}).`);
  const asPlanned = Math.abs(item.position - planned.plannedTo) <= AS_PLANNED_TOLERANCE;
  const finishes = item.position >= planned.totalUnits - 1e-9;
  if (asPlanned || finishes) {
    if (item.mode !== null)
      throw new HttpError(400, "invalid_request", `${where}.mode: leave it empty when the week went as planned or the work is finished.`);
  } else if (item.mode === null) {
    throw new HttpError(400, "invalid_request", `${where}.mode: choose how to catch up or use the extra time.`);
  }
  return !asPlanned;
}

/**
 * Save one finished week (S2b-24) on `tx` (the caller's transaction): PUT replaces the week's check-ins,
 * then the review status is upserted. Returns the week as GET shows it now, and whether the plan changed.
 */
export async function saveWeek(
  tx: Tx, familyId: string, req: SaveWeekRequest, load: PlanLoader = readPlanInputs,
): Promise<WeekCheckInJson & { planChanged: boolean }> {
  if (req.status === "skipped" && req.items.length > 0)
    throw new HttpError(400, "invalid_request", "items: a skipped week counts as done as planned, so it has no items.");
  // Holds off a week-start change until this save commits (S2c-01): the PATCH locks the family row FOR UPDATE.
  await tx.query("SELECT 1 FROM family WHERE id = $1 FOR SHARE", [familyId]);
  const inputs = await load(tx, familyId);
  const today = req.todayIn(inputs.timeZone);
  const w0 = resolveWeek(inputs.calendar.weekStart, today, req.weekStart);
  const before = await weekView(tx, familyId, inputs, w0, today);
  const planned = new Map(before.items.map((i) => [key(i.assignmentId, i.childId), i]));

  const keep: CheckInWrite[] = [];
  const seen = new Set<string>();
  req.items.forEach((item, n) => {
    const k = key(item.assignmentId, item.childId);
    if (seen.has(k)) throw new HttpError(400, "invalid_request", `items.${n}: that assignment and child are listed twice.`);
    seen.add(k);
    const p = planned.get(k);
    if (!p) throw new HttpError(400, "invalid_reference", `items.${n}: must be one of this week's assignments for that child.`);
    if (checkItem(item, p, `items.${n}`)) keep.push(item);
  });

  const old = await storedFor(tx, familyId, w0);
  await tx.query(
    `DELETE FROM progress_checkin WHERE family_id = $1 AND week_start = $2
        AND NOT ((assignment_id, child_id) IN (SELECT * FROM unnest($3::uuid[], $4::uuid[])))`,
    [familyId, w0, keep.map((i) => i.assignmentId), keep.map((i) => i.childId)]);
  for (const i of keep) {
    await tx.query(
      `INSERT INTO progress_checkin (family_id, assignment_id, child_id, week_start, position, mode)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (assignment_id, child_id, week_start)
       DO UPDATE SET position = EXCLUDED.position, mode = EXCLUDED.mode, updated_at = now()`,
      [familyId, i.assignmentId, i.childId, w0, i.position, i.mode]);
  }
  await tx.query(
    `INSERT INTO week_review (family_id, week_start, status) VALUES ($1, $2, $3)
     ON CONFLICT (family_id, week_start) DO UPDATE SET status = EXCLUDED.status, updated_at = now()`,
    [familyId, w0, req.status]);

  const was = new Map(old.map((r) => [key(r.assignment_id, r.child_id), `${Number(r.position)}/${r.mode}`]));
  const now = new Map(keep.map((i) => [key(i.assignmentId, i.childId), `${i.position}/${i.mode}`]));
  const planChanged = was.size !== now.size || [...now].some(([k, v]) => was.get(k) !== v);
  const after = await weekView(tx, familyId, await load(tx, familyId), w0, today);
  return { ...after, planChanged };
}
