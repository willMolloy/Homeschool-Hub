/** S8-06: the end dates the Update status sheet offers, worked out from the plan the API already made. Pure. */
import { addDays, weekdayOf, type ChildPlan, type LocalDate } from "@hh/engine";

/** `from` moved by `n` school days (negative = earlier); the days are the weekdays 0 = Sunday … 6 = Saturday. */
export function shiftSchoolDays(from: LocalDate, n: number, weekdays: readonly number[]): LocalDate {
  if (weekdays.length === 0 || n === 0) return from;
  const step = n > 0 ? 1 : -1;
  let date = from;
  let left = Math.abs(n);
  for (let guard = 0; left > 0 && guard < 4000; guard++) {
    date = addDays(date, step);
    if (weekdays.includes(weekdayOf(date))) left -= 1;
  }
  return date;
}

export interface EndChoices {
  /** The end date as it stands: kept by "Keep". */
  keep: LocalDate;
  /** Where "Move to" puts it at the same pace, or null when it would not move. */
  move: LocalDate | null;
}

/**
 * Behind by `shortfall` units (negative = ahead): keeping the end spreads them over the remaining days; moving the end
 * keeps the pace, so it shifts by as many school days as the shortfall takes at the plan's pace. Blocked days are not
 * known here, so a move over a break can land a little early; the plan shows the real date after saving.
 */
export function endChoices(plan: Pick<ChildPlan, "end" | "rate" | "baseRate" | "weekdays">, shortfall: number, schoolDays: readonly number[]): EndChoices {
  const rate = plan.rate > 0 ? plan.rate : plan.baseRate;
  if (!(rate > 0) || Math.abs(shortfall) < 1e-9) return { keep: plan.end, move: null };
  const days = Math.max(1, Math.round(Math.abs(shortfall) / rate));
  const move = shiftSchoolDays(plan.end, shortfall > 0 ? days : -days, plan.weekdays ?? schoolDays);
  return { keep: plan.end, move: move === plan.end ? null : move };
}
