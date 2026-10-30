import type { Assignment, PlanContext, Weekday } from "./types";

export type WeekdaysSource = "assignment" | "subject" | "default";

/** A usable weekday list: non-empty, every entry an integer 0-6. Returned sorted and without repeats; otherwise null. */
export function validWeekdays(list: unknown): Weekday[] | null {
  if (!Array.isArray(list) || list.length === 0) return null;
  if (!list.every((d) => Number.isInteger(d) && d >= 0 && d <= 6)) return null;
  return [...new Set(list as Weekday[])].sort((x, y) => x - y);
}

/**
 * The days an assignment is planned on (S4-01): its own valid list, else its subject's default, else null
 * (every school day). An empty or invalid list counts as no choice, like an invalid weight (weightPerUnitOf).
 */
export function weekdaysOf(
  a: Pick<Assignment, "subjectId" | "weekdays">,
  ctx: Pick<PlanContext, "subjectWeekdays">,
): { weekdays: Weekday[] | null; source: WeekdaysSource } {
  const own = validWeekdays(a.weekdays);
  if (own) return { weekdays: own, source: "assignment" };
  const fromSubject = validWeekdays(ctx.subjectWeekdays?.find((s) => s.subjectId === a.subjectId)?.weekdays);
  if (fromSubject) return { weekdays: fromSubject, source: "subject" };
  return { weekdays: null, source: "default" };
}
