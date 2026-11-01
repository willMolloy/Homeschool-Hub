/** S8-05: one bar per assignment for a week, in the family's words. Pure. */
import { addDays, EPS, type ChildPlan, type LocalDate, type UnitType } from "@hh/engine";
import type { Child, CheckInItem, ScheduleEvent, Subject } from "../../api/types";
import { UNIT_LABELS, unitNumber } from "../../components/unitLabels";

export interface WeekBarData {
  key: string;
  assignmentId: string;
  childId: string;
  childName: string;
  subjectId: string | null;
  title: string;
  unitType: UnitType;
  /** Cumulative units at the start and end of the week. */
  from: number;
  to: number;
  total: number;
}

/** "pages 120–150", "lesson 31", "chapters 4–6", "90 minutes": fractions round outward, never "4.38". */
export function rangeWords(unitType: UnitType, from: number, to: number): string {
  if (unitType === "minutes") {
    const n = Math.round(to - from);
    return `${unitNumber(n)} ${n === 1 ? UNIT_LABELS.minutes.one : UNIT_LABELS.minutes.many}`;
  }
  const first = Math.floor(from + 1e-9) + 1;
  const last = Math.max(first, Math.ceil(to - 1e-9));
  const word = UNIT_LABELS[unitType][first === last ? "one" : "many"];
  return `${word} ${first === last ? first : `${first}–${last}`}`;
}

export interface Lookups {
  children: readonly Child[];
  subjects: readonly Subject[];
  titleOf: (assignmentId: string) => string;
  subjectOf: (assignmentId: string) => string | null;
}

const displayOrder = <T extends { archived: boolean; sortOrder: number; name: string }>(a: T, b: T) =>
  Number(a.archived) - Number(b.archived) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);

/** Child order, then subject (lane) order, then title. */
function sortBars(bars: WeekBarData[], l: Lookups): WeekBarData[] {
  const kids = [...l.children].sort(displayOrder).map((c) => c.id);
  const subs = [...l.subjects].sort(displayOrder).map((s) => s.id);
  const rank = (list: string[], id: string | null) => (id && list.includes(id) ? list.indexOf(id) : list.length);
  return bars.sort((a, b) => rank(kids, a.childId) - rank(kids, b.childId) || rank(subs, a.subjectId) - rank(subs, b.subjectId) || a.title.localeCompare(b.title));
}

/**
 * S8b-01: where the week starts and ends, in cumulative units, the same figures Track work gets from the check-in API
 * (the engine's `plannedRangeForWeek`). That function adds up the days before the week, but the Week view asks the
 * plan for one week only, so it would start every book at 1. Each day carries its cumulative `position` instead, which
 * the engine counts from the assignment's start whatever range is asked for.
 */
export function plannedRange(plan: ChildPlan, weekStart: LocalDate): { from: number; to: number; hasPlannedWork: boolean } {
  const end = addDays(weekStart, 6);
  const days = plan.days.filter((d) => d.date >= weekStart && d.date <= end);
  const first = days.find((d) => d.units > EPS);
  if (!first) return { from: 0, to: 0, hasPlannedWork: false };
  const to = Math.max(...days.map((d) => d.position));
  return { from: first.position - first.units, to, hasPlannedWork: true };
}

/** The bars of a current or coming week, from the engine's plans: only assignments with work that week. */
export function barsFromPlans(plans: readonly ChildPlan[], weekStart: LocalDate, l: Lookups): WeekBarData[] {
  const names = new Map(l.children.map((c) => [c.id, c.name]));
  const bars: WeekBarData[] = [];
  for (const p of plans) {
    const r = plannedRange(p, weekStart);
    if (!r.hasPlannedWork || !names.has(p.childId)) continue;
    bars.push({ key: `${p.assignmentId}/${p.childId}`, assignmentId: p.assignmentId, childId: p.childId, childName: names.get(p.childId)!, subjectId: p.subjectId,
      title: l.titleOf(p.assignmentId), unitType: p.unitType, from: r.from, to: r.to, total: p.totalUnits });
  }
  return sortBars(bars, l);
}

/** The bars of a finished week, from its check-in rows. */
export function barsFromItems(items: readonly CheckInItem[], l: Lookups): WeekBarData[] {
  return sortBars(items.map((i) => ({
    key: `${i.assignmentId}/${i.childId}`, assignmentId: i.assignmentId, childId: i.childId, childName: i.childName, subjectId: l.subjectOf(i.assignmentId),
    title: i.title, unitType: i.unitType, from: i.plannedFrom, to: i.plannedTo, total: i.totalUnits,
  })), l);
}

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/** One quiet line per event that falls in the week: "Tue · Co-op". */
export function eventLines(events: readonly ScheduleEvent[], weekStart: LocalDate, weekEnd: LocalDate, childId: string | null): { key: string; text: string }[] {
  return events
    .filter((e) => !e.archived && (!e.startDate || e.startDate <= weekEnd) && (!e.endDate || e.endDate >= weekStart))
    .filter((e) => childId === null || e.childIds.length === 0 || e.childIds.includes(childId))
    .map((e) => ({ key: e.id, text: `${e.weekdays.map((d) => DAY_NAMES[d]).join(", ")} · ${e.name}` }));
}
