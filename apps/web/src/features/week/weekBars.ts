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
  /** S18-03: the range words, worked out from the plan's own days (`weekRangeWords`) so they name what Days and the sheets name. Without it the bar falls back to `rangeWords` on from/to. */
  range?: string;
}

/** Rounding for page ranges (S15-06): each end to the nearest whole page, so consecutive days never overlap. */
export const wholeUnit = (position: number): number => Math.round(position + 1e-9);

const TOL = 1e-6;
const cap = (w: string) => `${w[0]!.toUpperCase()}${w.slice(1)}`;
/** Chapters and lessons say where in the unit a day is (S16-08, S16-11); pages keep plain ranges. */
const spans = (unitType: UnitType): boolean => unitType === "chapters" || unitType === "lessons";
/** The whole units a range finishes: those whose end (a whole position) lies in (from, to]. */
const finishedUnits = (from: number, to: number, total?: number): [number, number] => {
  const hi = Math.floor(to + TOL);
  return [Math.floor(from + TOL) + 1, total !== undefined ? Math.min(hi, Math.floor(total + TOL)) : hi];
};
const unitWords = (unitType: UnitType, a: number, b: number) => `${UNIT_LABELS[unitType][a === b ? "one" : "many"]} ${a === b ? a : `${a}–${b}`}`;

/**
 * "pages 120–150", "lesson 31", "chapters 4–6", "Chapter 17 · start", "90 minutes". Stateless, from the positions alone: it is the words for
 * a week's bar or status line, and the fallback for a day when the days around it are not known.
 * - **Pages** keep the S15-06 plain ranges (each end rounded to the nearest page).
 * - **Chapters and lessons** name the whole units the range finishes ("chapter 18", "chapters 18–19"); a range that finishes none is part-way
 *   through one unit: "Chapter 17 · start" when it begins the unit and `span` is set (a week), else "Chapter 17 · in progress".
 *   A single day's exact "start / day 2 of 3 / finish" needs its neighbours: see `daySpanLabels`.
 */
export function rangeWords(unitType: UnitType, from: number, to: number, total?: number, span = false): string {
  if (unitType === "minutes") {
    const n = Math.round(to - from);
    return `${unitNumber(n)} ${n === 1 ? UNIT_LABELS.minutes.one : UNIT_LABELS.minutes.many}`;
  }
  if (!spans(unitType)) {
    const first = wholeUnit(from) + 1;
    const last = wholeUnit(to);
    if (last < first) return `${UNIT_LABELS[unitType].one} ${Math.max(1, total !== undefined ? Math.min(Math.floor(from + TOL) + 1, Math.round(total)) : Math.floor(from + TOL) + 1)}`;
    return unitWords(unitType, first, last);
  }
  const [a, b] = finishedUnits(from, to, total);
  if (b >= a) return unitWords(unitType, a, b);
  const u = Math.floor(from + TOL) + 1;
  return `${cap(UNIT_LABELS[unitType].one)} ${u} · ${span && from - (u - 1) < TOL ? "start" : "in progress"}`;
}

/**
 * S16-11 (Will, N10): the exact words for each scheduled day of a chapter or lesson assignment, from its real sequence of scheduled days
 * (the plan's `days` with work on them: its weekdays, minus days off and breaks, and nothing after the day it ended). A unit is finished on
 * the day whose work reaches its end; the days before that, back to the day after the previous unit finished, are in progress in it. A unit
 * that takes several days reads start, day 2 of M, ... , finish, so each one has exactly one "start" and one "finish". A day that finishes
 * a unit that was started on an earlier day says "Chapter 3 · finish" (then "chapter 4" or "chapters 4–5" for whole units it also
 * finishes); a day that finishes units that had no earlier days is just "chapter 4" or "chapters 4–5". The labels come from the positions
 * only, so the daily sheet, the weekly sheet and Days agree provided they are given days either side of the ones shown. Empty for pages
 * and minutes, which keep plain ranges (see `rangeWords`).
 */
export function daySpanLabels(plan: Pick<ChildPlan, "days" | "unitType" | "totalUnits" | "endedOn">): Map<LocalDate, string> {
  return new Map([...daySpans(plan)].map(([date, s]) => [date, s.label]));
}

/** S18-03: one scheduled day's words and the units they name (first to last, whole numbers), so a week's bar can name exactly what its days name. */
export interface DaySpan { label: string; lo: number; hi: number }

/** `daySpanLabels` with the units each label names: "Chapter 17 · start" names 17; "Chapter 16 · finish, chapters 17–18" names 16 to 18. */
export function daySpans(plan: Pick<ChildPlan, "days" | "unitType" | "totalUnits" | "endedOn">): Map<LocalDate, DaySpan> {
  const out = new Map<LocalDate, DaySpan>();
  if (!spans(plan.unitType)) return out;
  const days = plan.days.filter((d) => d.units > EPS && !(plan.endedOn && d.date > plan.endedOn)).sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : 0));
  const rows = days.map((d) => {
    const [a, b] = finishedUnits(d.position - d.units, d.position, plan.totalUnits);
    return { date: d.date, a, b, ongoing: Math.floor(d.position - d.units + TOL) + 1 };
  });
  const inProgress = new Map<number, number[]>(); // unit -> the day indexes spent in it without finishing it
  const finishedBy = new Map<number, number>();    // unit -> the day index that finishes it
  rows.forEach((r, i) => {
    if (r.b < r.a) inProgress.set(r.ongoing, [...(inProgress.get(r.ongoing) ?? []), i]);
    else for (let k = r.a; k <= r.b; k++) finishedBy.set(k, i);
  });
  const word = UNIT_LABELS[plan.unitType].one;
  rows.forEach((r, i) => {
    if (r.b < r.a) {
      const mine = inProgress.get(r.ongoing)!;
      const at = mine.indexOf(i);
      const m = mine.length + (finishedBy.has(r.ongoing) ? 1 : 0);
      out.set(r.date, { label: `${cap(word)} ${r.ongoing} · ${at === 0 ? "start" : finishedBy.has(r.ongoing) ? `day ${at + 1} of ${m}` : "in progress"}`, lo: r.ongoing, hi: r.ongoing });
      return;
    }
    const earlier = (inProgress.get(r.a) ?? []).some((j) => j < i);
    const parts: string[] = [];
    if (earlier) parts.push(`${cap(word)} ${r.a} · finish`);
    if (earlier ? r.b > r.a : true) parts.push(unitWords(plan.unitType, earlier ? r.a + 1 : r.a, r.b));
    out.set(r.date, { label: parts.join(", "), lo: r.a, hi: r.b });
  });
  return out;
}

/**
 * S18-03 (E3): a week's range words, from the plan's own days, so the Week bar names the same units as that week's Days lines and the
 * printed sheet (they come from `daySpans`). Pages and minutes are `rangeWords` on the week's positions (their days already agree, S15-06).
 * Chapters and lessons name every unit the week works on, first to last:
 * - one unit that the week finishes: "chapter 16"; one it only begins or goes on with: "Chapter 17 · start" / "Chapter 17 · in progress";
 * - several: "chapters 16–17", with "(starts 17)" when the last one is not finished by the week's end ("lessons 24–26 (starts 26)").
 * `plan` must hold days either side of the week (see `useSpanPlans`); with none of its days in the week it falls back to `rangeWords`.
 */
export function weekRangeWords(plan: Pick<ChildPlan, "days" | "unitType" | "totalUnits" | "endedOn">, weekStart: LocalDate): string {
  const weekEnd = addDays(weekStart, 6);
  const days = plan.days.filter((d) => d.date >= weekStart && d.date <= weekEnd && !(plan.endedOn && d.date > plan.endedOn));
  const first = days.find((d) => d.units > EPS);
  const from = first ? first.position - first.units : 0;
  const to = days.length ? Math.max(...days.map((d) => d.position)) : 0;
  if (!first) return rangeWords(plan.unitType, 0, 0, plan.totalUnits, true);
  if (!spans(plan.unitType)) return rangeWords(plan.unitType, from, to, plan.totalUnits, true);
  const named = daySpans(plan);
  let lo = Infinity;
  let hi = -Infinity;
  for (const d of days) {
    const sp = named.get(d.date);
    if (sp) { lo = Math.min(lo, sp.lo); hi = Math.max(hi, sp.hi); }
  }
  if (lo > hi) return rangeWords(plan.unitType, from, to, plan.totalUnits, true);
  const finished = to >= hi - TOL;
  if (lo === hi) {
    if (finished) return unitWords(plan.unitType, lo, hi);
    return `${cap(UNIT_LABELS[plan.unitType].one)} ${lo} · ${from - (lo - 1) < TOL ? "start" : "in progress"}`;
  }
  return `${unitWords(plan.unitType, lo, hi)}${finished ? "" : ` (starts ${hi})`}`;
}

/**
 * S18-03: the same words for a finished week's check-in row or the Update status line. With the plan (days either side of the week) and
 * the plan's own range for that week equal to the row's, the words come from the days; otherwise (no plan yet, or the plan has moved since)
 * from the row's positions.
 */
export function itemRangeWords(item: Pick<CheckInItem, "unitType" | "plannedFrom" | "plannedTo" | "totalUnits">, plan: ChildPlan | undefined, weekStart: LocalDate | undefined): string {
  if (plan && weekStart) {
    const r = plannedRange(plan, weekStart);
    if (r.hasPlannedWork && Math.abs(r.from - item.plannedFrom) < 0.011 && Math.abs(r.to - item.plannedTo) < 0.011) return weekRangeWords(plan, weekStart);
  }
  return rangeWords(item.unitType, item.plannedFrom, item.plannedTo, item.totalUnits, true);
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
      title: l.titleOf(p.assignmentId), unitType: p.unitType, from: r.from, to: r.to, total: p.totalUnits, range: weekRangeWords(p, weekStart) });
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
