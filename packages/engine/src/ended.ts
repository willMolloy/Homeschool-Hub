/**
 * S12-04: an assignment the parent said had ended is closed at `endedOn`. The plan is made as before (so a finished
 * bar keeps its place), then closed here:
 *
 * - **finished** (Yes, finished): done by the parent's word. The days stay as planned up to the planned end (a push that ran past it
 *   is cut); there is nothing left, no forecast, no unplaced work and no warnings. `complete` is true.
 * - **stopped** (We stopped): dropped. The days after `endedOn` are removed (a stop before the start leaves none), the effective
 *   `end` is `endedOn` (never past the planned end), nothing is left to do or forecast, and there are no warnings. `complete`
 *   stays false: a stopped assignment never counts as finished.
 *
 * Either way `endedAs` and `endedOn` are on the plan, and `plannedRangeForWeek` and `heavyWeek` count no day after `endedOn`.
 * Open assignments are untouched: their plans are exactly what they were (no new fields).
 */
import { EngineInputError, fromDayNumber, isValidLocalDate, toDayNumber } from "./dates";
import type { Assignment, ChildPlan } from "./types";

export function closePlan(plan: ChildPlan, a: Assignment): ChildPlan {
  if (a.endedAs == null) return plan;
  if (a.endedAs !== "finished" && a.endedAs !== "stopped") throw new EngineInputError(`Assignment ${a.id}: endedAs must be "finished" or "stopped"`);
  if (typeof a.endedOn !== "string" || !isValidLocalDate(a.endedOn)) throw new EngineInputError(`Assignment ${a.id}: an ended assignment needs a valid endedOn`);
  const base = { ...plan, endedAs: a.endedAs, endedOn: a.endedOn, unplacedUnits: 0, noCapacity: false, remainingUnits: 0, warnings: [] as ChildPlan["warnings"] };
  if (a.endedAs === "finished") {
    const last = toDayNumber(a.end);
    return { ...base, doneUnits: plan.totalUnits, complete: true, end: a.end, days: plan.days.filter((d) => toDayNumber(d.date) <= last) };
  }
  const on = toDayNumber(a.endedOn);
  const days = plan.days.filter((d) => toDayNumber(d.date) <= on);
  const end = fromDayNumber(Math.max(toDayNumber(a.start), Math.min(toDayNumber(plan.end), on)));
  return { ...base, complete: false, end, days };
}
