/**
 * S18-01 / S18-02: one Update status save, undoable as one change. It writes the week's check-ins (`saveWeek`), optionally moves
 * the assignment's end date in the same transaction (the parent's pick, or the date the late line suggests), and records ONE
 * undo entry whose steps put the week's check-ins, its review status and the end date back exactly as they were.
 */
import type { LocalDate } from "@hh/engine";
import type { Tx } from "../db";
import { HttpError } from "../http/errors";
import { checkDatesKeepLatestCheckIn, short } from "../http/checkInDates";
import { checkDateOrder, MAX_ASSIGNMENT_DAYS } from "../http/scheduleLimits";
import { getAssignment, lockAssignment, updateAssignment } from "../repos/assignmentRepo";
import { saveWeek, type SaveWeekRequest, type WeekCheckInJson } from "./checkInService";
import { assignmentStep, recordUndo, type UndoStep, type WeekCheckInsState } from "./undoService";

export interface StatusSaveRequest extends SaveWeekRequest {
  /** Move this assignment's end date (every child on it) as part of the save. */
  endDate?: { assignmentId: string; endDate: LocalDate };
}

/** The week's stored check-ins and review status as they are now (the state an undo puts back). */
export async function weekCheckInsState(tx: Tx, familyId: string, weekStart: string): Promise<WeekCheckInsState> {
  const { rows } = await tx.query<{ assignment_id: string; child_id: string; position: string; mode: WeekCheckInsState["items"][number]["mode"] }>(
    `SELECT assignment_id, child_id, position, mode FROM progress_checkin WHERE family_id = $1 AND week_start = $2
      ORDER BY assignment_id, child_id`, [familyId, weekStart]);
  const { rows: review } = await tx.query<{ status: WeekCheckInsState["status"] }>(
    "SELECT status FROM week_review WHERE family_id = $1 AND week_start = $2", [familyId, weekStart]);
  return {
    status: review[0]?.status ?? null,
    items: rows.map((r) => ({ assignmentId: r.assignment_id, childId: r.child_id, position: Number(r.position), mode: r.mode })),
  };
}

const plural = (n: number) => `${n} assignments`;

export async function saveStatus(tx: Tx, familyId: string, req: StatusSaveRequest): Promise<WeekCheckInJson & { planChanged: boolean }> {
  const { endDate, ...rest } = req;
  const beforeWeek = await weekCheckInsState(tx, familyId, req.weekStart);
  const result = await saveWeek(tx, familyId, rest);

  const steps: UndoStep[] = [{ op: "weekCheckIns", weekStart: req.weekStart, set: beforeWeek }];
  let movedTitle: string | null = null;
  let movedTo: string | null = null;
  if (endDate) {
    const cur = await lockAssignment(tx, familyId, endDate.assignmentId);
    if (!cur) throw new HttpError(400, "invalid_reference", "endDate.assignmentId: must be one of your assignments.");
    // The check-ins are written first, so the latest one (maybe this week's) is held to the new end.
    checkDateOrder(cur.start_date, endDate.endDate, MAX_ASSIGNMENT_DAYS);
    await checkDatesKeepLatestCheckIn(tx, familyId, cur.id, cur.start_date, endDate.endDate);
    await updateAssignment(tx, familyId, cur.id, { endDate: endDate.endDate });
    const step = assignmentStep(cur, (await getAssignment(tx, familyId, cur.id))!);
    if (step) {
      // The assignment goes back after the check-ins (an earlier end must not meet a newer check-in).
      steps.push(step);
      movedTitle = cur.title;
      movedTo = endDate.endDate;
    }
  }

  // The label names what the parent touched: the assignments whose stored check-in changed, or the one whose end moved.
  const was = new Map(beforeWeek.items.map((i) => [`${i.assignmentId}/${i.childId}`, `${i.position}/${i.mode}`]));
  const now = await weekCheckInsState(tx, familyId, req.weekStart);
  const is = new Map(now.items.map((i) => [`${i.assignmentId}/${i.childId}`, `${i.position}/${i.mode}`]));
  const changed = new Set<string>();
  for (const [k, v] of is) if (was.get(k) !== v) changed.add(k.split("/")[0]!);
  for (const k of was.keys()) if (!is.has(k)) changed.add(k.split("/")[0]!);
  if (endDate) changed.add(endDate.assignmentId);
  let label: string;
  if (changed.size > 1) label = `Updated ${plural(changed.size)}`;
  else {
    const id = [...changed][0] ?? req.items[0]?.assignmentId;
    const title = movedTitle ?? (id ? (await getAssignment(tx, familyId, id))?.title : undefined);
    label = title ? `Updated ${title}` : "Updated the week";
    if (movedTo) label += `, end moved to ${short(movedTo)}`;
  }
  await recordUndo(tx, familyId, label, steps);
  return result;
}
