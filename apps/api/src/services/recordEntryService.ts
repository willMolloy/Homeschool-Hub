/**
 * S9-07: working out what a log entry counts. The one calculation is which school days an entry covers; everything else
 * is what the parent typed. Nothing here reads or writes the plan's tables: it only reads the calendar (school days and days off).
 * S9b-01: days are derived from the entry's dates and the calendar (never a stored count), so two entries on one day are one day.
 */
import { buildCapacityModel, fromDayNumber, toDayNumber, type CapacityModel } from "@hh/engine";
import type { Queryable } from "../db";
import { readPlanInputs } from "../plan/loadPlanInputs";

/** The calendar as a model: school days (the family's weekdays) minus days off, per child. */
export async function calendarModel(db: Queryable, familyId: string): Promise<CapacityModel> {
  const inputs = await readPlanInputs(db, familyId);
  return buildCapacityModel(inputs.calendar, [], inputs.ctx.blocked);
}

/**
 * The days an entry covers for a child, whatever its switch says. One date: that day (the parent chose that very day, even a
 * Saturday). A run of dates: each school-calendar day in it, days off excluded (a weekend-only run covers none).
 */
export function coveredDays(model: CapacityModel, childId: string, start: string, end: string): string[] {
  if (start === end) return [start];
  const out: string[] = [];
  for (let d = toDayNumber(start); d <= toDayNumber(end); d += 1) if (model.schoolDay(d, childId)) out.push(fromDayNumber(d));
  return out;
}

/** How many days an entry counts for a child: its covered days, or 0 with the switch off. */
export function daysCounted(model: CapacityModel, childId: string, start: string, end: string, counts: boolean): number {
  return counts ? coveredDays(model, childId, start, end).length : 0;
}
