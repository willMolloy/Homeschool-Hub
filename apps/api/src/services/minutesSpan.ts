/**
 * S20-01: moving a minutes assignment's dates or days keeps the minutes a day. The stored total is that daily
 * amount times the school days in the span, so a new span gets a new total and the weight stays put.
 */
import { countWeekdays, totalForSameDaily, type LocalDate } from "@hh/engine";
import type { Queryable } from "../db";
import { HttpError } from "../http/errors";
import { MAX_STORED_UNITS } from "../http/scheduleLimits";
import type { AssignmentRow } from "../repos/assignmentRepo";
import { subjectDefaultWeekdays } from "../repos/subjectRepo";

const FALLBACK_SCHOOL_DAYS = [1, 2, 3, 4, 5];

async function schoolDaysOf(db: Queryable, familyId: string): Promise<number[]> {
  const { rows } = await db.query<{ school_days: number[] }>("SELECT school_days FROM family WHERE id = $1", [familyId]);
  return rows[0]?.school_days?.length ? rows[0].school_days : FALLBACK_SCHOOL_DAYS;
}

/** The days the assignment actually runs: its own, else its subject's, else the family's school days. */
async function resolvedDays(db: Queryable, familyId: string, subjectId: string, own: number[] | null): Promise<number[]> {
  if (own && own.length > 0) return own;
  const subject = await subjectDefaultWeekdays(db, familyId, subjectId);
  if (subject && subject.length > 0) return subject;
  return schoolDaysOf(db, familyId);
}

export interface MinutesSpan {
  startDate: string;
  endDate: string;
  weekdays: number[] | null;
  subjectId: string;
}

/**
 * The total to store so the minutes a day stay the same, or null when nothing about the span changed
 * (or this is not a minutes assignment). Throws when the derived total does not fit the column.
 */
export async function rescaledMinutesTotal(db: Queryable, familyId: string, cur: AssignmentRow, next: MinutesSpan): Promise<number | null> {
  if (cur.unit_type !== "minutes") return null;
  const oldDays = await resolvedDays(db, familyId, cur.subject_id, cur.weekdays);
  const newDays = await resolvedDays(db, familyId, next.subjectId, next.weekdays);
  const oldN = countWeekdays(cur.start_date as LocalDate, cur.end_date as LocalDate, oldDays);
  const newN = countWeekdays(next.startDate as LocalDate, next.endDate as LocalDate, newDays);
  if (oldN === newN) return null;
  const total = totalForSameDaily(Number(cur.total_units), oldN, newN);
  if (!(total > 0) || total > MAX_STORED_UNITS) {
    throw new HttpError(400, "invalid_request", `totalUnits: totalUnits must be more than 0 and at most ${MAX_STORED_UNITS.toLocaleString("en-US")}.`);
  }
  return total === Number(cur.total_units) ? null : total;
}
