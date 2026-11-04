/** S8-04: the plain facts Home shows, as pure functions of the plans and assignments the API already made. */
import { addDays, toDayNumber, type ChildPlan, type LocalDate } from "@hh/engine";
import type { Assignment } from "../../api/types";
import { formatShort, formatSpan, formatWeekday } from "../../lib/dates";

/** "Good morning" until noon, "Good afternoon" until 5 pm, then "Good evening". */
export function greetingFor(hour: number): string {
  return hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
}

/** "Saturday, Oct 31" (US style, S9-04). */
export const longDate = (date: LocalDate): string => formatWeekday(date);

/** "Oct 26" */
export const dayMonth = (date: LocalDate): string => formatShort(date);

/** "Oct 26 – Nov 1" for a week. */
export const weekSpan = (weekStart: LocalDate): string => formatSpan(weekStart, addDays(weekStart, 6));

/**
 * "Week N of M" from the span of the family's live assignments (the app stores no school-year dates), only while
 * today falls inside that span. Weeks are counted from the first assignment's start.
 */
export function weekOfSpan(assignments: readonly Assignment[], today: LocalDate): { n: number; m: number } | null {
  const live = assignments.filter((a) => !a.archived);
  if (live.length === 0) return null;
  const first = live.reduce((x, a) => (a.startDate < x ? a.startDate : x), live[0]!.startDate);
  const last = live.reduce((x, a) => (a.endDate > x ? a.endDate : x), live[0]!.endDate);
  if (today < first || today > last) return null;
  const m = Math.ceil((toDayNumber(last) - toDayNumber(first) + 1) / 7);
  return { n: Math.min(m, Math.floor((toDayNumber(today) - toDayNumber(first)) / 7) + 1), m };
}

export interface WeekGlance {
  /** 0..1: the share of this week's planned work that is behind today (assumed done). */
  progress: number;
  /** Assignments with planned work today or later this week. */
  left: number;
  /** Whether anything at all is planned for this child this week (false: say "Nothing planned", never "All done"). */
  planned: boolean;
}

/** One child's week: how much of it is behind them and how many assignments still have work in it. */
export function weekGlance(plans: readonly ChildPlan[], childId: string, weekStart: LocalDate, today: LocalDate): WeekGlance {
  const end = addDays(weekStart, 6);
  let total = 0;
  let before = 0;
  let left = 0;
  for (const p of plans) {
    if (p.childId !== childId) continue;
    let later = false;
    for (const d of p.days) {
      if (d.date < weekStart || d.date > end || d.units <= 0) continue;
      total += d.units;
      if (d.date < today) before += d.units;
      else later = true;
    }
    if (later) left += 1;
  }
  return { progress: total > 0 ? before / total : 0, left, planned: total > 0 };
}

/** The latest finish across work that is not done, and whether it is still the planned one. */
export function finishGlance(plans: readonly ChildPlan[]): { date: LocalDate; onTrack: boolean } | null {
  const open = plans.filter((p) => !p.complete);
  if (open.length === 0) return null;
  const date = open.reduce((x, p) => (p.end > x ? p.end : x), open[0]!.end);
  const planned = open.reduce((x, p) => (p.plannedEnd > x ? p.plannedEnd : x), open[0]!.plannedEnd);
  return { date, onTrack: date <= planned };
}

/**
 * S9b-03: the Schedule card's line. "on track to finish {date}" only when the forecast is known and nothing is forecast late;
 * "{N} running late" when something is (the briefing line names the most important one); otherwise when it finishes.
 */
export function scheduleSub(finish: { date: LocalDate; onTrack: boolean } | null, late: number | undefined): string {
  const head = "This week and your year";
  if (late !== undefined && late > 0) return `${head} · ${late} running late`;
  if (!finish) return head;
  if (finish.onTrack && late === 0) return `${head} · on track to finish ${dayMonth(finish.date)}`;
  if (!finish.onTrack) return `${head} · finishing about ${dayMonth(finish.date)}`;
  return head;
}
