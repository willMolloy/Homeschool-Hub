/** T-02: breaks and recurring-event days on the timeline grid. Pure; no drawing. */
import { ruleFactor, weekdayOf, type BlockedKind, type ChildPlan } from "@hh/engine";
import type { BlockedRange, ScheduleEvent } from "../../api/types";
import { clipSpan, type DayGrid } from "./grid";

export interface TimelineBreak {
  id: string;
  label: string | null;
  kind: BlockedKind;
  /** Grid indices, inclusive, clipped to the grid. */
  first: number;
  last: number;
  /** [] = the whole family (shades every lane); otherwise only those children's sub-lanes. */
  childIds: string[];
}

export interface TimelineEvent {
  id: string;
  name: string;
  /** [] = the whole family. */
  childIds: string[];
  /** Grid indices of the days it happens, ascending. */
  days: number[];
}

/** Breaks that touch the grid, oldest first. */
export function breaksOnGrid(grid: DayGrid, blocked: readonly BlockedRange[]): TimelineBreak[] {
  return blocked
    .flatMap((b) => {
      const span = clipSpan(grid, b.startDate, b.endDate);
      return span ? [{ id: b.id, label: b.label, kind: b.kind, first: span[0], last: span[1], childIds: [...b.childIds] }] : [];
    })
    .sort((a, b) => a.first - b.first || a.last - b.last || a.id.localeCompare(b.id));
}

/** Grid indices covered by a family-wide break. */
export function familyBreakDays(breaks: readonly TimelineBreak[]): Set<number> {
  const out = new Set<number>();
  for (const b of breaks) if (b.childIds.length === 0) for (let i = b.first; i <= b.last; i++) out.add(i);
  return out;
}

/**
 * Days each active event happens: its weekdays, inside its own dates, on school days that no
 * family-wide break covers (on those days the event takes nothing from the plan, so it isn't marked).
 * Events with no day on the grid are left out.
 */
export function eventsOnGrid(grid: DayGrid, events: readonly ScheduleEvent[], breaks: readonly TimelineBreak[]): TimelineEvent[] {
  const closed = familyBreakDays(breaks);
  return events
    .filter((e) => !e.archived)
    .flatMap((e) => {
      const span = clipSpan(grid, e.startDate ?? grid.from, e.endDate ?? grid.to);
      if (!span) return [];
      const weekdays = new Set(e.weekdays);
      const days: number[] = [];
      for (let i = span[0]; i <= span[1]; i++) {
        if (grid.schoolDay[i] && !closed.has(i) && weekdays.has(weekdayOf(grid.dates[i]!))) days.push(i);
      }
      return days.length ? [{ id: e.id, name: e.name, childIds: [...e.childIds], days }] : [];
    });
}

/**
 * S10-05 fix (M1): the school days this plan can't be given work on, whatever the breaks: a weekday the assignment
 * doesn't use (its own days or its subject's, S4-01, with the S4-01b change date), or an event that day that skips
 * its subject for this child (a "skip" rule, or "lighter" leaving nothing). Break bridging doesn't count these as open.
 */
export function idleDays(
  grid: DayGrid,
  plan: Pick<ChildPlan, "childId" | "subjectId" | "weekdays" | "weekdaysFrom" | "previousWeekdays">,
  events: readonly ScheduleEvent[],
): boolean[] {
  const skips = events
    .filter((e) => !e.archived && (e.childIds.length === 0 || e.childIds.includes(plan.childId)))
    .filter((e) => {
      const own = Object.prototype.hasOwnProperty.call(e.subjectRules, plan.subjectId) ? e.subjectRules[plan.subjectId] : undefined;
      return ruleFactor(own ?? e.defaultRule ?? "normal", e.capacityFraction) === 0;
    })
    .map((e) => ({ from: e.startDate, to: e.endDate, weekdays: new Set<number>(e.weekdays) }));
  const now = plan.weekdays ? new Set<number>(plan.weekdays) : null;
  const before = plan.previousWeekdays ? new Set<number>(plan.previousWeekdays) : null;
  return grid.dates.map((date, i) => {
    if (!grid.schoolDay[i]) return false;
    const wd = weekdayOf(date);
    const mask = plan.weekdaysFrom && date < plan.weekdaysFrom ? before : now;
    if (mask && !mask.has(wd)) return true;
    return skips.some((e) => e.weekdays.has(wd) && (!e.from || date >= e.from) && (!e.to || date <= e.to));
  });
}
