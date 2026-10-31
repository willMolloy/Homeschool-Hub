/**
 * The one place where database rows become `@hh/engine` inputs (S1-34).
 * One small query per table, every one filtered by family_id; child/rule rows are grouped in JS.
 * They run one after another on ONE connection inside a read-only REPEATABLE READ snapshot, so a
 * request never holds more than one pool connection and never sees half of a concurrent edit.
 * Archived children, subjects, assignments and events are left out of planning. Subject default weights (S2b-33)
 * are read for every subject, archived ones included, and only matter for assignments that are planned; so are subject
 * default weekdays (S4-05), and an assignment's own weekdays with the date and days of its last change (S4-01b).
 * `asOf` is not set here: the route decides it.
 * Check-ins (S2b-22) follow the overrides' rule: only for planned assignments and active children.
 * The log tables are never read: they feed hours and exports only (S2b-18/19).
 */
import type {
  Assignment, BlockedPeriod, FamilyCalendar, PlanContext, ProgressCheckIn, RecurringEvent,
  SubjectRule, SubjectWeight, UnitType, WeekOverride, WeekStart, Weekday,
} from "@hh/engine";
import { query, withReadSnapshot, type Db, type Queryable } from "../db";

export interface PlanInputs {
  /** `family.time_zone` as stored (the route validates it before use), read in the same snapshot. */
  timeZone: string;
  calendar: FamilyCalendar;
  assignments: Assignment[];
  ctx: PlanContext & {
    events: RecurringEvent[];
    blocked: BlockedPeriod[];
    overrides: WeekOverride[];
    subjectWeights: SubjectWeight[];
    subjectWeekdays: { subjectId: string; weekdays: Weekday[] }[];
    checkIns: ProgressCheckIn[];
  };
}

export class FamilyNotFoundError extends Error {
  constructor(familyId: string) {
    super(`family ${familyId} not found`);
  }
}

/** Stored weekdays sorted ascending, or null. */
const sortedDays = (d: number[] | null): Weekday[] | null => (d ? ([...d].sort((x, y) => x - y) as Weekday[]) : null);

/** Group `[key, value]` rows into key → values. */
function groupBy<R>(rows: R[], key: (r: R) => string, value: (r: R) => string): Map<string, string[]> {
  const m = new Map<string, string[]>();
  for (const r of rows) {
    const k = key(r);
    const list = m.get(k);
    if (list) list.push(value(r));
    else m.set(k, [value(r)]);
  }
  return m;
}

/** Read every plan input for `familyId` from one consistent snapshot. Throws FamilyNotFoundError. */
export async function loadPlanInputs(pool: Db, familyId: string): Promise<PlanInputs> {
  return withReadSnapshot(pool, (client) => readPlanInputs(client, familyId));
}

/** The reads themselves, sequential on `db` (one client: pg must not run two queries on it at once). Callers that already hold a snapshot or transaction (check-ins, S2b-23/24) use this directly. */
export async function readPlanInputs(db: Queryable, familyId: string): Promise<PlanInputs> {
  const [family] = await query<{ week_start: WeekStart; school_days: number[]; time_zone: string }>(db,
    "SELECT week_start, school_days, time_zone FROM family WHERE id = $1", [familyId]);
  if (!family) throw new FamilyNotFoundError(familyId);
  const calendar: FamilyCalendar = {
    weekStart: family.week_start,
    schoolDays: [...family.school_days].sort((a, b) => a - b) as Weekday[],
  };

  const children = await query<{ id: string }>(db, "SELECT id FROM child WHERE family_id = $1 AND archived_at IS NULL", [familyId]);
  const subjects = await query<{ id: string; archived: boolean; default_weight_unit: UnitType | null; default_weight: number | null; default_weekdays: number[] | null }>(db,
    `SELECT id, archived_at IS NOT NULL AS archived, default_weight_unit, default_weight, default_weekdays
       FROM subject WHERE family_id = $1 ORDER BY id`, [familyId]);
  const assignmentRows = await query<{
    id: string; subject_id: string; title: string; unit_type: UnitType; total_units: number;
    start_date: string; end_date: string; weight_per_unit: number | null;
    weekdays: number[] | null; weekdays_from: string | null; previous_weekdays: number[] | null;
  }>(db,
    `SELECT id, subject_id, title, unit_type, total_units, start_date, end_date, weight_per_unit, weekdays, weekdays_from, previous_weekdays
       FROM assignment WHERE family_id = $1 AND archived_at IS NULL ORDER BY start_date, id`, [familyId]);
  const assignmentChildren = await query<{ assignment_id: string; child_id: string }>(db,
    "SELECT assignment_id, child_id FROM assignment_child WHERE family_id = $1 ORDER BY child_id", [familyId]);
  const eventRows = await query<{
    id: string; name: string; weekdays: number[]; start_date: string | null; end_date: string | null;
    capacity_fraction: number; default_rule: SubjectRule;
  }>(db,
    `SELECT id, name, weekdays, start_date, end_date, capacity_fraction, default_rule
       FROM event WHERE family_id = $1 AND archived_at IS NULL ORDER BY id`, [familyId]);
  const eventChildren = await query<{ event_id: string; child_id: string }>(db,
    "SELECT event_id, child_id FROM event_child WHERE family_id = $1 ORDER BY child_id", [familyId]);
  const ruleRows = await query<{ event_id: string; subject_id: string; rule: SubjectRule }>(db,
    "SELECT event_id, subject_id, rule FROM event_subject_rule WHERE family_id = $1", [familyId]);
  const blockedRows = await query<{ id: string; kind: string; start_date: string; end_date: string }>(db,
    "SELECT id, kind, start_date, end_date FROM blocked_range WHERE family_id = $1 ORDER BY start_date, id", [familyId]);
  const blockedChildren = await query<{ blocked_range_id: string; child_id: string }>(db,
    "SELECT blocked_range_id, child_id FROM blocked_range_child WHERE family_id = $1 ORDER BY child_id", [familyId]);
  const overrideRows = await query<{ assignment_id: string; child_id: string | null; week_start: string; planned_units: number; mode: WeekOverride["mode"] }>(db,
    `SELECT assignment_id, child_id, week_start, planned_units, mode
       FROM week_override WHERE family_id = $1 ORDER BY week_start`, [familyId]);
  const checkInRows = await query<{ assignment_id: string; child_id: string; week_start: string; position: number; mode: ProgressCheckIn["mode"] }>(db,
    `SELECT assignment_id, child_id, week_start, position, mode
       FROM progress_checkin WHERE family_id = $1 ORDER BY week_start, assignment_id, child_id`, [familyId]);

  const activeChild = new Set(children.map((c) => c.id));
  const activeSubject = new Set(subjects.filter((s) => !s.archived).map((s) => s.id));
  const keepChildren = (ids: string[] | undefined) => (ids ?? []).filter((id) => activeChild.has(id));

  const childrenOf = groupBy(assignmentChildren, (r) => r.assignment_id, (r) => r.child_id);
  const assignments: Assignment[] = [];
  for (const a of assignmentRows) {
    if (!activeSubject.has(a.subject_id)) continue;
    const childIds = keepChildren(childrenOf.get(a.id));
    if (childIds.length === 0) continue; // nobody left to plan for
    assignments.push({
      id: a.id,
      childIds,
      subjectId: a.subject_id,
      title: a.title,
      unitType: a.unit_type,
      totalUnits: Number(a.total_units),
      start: a.start_date,
      end: a.end_date,
      weightPerUnit: a.weight_per_unit == null ? null : Number(a.weight_per_unit),
      weekdays: sortedDays(a.weekdays),
      weekdaysFrom: a.weekdays_from,
      previousWeekdays: sortedDays(a.previous_weekdays),
    });
  }
  const planned = new Set(assignments.map((a) => a.id));

  const eventChildIds = groupBy(eventChildren, (r) => r.event_id, (r) => r.child_id);
  const rulesOf = new Map<string, Record<string, SubjectRule>>();
  for (const r of ruleRows) {
    const rules = rulesOf.get(r.event_id) ?? {};
    rules[r.subject_id] = r.rule;
    rulesOf.set(r.event_id, rules);
  }
  const events: RecurringEvent[] = [];
  for (const e of eventRows) {
    const listed = eventChildIds.get(e.id);
    const childIds = keepChildren(listed);
    // An event for specific children whose children are all archived must not turn into a whole-family event.
    if (listed && listed.length > 0 && childIds.length === 0) continue;
    events.push({
      id: e.id,
      name: e.name,
      childIds,
      weekdays: [...e.weekdays].sort((a, b) => a - b) as Weekday[],
      start: e.start_date,
      end: e.end_date,
      capacityFraction: Number(e.capacity_fraction),
      subjectRules: rulesOf.get(e.id) ?? {},
      defaultRule: e.default_rule,
    });
  }

  const blockedChildIds = groupBy(blockedChildren, (r) => r.blocked_range_id, (r) => r.child_id);
  const blocked: BlockedPeriod[] = [];
  for (const b of blockedRows) {
    const listed = blockedChildIds.get(b.id);
    const childIds = keepChildren(listed);
    if (listed && listed.length > 0 && childIds.length === 0) continue;
    blocked.push({ id: b.id, start: b.start_date, end: b.end_date, childIds: childIds.length ? childIds : null, kind: b.kind });
  }

  const overrides: WeekOverride[] = overrideRows
    .filter((o) => planned.has(o.assignment_id) && (o.child_id == null || activeChild.has(o.child_id)))
    .map((o) => ({
      assignmentId: o.assignment_id,
      childId: o.child_id,
      weekStart: o.week_start,
      plannedUnits: Number(o.planned_units),
      mode: o.mode,
    }));

  const checkIns: ProgressCheckIn[] = checkInRows
    .filter((r) => planned.has(r.assignment_id) && activeChild.has(r.child_id))
    .map((r) => ({ assignmentId: r.assignment_id, childId: r.child_id, weekStart: r.week_start, position: Number(r.position), mode: r.mode }));

  // Both columns are set or both NULL (subject_default_weight_pair); a subject with none is simply not listed.
  const subjectWeights: SubjectWeight[] = subjects
    .filter((s) => s.default_weight_unit != null && s.default_weight != null)
    .map((s) => ({ subjectId: s.id, unitType: s.default_weight_unit!, weightPerUnit: Number(s.default_weight) }));

  const subjectWeekdays = subjects
    .filter((s) => s.default_weekdays != null)
    .map((s) => ({ subjectId: s.id, weekdays: sortedDays(s.default_weekdays)! }));

  return { timeZone: family.time_zone, calendar, assignments, ctx: { calendar, events, blocked, overrides, subjectWeights, subjectWeekdays, checkIns } };
}
