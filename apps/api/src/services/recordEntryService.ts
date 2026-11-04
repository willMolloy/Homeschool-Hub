/**
 * S9-07: working out what a log entry counts. The one calculation is which school days an entry covers; everything else
 * is what the parent typed. Nothing here reads or writes the plan's tables: it only reads the calendar (school days and days off).
 * S9b-01: days are derived from the entry's dates and the calendar (never a stored count), so two entries on one day are one day.
 * S9b-07: a run of dates may carry the days the parent ticked; then it covers exactly those (inside its dates), days off or not.
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
 * Saturday). A run of dates with ticked days (S9b-07): exactly those inside the run. A run without: each school-calendar day
 * in it, days off excluded (a weekend-only run covers none).
 */
export function coveredDays(model: CapacityModel, childId: string, start: string, end: string, days: readonly string[] | null = null): string[] {
  if (start === end) return [start];
  if (days) return [...new Set(days.filter((d) => d >= start && d <= end))].sort();
  return schoolCalendarDays(model, childId, start, end);
}

/** S9b-07: the school-calendar days (school weekdays less this child's days off) between two dates, oldest first. */
export function schoolCalendarDays(model: CapacityModel, childId: string, start: string, end: string): string[] {
  const out: string[] = [];
  for (let d = toDayNumber(start); d <= toDayNumber(end); d += 1) if (model.schoolDay(d, childId)) out.push(fromDayNumber(d));
  return out;
}

/** S9b-07: what the log form needs to tick a run's days: the family's school weekdays, and per date in the run whether it is a
 * school day and whether it is a day off, for the children picked (a date counts as a school day if it is one for any of them,
 * and as a day off if it is off for all of them; no children = the whole family's days off only). */
/** S10-10b (L3): `partlyOff` lists the dates that are a day off for some of the picked children but not all, and for whom. */
export interface RunDays { weekdays: number[]; schoolDays: string[]; daysOff: string[]; partlyOff: { date: string; childIds: string[] }[] }

export async function runDays(db: Queryable, familyId: string, childIds: readonly string[], start: string, end: string): Promise<RunDays> {
  const inputs = await readPlanInputs(db, familyId);
  const model = buildCapacityModel(inputs.calendar, [], inputs.ctx.blocked);
  // every weekday a school day: a date is "not a school day" here only because a day off covers it
  const offModel = buildCapacityModel({ ...inputs.calendar, schoolDays: [0, 1, 2, 3, 4, 5, 6] }, [], inputs.ctx.blocked);
  const kids = childIds.length > 0 ? childIds : [""];
  const schoolDays: string[] = [];
  const daysOff: string[] = [];
  const partlyOff: RunDays["partlyOff"] = [];
  for (let d = toDayNumber(start); d <= toDayNumber(end); d += 1) {
    if (kids.some((c) => model.schoolDay(d, c))) schoolDays.push(fromDayNumber(d));
    const off = kids.filter((c) => !offModel.schoolDay(d, c));
    if (off.length === kids.length) daysOff.push(fromDayNumber(d));
    else if (off.length > 0) partlyOff.push({ date: fromDayNumber(d), childIds: off });
  }
  return { weekdays: [...inputs.calendar.schoolDays].sort((a, b) => a - b), schoolDays, daysOff, partlyOff };
}

/** How many days an entry counts for a child: its covered days, or 0 with the switch off. */
export function daysCounted(model: CapacityModel, childId: string, start: string, end: string, counts: boolean, days: readonly string[] | null = null): number {
  return counts ? coveredDays(model, childId, start, end, days).length : 0;
}
