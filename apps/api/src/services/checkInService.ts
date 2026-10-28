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
import type { Queryable } from "../db";
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
      actual: s ? Number(s.position) : null, mode: s?.mode ?? null,
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
