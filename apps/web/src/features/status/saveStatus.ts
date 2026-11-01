/**
 * S9-02: "Update status" is the only thing that writes a check-in now. The API replaces a whole week's check-ins on each
 * save, so the body keeps every stored row of that week and swaps in the one the parent just changed. A row that is back
 * as planned is dropped (as planned is never stored).
 */
import type { OverrideMode } from "@hh/engine";
import type { CheckInItem, SaveWeekBody, WeekCheckIn } from "../../api/types";
import { itemKey, rowOutcome } from "../checkin/absorb";

export function statusBody(week: WeekCheckIn, item: CheckInItem, position: number, mode: OverrideMode | null): SaveWeekBody {
  const key = itemKey(item);
  const kept = [...week.items, ...week.addable]
    .filter((i) => i.actual !== null && itemKey(i) !== key)
    .map((i) => ({ assignmentId: i.assignmentId, childId: i.childId, position: i.actual!, mode: i.mode }));
  const changed = rowOutcome(item, position) !== "asPlanned"
    ? [{ assignmentId: item.assignmentId, childId: item.childId, position, mode: rowOutcome(item, position) === "finished" ? null : mode }]
    : [];
  return { status: "reviewed", items: [...kept, ...changed] };
}
