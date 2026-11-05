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

/**
 * S15-06: a whole unit belongs to exactly one day. The plan's cumulative positions are fractional (about 1.3 chapters a day), so a chapter
 * split across two days used to be listed on both ("chapters 17–18, 18–19"). Display only: each range runs from the unit after the previous
 * rounded end to this range's rounded end (the cumulative position rounded to the nearest whole unit), so consecutive days never overlap and
 * the last day lands on the total. A range that does not move (under half a unit) reads "Keep going: Chapter 7". The plan and stored data
 * are unchanged. `total` (when known) stops "Keep going" naming a unit past the end.
 */
export const wholeUnit = (position: number): number => Math.round(position + 1e-9);

const TOL = 1e-6;
const cap = (w: string) => `${w[0]!.toUpperCase()}${w.slice(1)}`;

/**
 * S16-08 (Will): a chapter, lesson or page that takes several days says where in it the day is: "Chapter 17 · start", "Chapter 17 · day 2
 * of 3", "Chapter 17 · finish" (two days: start and finish). "Keep going" is gone. Display only, from the cumulative positions alone, so a
 * day's own sheet, the week's sheet and Days always agree (a daily sheet only knows its own day). When a day sits inside one unit:
 *  - it begins the unit (position at the unit's start): "start"; it ends the unit: "finish";
 *  - a day in the middle counts its place from the day's own size (about 1 / size days make the unit), so 0.33 a day gives "day 2 of 3".
 * With `span` (a week's bar, or a week's status line, which is several days long) the middle reads "in progress" instead.
 * A day that takes the end of one unit and the start of the next (and so rounds to no whole unit) is named for the unit it spends more
 * of: "Chapter 17 · finish". Days that cover whole units keep the S15-06 ranges ("chapter 18", "chapters 18–19").
 */
function unitPart(f: number, t: number, span: boolean): { unit: number; part: string } | null {
  const u1 = Math.floor(f + TOL) + 1;
  const u2 = Math.ceil(t - TOL);
  if (u1 === u2) {
    const startsHere = f - (u1 - 1) < TOL, endsHere = u1 - t < TOL;
    if (startsHere && endsHere) return null; // the whole unit
    if (startsHere) return { unit: u1, part: "start" };
    if (endsHere) return { unit: u1, part: "finish" };
    if (span) return { unit: u1, part: "in progress" };
    const w = t - f;
    const n = Math.max(3, Math.round(1 / w));
    const i = Math.min(n - 1, Math.max(2, Math.round((f - (u1 - 1)) / w) + 1));
    return { unit: u1, part: `day ${i} of ${n}` };
  }
  return null;
}

/** "pages 120–150", "lesson 31", "chapters 4–6", "Chapter 17 · start", "90 minutes". */
export function rangeWords(unitType: UnitType, from: number, to: number, total?: number, span = false): string {
  if (unitType === "minutes") {
    const n = Math.round(to - from);
    return `${unitNumber(n)} ${n === 1 ? UNIT_LABELS.minutes.one : UNIT_LABELS.minutes.many}`;
  }
  const one = UNIT_LABELS[unitType].one;
  const within = unitPart(from, to, span);
  if (within) return `${cap(one)} ${within.unit} · ${within.part}`;
  const first = wholeUnit(from) + 1;
  const last = wholeUnit(to);
  if (last < first) {
    // the day ends one unit and begins the next, rounding to neither: name the unit it spends more of
    const u1 = Math.floor(from + TOL) + 1, u2 = Math.ceil(to - TOL);
    const finishing = u1 - from >= to - (u2 - 1) - TOL;
    const unit = Math.max(1, Math.min(finishing ? u1 : u2, total !== undefined ? Math.max(1, Math.round(total)) : Infinity));
    return `${cap(one)} ${unit} · ${finishing ? "finish" : "start"}`;
  }
  // a day that began part-way through a unit and finishes it (taking a little of the next, so it rounds to that one unit) is that unit's finish
  if (first === last && first === Math.floor(from + TOL) + 1 && from - (first - 1) >= 0.25) return `${cap(one)} ${first} · finish`;
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
  return plannedRangeBetween(plan, weekStart, addDays(weekStart, 6));
}

/**
 * The same cumulative range for any run of days (S13-02: the printed sheets ask for one day at a time, so a day's "pages 120–126"
 * and the week's "pages 120–150" come from one rule). Nothing is planned after the day the parent said it ended (S12-04).
 */
export function plannedRangeBetween(plan: ChildPlan, from: LocalDate, to: LocalDate): { from: number; to: number; hasPlannedWork: boolean } {
  const days = plan.days.filter((d) => d.date >= from && d.date <= to && !(plan.endedOn && d.date > plan.endedOn));
  const first = days.find((d) => d.units > EPS);
  if (!first) return { from: 0, to: 0, hasPlannedWork: false };
  const last = Math.max(...days.map((d) => d.position));
  return { from: first.position - first.units, to: last, hasPlannedWork: true };
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
