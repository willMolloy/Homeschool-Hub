/**
 * S4-09: the weekly briefing's lines, as pure functions of plans the API already made. Per child, in this order:
 * will finish late (or no recent progress), plan problems, a heavy week. The check-in nudge is one line for the family (see Briefing.tsx).
 */
import { EPS, forecastFinish, fromDayNumber, heavyWeek, HEAVY_WEEK_RATIO, toDayNumber, weekStartOfDayNumber, type ChildPlan, type FamilyCalendar, type LocalDate, type ProgressCheckIn } from "@hh/engine";
import { shortDate } from "../schedule/formBits";

export interface BriefingLine {
  key: string;
  text: string;
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

/** The check-ins the engine applied, one per week, rebuilt from the plan (`forecastFinish` only counts weeks). */
const appliedCheckIns = (p: ChildPlan): ProgressCheckIn[] =>
  p.checkInWeeks.map((weekStart) => ({ assignmentId: p.assignmentId, childId: p.childId, weekStart, position: 0, mode: null }));

/** S4b-03: a forecast more than this many weeks late is reported plainly, not as a week count. */
export const VERY_LATE_WEEKS = 26;

/**
 * S4b-03: at least 2 applied check-in weeks and no progress from the start of the first to the end of the last (the same
 * span `forecastFinish` measures, which gives no forecast for it).
 */
export function noRecentProgress(p: ChildPlan, calendar: FamilyCalendar): boolean {
  const weeks = p.checkInWeeks.map((w) => toDayNumber(fromDayNumber(weekStartOfDayNumber(toDayNumber(w), calendar.weekStart)))).sort((a, b) => a - b);
  if (new Set(weeks).size < 2 || p.remainingUnits <= EPS || p.days.length === 0) return false;
  const first = weeks[0]!;
  const last = weeks[weeks.length - 1]! + 6;
  let before = 0;
  let atEnd = 0;
  for (const d of p.days) {
    const n = toDayNumber(d.date);
    if (n < first) before = d.position;
    if (n <= last) atEnd = d.position;
  }
  return atEnd - before <= EPS;
}

export function weeksLate(end: LocalDate, forecast: LocalDate): number {
  return Math.max(1, Math.round((toDayNumber(forecast) - toDayNumber(end)) / 7));
}

/** Children with at least one line; a child with nothing to flag is left out. */
export function buildBriefing(input: BriefingInput): ChildBriefing[] {
  const { plans, weekStart, calendar, titleOf } = input;
  const out: ChildBriefing[] = [];
  for (const child of input.children) {
    const mine = plans.filter((p) => p.childId === child.id);
    const late: BriefingLine[] = [];
    const problems: BriefingLine[] = [];
    for (const p of mine) {
      if (p.complete) continue;
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
      const forecast = forecastFinish(p, appliedCheckIns(p), calendar);
      if (forecast && forecast > p.end) {
        const n = weeksLate(p.end, forecast);
        const text = n > VERY_LATE_WEEKS ? `${title} won't finish this school year at this pace.` : `${title} will finish about ${n} ${n === 1 ? "week" : "weeks"} late at this pace.`;
        late.push({ key: `late-${p.assignmentId}`, text });
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
