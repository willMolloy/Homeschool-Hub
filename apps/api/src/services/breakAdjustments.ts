/**
 * S21-03: a confirmed break can move the end dates she pushed, in the same transaction as the break.
 * Keep sends no row. A day inside the break is refused. A minutes book keeps its minutes a day.
 */
import { weekdayOf } from "@hh/engine";
import type { Tx } from "../db";
import { HttpError } from "../http/errors";
import { checkDatesKeepLatestCheckIn } from "../http/checkInDates";
import { checkDateOrder, MAX_ASSIGNMENT_DAYS } from "../http/scheduleLimits";
import { lockAssignment, updateAssignment } from "../repos/assignmentRepo";
import { rescaledMinutesTotal } from "./minutesSpan";
import { assignmentStep, type UndoStep } from "./undoService";

const SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const usDate = (d: string) => `${SHORT[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}, ${d.slice(0, 4)}`;

export interface EndAdjustment { assignmentId: string; endDate: string }
export interface SavedBreak { startDate: string; endDate: string }

const FALLBACK_SCHOOL_DAYS = [1, 2, 3, 4, 5];

async function familySchoolDays(tx: Tx, familyId: string): Promise<number[]> {
  const { rows } = await tx.query<{ school_days: number[] }>("SELECT school_days FROM family WHERE id = $1", [familyId]);
  return rows[0]?.school_days?.length ? rows[0].school_days : FALLBACK_SCHOOL_DAYS;
}

async function daysAlreadyOff(tx: Tx, familyId: string): Promise<{ start: string; end: string; childIds: string[] }[]> {
  const { rows } = await tx.query<{ start: string; end: string; child_ids: string[] }>(
    `SELECT b.start_date::text AS start, b.end_date::text AS end,
            COALESCE((SELECT array_agg(c.child_id::text) FROM blocked_range_child c WHERE c.blocked_range_id = b.id), '{}') AS child_ids
       FROM blocked_range b WHERE b.family_id = $1`,
    [familyId],
  );
  return rows.map((r) => ({ start: r.start, end: r.end, childIds: r.child_ids ?? [] }));
}

/** Move each listed book to its new end. Returns the undo steps that put those books back. */
export async function applyBreakAdjustments(tx: Tx, familyId: string, adjustments: readonly EndAdjustment[], breaks: readonly SavedBreak[]): Promise<UndoStep[]> {
  const schoolDays = await familySchoolDays(tx, familyId);
  const off = await daysAlreadyOff(tx, familyId);
  const steps: UndoStep[] = [];
  const seen = new Set<string>();
  for (const adj of adjustments) {
    if (seen.has(adj.assignmentId)) throw new HttpError(400, "invalid_request", "Each book can have one end date.");
    seen.add(adj.assignmentId);
    const cur = await lockAssignment(tx, familyId, adj.assignmentId);
    if (!cur || cur.archived_at || cur.ended_as) throw new HttpError(400, "invalid_request", "That book is not open.");
    const inside = breaks.filter((b) => adj.endDate >= b.startDate && adj.endDate <= b.endDate).map((b) => b.endDate).sort();
    if (inside.length > 0) throw new HttpError(400, "invalid_request", `Pick a day after ${usDate(inside.at(-1)!)}.`);
    if (adj.endDate <= cur.start_date) throw new HttpError(400, "invalid_request", `Pick a day after ${usDate(cur.start_date)}.`);
    if (!schoolDays.includes(weekdayOf(adj.endDate))) throw new HttpError(400, "invalid_request", "Pick a school day.");
    const others = off.filter((b) => !breaks.some((s) => s.startDate === b.start && s.endDate === b.end));
    const coversBook = others.some((b) => adj.endDate >= b.start && adj.endDate <= b.end && (b.childIds.length === 0 || b.childIds.some((id) => cur.child_ids.includes(id))));
    if (coversBook) throw new HttpError(400, "invalid_request", "That day is already off. Pick a school day.");
    checkDateOrder(cur.start_date, adj.endDate, MAX_ASSIGNMENT_DAYS);
    await checkDatesKeepLatestCheckIn(tx, familyId, cur.id, cur.start_date, adj.endDate);
    let totalUnits: number | undefined;
    if (cur.unit_type === "minutes") {
      const kept = await rescaledMinutesTotal(tx, familyId, cur, {
        startDate: cur.start_date, endDate: adj.endDate, weekdays: cur.weekdays, subjectId: cur.subject_id,
      });
      if (kept !== null) totalUnits = kept;
    }
    await updateAssignment(tx, familyId, cur.id, { endDate: adj.endDate, ...(totalUnits !== undefined ? { totalUnits } : {}) });
    const after = (await lockAssignment(tx, familyId, cur.id))!;
    const step = assignmentStep(cur, after);
    if (step) steps.push(step);
  }
  return steps;
}
