/**
 * S4-09: the weekly briefing's lines, as pure functions of plans the API already made. Per child, in this order:
 * will finish late (or no recent progress), plan problems, a heavy week. The check-in nudge is one line for the family (see Briefing.tsx).
 */
import { EPS, forecastOutcome, heavyWeek, HEAVY_WEEK_RATIO, noRecentProgress, toDayNumber, type ChildPlan, type FamilyCalendar, type LocalDate, type ProgressCheckIn } from "@hh/engine";
import { shortDate } from "../schedule/formBits";

/**
 * S7b-05: what a "will finish late" line offers: move the end date to the forecast, or keep it. `moveTo` is null when
 * there is no date to move to (a pace so slow the forecast gives up). `signature` names the forecast the line was
 * made from, so a "Keep" lasts until the forecast changes.
 */
export interface LateAction {
  assignmentId: string;
  childId: string;
  end: LocalDate;
  moveTo: LocalDate | null;
  signature: string;
}

export interface BriefingLine {
  key: string;
  text: string;
  action?: LateAction;
}

export interface ChildBriefing {
  childId: string;
  childName: string;
  lines: BriefingLine[];
}

export interface BriefingInput {
  plans: readonly ChildPlan[];
  /** Active children, in the order they are shown. */
  children: readonly { id: string; name: string }[];
  titleOf: (assignmentId: string) => string;
  /** The shown week's first day (the heavy-week line is about this week). */
  weekStart: LocalDate;
  calendar: FamilyCalendar;
}

/** The check-ins the engine applied, one per week, rebuilt from the plan (the forecast only counts weeks). */
const appliedCheckIns = (p: ChildPlan): ProgressCheckIn[] =>
  p.checkInWeeks.map((weekStart) => ({ assignmentId: p.assignmentId, childId: p.childId, weekStart, position: 0, mode: null }));

/** S4b-03: a forecast more than this many weeks late is reported plainly, not as a week count. */
export const VERY_LATE_WEEKS = 26;

/** S4b-03 / S7b-04: the engine decides (adjusted weeks and weekday changes are handled there). */
export { noRecentProgress };

export function weeksLate(end: LocalDate, forecast: LocalDate): number {
  return Math.max(1, Math.round((toDayNumber(forecast) - toDayNumber(end)) / 7));
}

/**
 * S18-02: the one place that says when a late assignment would finish and which end date to offer for it. The briefing's late
 * line ("Move end to Feb 1") and Update status's "Move the end to ..." both read it, so they always name the same date for the
 * same plan. `moveTo` is null when there is no date to move to (a pace so slow the forecast gives up).
 */
export interface LateEnd {
  kind: "extended" | "forecast" | "beyond";
  /** The end date as it stands (what "Keep" keeps). */
  end: LocalDate;
  moveTo: LocalDate | null;
  signature: string;
  /** Weeks past `end`, 0 for "beyond". */
  weeks: number;
}

/** null when the plan is not late (or is finished, stopped, stuck, short of room or without progress: those have their own lines). */
export function lateEnd(p: ChildPlan, calendar: FamilyCalendar): LateEnd | null {
  if (p.complete || p.endedAs || p.noCapacity || p.unplacedUnits > EPS || noRecentProgress(p, calendar)) return null;
  // S7b-18: a keepEndDate adjustment left no free day from today, so the plan itself runs past its end: say so, and offer the move.
  if (p.warnings.includes("keep-end-extended") && p.end > p.plannedEnd) {
    return { kind: "extended", end: p.plannedEnd, moveTo: p.end, signature: `extended-${p.end}`, weeks: weeksLate(p.plannedEnd, p.end) };
  }
  const forecast = forecastOutcome(p, appliedCheckIns(p), calendar);
  // S7-10: a pace so slow the forecast gives up (past its limit) is the same plain line as a very late one.
  if (forecast && "beyondLimit" in forecast) return { kind: "beyond", end: p.end, moveTo: null, signature: "beyond", weeks: 0 };
  if (forecast && forecast.finish > p.end) return { kind: "forecast", end: p.end, moveTo: forecast.finish, signature: forecast.finish, weeks: weeksLate(p.end, forecast.finish) };
  return null;
}

/** The end date the late line offers for this plan, or null (not late, or nothing to offer). */
export const suggestedEnd = (p: ChildPlan, calendar: FamilyCalendar): LocalDate | null => lateEnd(p, calendar)?.moveTo ?? null;

/** Children with at least one line; a child with nothing to flag is left out. */
export function buildBriefing(input: BriefingInput): ChildBriefing[] {
  const { plans, weekStart, calendar, titleOf } = input;
  const out: ChildBriefing[] = [];
  for (const child of input.children) {
    const mine = plans.filter((p) => p.childId === child.id);
    const late: BriefingLine[] = [];
    const problems: BriefingLine[] = [];
    for (const p of mine) {
      // S12-04: finished is done, stopped is dropped: neither is late, stuck or short of room.
      if (p.complete || p.endedAs) continue;
      const title = titleOf(p.assignmentId);
      if (p.noCapacity) {
        problems.push({ key: `nocap-${p.assignmentId}`, text: `${title} has no school days left.` });
        continue;
      }
      if (p.unplacedUnits > EPS) {
        problems.push({ key: `unplaced-${p.assignmentId}`, text: `${title} has work that doesn't fit before ${shortDate(p.end)}.` });
        continue;
      }
      if (noRecentProgress(p, calendar)) {
        late.push({ key: `noprogress-${p.assignmentId}`, text: `No progress on ${title} in the last ${new Set(p.checkInWeeks).size} weeks.` });
        continue;
      }
      const finish = lateEnd(p, calendar);
      if (!finish) continue;
      const action: LateAction = { assignmentId: p.assignmentId, childId: p.childId, end: finish.end, moveTo: finish.moveTo, signature: finish.signature };
      const wontFinish = `${title} won't finish this school year at this pace.`;
      if (finish.kind === "extended") {
        const n = finish.weeks;
        late.push({ key: `late-${p.assignmentId}`, text: `${title} will finish about ${n} ${n === 1 ? "week" : "weeks"} late.`, action });
      } else if (finish.kind === "beyond") {
        late.push({ key: `late-${p.assignmentId}`, text: wontFinish, action });
      } else {
        const n = finish.weeks;
        const text = n > VERY_LATE_WEEKS ? wontFinish : `${title} will finish about ${n} ${n === 1 ? "week" : "weeks"} late at this pace.`;
        late.push({ key: `late-${p.assignmentId}`, text, action });
      }
    }
    const heavy: BriefingLine[] = [];
    const week = heavyWeek(mine as ChildPlan[], weekStart, calendar);
    if (week.load > EPS && week.ratio >= HEAVY_WEEK_RATIO) heavy.push({ key: "heavy", text: `This is a heavy week for ${child.name}.` });
    const lines = [...late, ...problems, ...heavy];
    if (lines.length > 0) out.push({ childId: child.id, childName: child.name, lines });
  }
  return out;
}

/** S9b-03: the number of assignments with a "will finish late" line, for any child (one assignment late for two children is one). */
export function lateAssignments(groups: readonly ChildBriefing[]): number {
  const ids = new Set<string>();
  for (const g of groups) for (const l of g.lines) if (l.key.startsWith("late-")) ids.add(l.key.slice("late-".length));
  return ids.size;
}

/** S9-05: lower is more important. Late and stalled work first, then plan problems, then a heavy week. */
export function lineRank(l: BriefingLine): number {
  return l.key.startsWith("late-") || l.key.startsWith("noprogress-") ? 0 : l.key === "heavy" ? 2 : 1;
}

/**
 * S9-05: the single most important line across the family (for Home), or null when nothing needs the parent. Ties go to the
 * earlier child and the earlier line.
 */
export function topBriefingLine(groups: readonly ChildBriefing[]): BriefingLine | null {
  let best: BriefingLine | null = null;
  for (const g of groups) for (const l of g.lines) if (best === null || lineRank(l) < lineRank(best)) best = l;
  return best;
}
