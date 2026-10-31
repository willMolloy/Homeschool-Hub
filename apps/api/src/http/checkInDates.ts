/**
 * T-07e: moving an assignment's dates respects the latest check-in (D24, S2b-38). The latest check-in is
 * authoritative, so its week has to stay inside the assignment: the start can't move past that week and the
 * end can't move before it. Earlier check-ins aren't checked (the latest one decides everything after it).
 */
import { addDays, type LocalDate } from "@hh/engine";
import type { Tx } from "../db";
import { HttpError } from "./errors";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "Nov 2" from a YYYY-MM-DD date (S6b-14 uses it for undo labels). */
export const short = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;

export async function checkDatesKeepLatestCheckIn(tx: Tx, familyId: string, assignmentId: string, start: string, end: string): Promise<void> {
  const { rows } = await tx.query<{ week: string | null }>(
    "SELECT max(week_start)::text AS week FROM progress_checkin WHERE family_id = $1 AND assignment_id = $2", [familyId, assignmentId]);
  const week = rows[0]?.week;
  if (!week) return;
  if (start > addDays(week as LocalDate, 6)) {
    throw new HttpError(409, "check_in_outside", `The week of ${short(week)} has a check-in, so the start can't move past it.`);
  }
  if (end < week) {
    throw new HttpError(409, "check_in_outside", `The week of ${short(week)} has a check-in, so the end can't move before it.`);
  }
}
