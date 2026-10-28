/** T-02: breaks and recurring-event days on the timeline grid. Pure; no drawing. */
import { weekdayOf, type BlockedKind } from "@hh/engine";
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
