/**
 * S9-07: working out what a log entry counts. The one calculation is how many school days an entry covers; everything else
 * is what the parent typed. Nothing here reads or writes the plan's tables: it only reads the calendar (school days and days off).
 */
import { buildCapacityModel, toDayNumber, type CapacityModel } from "@hh/engine";
import type { Queryable } from "../db";
import { readPlanInputs } from "../plan/loadPlanInputs";

/** The calendar as a model: school days (the family's weekdays) minus days off, per child. */
export async function calendarModel(db: Queryable, familyId: string): Promise<CapacityModel> {
  const inputs = await readPlanInputs(db, familyId);
  return buildCapacityModel(inputs.calendar, [], inputs.ctx.blocked);
}

/**
 * How many days an entry counts for a child. Switch off: 0. One date: 1 (the parent chose that very day, even a Saturday).
 * A run of dates: each school-calendar day in it, days off excluded.
 */
export function daysCounted(model: CapacityModel, childId: string, start: string, end: string, counts: boolean): number {
  if (!counts) return 0;
  if (start === end) return 1;
  let n = 0;
  for (let d = toDayNumber(start); d <= toDayNumber(end); d += 1) if (model.schoolDay(d, childId)) n += 1;
  return n;
}
