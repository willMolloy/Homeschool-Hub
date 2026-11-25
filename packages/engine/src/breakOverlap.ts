/**
 * S21-01: which open assignments a new or longer break covers, in plain words.
 * S21-03: how far "push the end back by the length of the break" moves that end.
 *
 * A day counts when it is one of the assignment's own school days, it falls inside the break, and
 * this save newly takes it off. A day already off (this break's current dates, or another break)
 * does not count again. Finished and stopped work is left off the list. A shared book is one row.
 */
import { isValidLocalDate, toDayNumber, weekdayOf, weekdayOfDayNumber, fromDayNumber } from "./dates";
import { weekdaysOf } from "./weekdays";
import type { LocalDate, Weekday } from "./types";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
/** How far a push may walk. Matches the longest assignment the API will store. */
const MAX_WALK_DAYS = 1096;

export interface BreakSpan {
  start: LocalDate;
  end: LocalDate;
  /** Empty means the whole family. */
  childIds: readonly string[];
}

export interface OverlapAssignment {
  id: string;
  title: string;
  start: LocalDate;
  end: LocalDate;
  childIds: readonly string[];
  /** null = the subject's days, then the family's school days. */
  weekdays: readonly number[] | null;
  subjectId: string;
  endedAs?: "finished" | "stopped" | null;
  archived?: boolean;
}

export interface BreakOverlap {
  /** Which proposed break this row sits under. */
  breakIndex: number;
  assignmentId: string;
  title: string;
  /** School days this break newly covers. */
  schoolDays: number;
  dates: LocalDate[];
  /** "covers 8 school days in February". */
  summary: string;
  /** The end date a push of this row alone would use. */
  pushedEnd: LocalDate;
  /** More than one child is on the book, so one end date is everyone's. */
  shared: boolean;
}

export interface ListBreakOverlapsInput {
  /** The breaks this save would write, in the order the sheet shows them. */
  breaks: readonly BreakSpan[];
  assignments: readonly OverlapAssignment[];
  /** Days already off, including a break being edited at its current dates. */
  existing: readonly BreakSpan[];
  schoolDays: readonly number[];
  subjectWeekdays?: readonly { subjectId: string; weekdays: readonly number[] | null }[];
}

export type RowChoice =
  | { kind: "keep" }
  | { kind: "push" }
  | { kind: "pick"; date: LocalDate };

const coversChild = (span: BreakSpan, childId: string) => span.childIds.length === 0 || span.childIds.includes(childId);

function monthName(date: LocalDate): string {
  return MONTHS[Number(date.slice(5, 7)) - 1] ?? "";
}

/** "covers 8 school days in February", or across the months those days actually use. */
export function overlapSummary(dates: readonly LocalDate[]): string {
  const n = dates.length;
  const unit = n === 1 ? "school day" : "school days";
  const months: string[] = [];
  for (const d of dates) {
    const name = monthName(d);
    if (name && !months.includes(name)) months.push(name);
  }
  const where = months.length <= 1
    ? `in ${months[0] ?? "that break"}`
    : months.length === 2
      ? `in ${months[0]} and ${months[1]}`
      : `in ${months.slice(0, -1).join(", ")}, and ${months[months.length - 1]}`;
  return `covers ${n} ${unit} ${where}`;
}

/** The label an undo bar uses. "February" becomes "February break"; "Christmas break" stays. */
export function breakUndoName(label: string | null | undefined, start: LocalDate): string {
  const t = label?.trim() ?? "";
  if (!t) return `${monthName(start) || "This"} break`;
  return /break/i.test(t) ? t : `${t} break`;
}

function assignmentDays(a: OverlapAssignment, input: ListBreakOverlapsInput): Weekday[] {
  const fromSubject = input.subjectWeekdays?.map((s) => ({ subjectId: s.subjectId, weekdays: (s.weekdays ?? []) as Weekday[] }));
  const resolved = weekdaysOf({ subjectId: a.subjectId, weekdays: a.weekdays as Weekday[] | null }, { subjectWeekdays: fromSubject });
  return resolved.weekdays ?? (input.schoolDays as Weekday[]);
}

function isOff(date: LocalDate, childId: string, blocks: readonly BreakSpan[]): boolean {
  return blocks.some((b) => date >= b.start && date <= b.end && coversChild(b, childId));
}

/** School days of `a` that `span` newly takes off, for at least one child on the book. */
function coveredDates(a: OverlapAssignment, span: BreakSpan, existing: readonly BreakSpan[], days: readonly number[]): LocalDate[] {
  if (!isValidLocalDate(a.start) || !isValidLocalDate(a.end) || !isValidLocalDate(span.start) || !isValidLocalDate(span.end)) return [];
  if (a.end < a.start || span.end < span.start) return [];
  const kids = a.childIds.filter((id) => coversChild(span, id));
  if (kids.length === 0 || days.length === 0) return [];
  const daySet = new Set(days);
  const from = a.start > span.start ? a.start : span.start;
  const to = a.end < span.end ? a.end : span.end;
  if (to < from) return [];
  const out: LocalDate[] = [];
  for (let n = toDayNumber(from); n <= toDayNumber(to); n += 1) {
    if (!daySet.has(weekdayOfDayNumber(n))) continue;
    const date = fromDayNumber(n);
    if (kids.some((id) => !isOff(date, id, existing))) out.push(date);
  }
  return out;
}

/** Breaks that take a day off for this book: the ones being saved, and the ones already stored. */
function skipsFor(a: OverlapAssignment, proposed: readonly BreakSpan[], existing: readonly BreakSpan[]): BreakSpan[] {
  return [...proposed, ...existing].filter((b) => a.childIds.some((id) => coversChild(b, id)));
}

/**
 * Walk `count` of this assignment's school days forward from `end`, skipping breaks.
 * The current end is not one of the days counted. The day we land on is a school day.
 */
export function pushEndBySchoolDays(end: LocalDate, count: number, weekdays: readonly number[], skip: readonly BreakSpan[]): LocalDate {
  if (!(count > 0) || !isValidLocalDate(end)) return end;
  const days = new Set(weekdays);
  let left = count;
  let n = toDayNumber(end);
  const limit = n + MAX_WALK_DAYS + count;
  while (left > 0 && n < limit) {
    n += 1;
    const date = fromDayNumber(n);
    if (!days.has(weekdayOfDayNumber(n))) continue;
    if (skip.some((b) => date >= b.start && date <= b.end)) continue;
    left -= 1;
  }
  return fromDayNumber(n);
}

export function listBreakOverlaps(input: ListBreakOverlapsInput): BreakOverlap[] {
  const rows: BreakOverlap[] = [];
  input.breaks.forEach((span, breakIndex) => {
    for (const a of input.assignments) {
      if (a.archived || a.endedAs === "finished" || a.endedAs === "stopped") continue;
      const days = assignmentDays(a, input);
      const dates = coveredDates(a, span, input.existing, days);
      if (dates.length === 0) continue;
      rows.push({
        breakIndex,
        assignmentId: a.id,
        title: a.title,
        schoolDays: dates.length,
        dates,
        summary: overlapSummary(dates),
        pushedEnd: pushEndBySchoolDays(a.end, dates.length, days, skipsFor(a, input.breaks, input.existing)),
        shared: a.childIds.length > 1,
      });
    }
  });
  return rows;
}

export interface ResolvedEnds {
  /** One new end per book that is not staying put. Empty when every row keeps its end. */
  ends: { assignmentId: string; endDate: LocalDate }[];
  /** Two rows of the same book named two different days. */
  conflict: string | null;
}

/**
 * The end dates a confirmed sheet should save. Keep sends nothing. Several "push" rows on one
 * book add their school days and walk once. A picked day is the end, and it is not pushed further.
 */
export function resolveEndDates(
  rows: readonly BreakOverlap[],
  choices: readonly (RowChoice | null)[],
  assignments: readonly OverlapAssignment[],
  proposed: readonly BreakSpan[],
  existing: readonly BreakSpan[],
  input: Pick<ListBreakOverlapsInput, "schoolDays" | "subjectWeekdays">,
): ResolvedEnds {
  const byId = new Map<string, { rows: BreakOverlap[]; choices: RowChoice[] }>();
  rows.forEach((row, i) => {
    const choice = choices[i];
    if (!choice || choice.kind === "keep") return;
    const bag = byId.get(row.assignmentId) ?? { rows: [], choices: [] };
    bag.rows.push(row);
    bag.choices.push(choice);
    byId.set(row.assignmentId, bag);
  });
  const ends: ResolvedEnds["ends"] = [];
  for (const [assignmentId, bag] of byId) {
    const a = assignments.find((x) => x.id === assignmentId);
    if (!a) continue;
    const picks = bag.choices.filter((c): c is Extract<RowChoice, { kind: "pick" }> => c.kind === "pick");
    if (picks.length > 0) {
      const dates = [...new Set(picks.map((p) => p.date))];
      if (dates.length > 1) return { ends: [], conflict: `Pick one end date for ${a.title}.` };
      ends.push({ assignmentId, endDate: dates[0]! });
      continue;
    }
    const count = bag.rows.reduce((s, r) => s + r.schoolDays, 0);
    const days = assignmentDays(a, { ...input, breaks: proposed, assignments, existing });
    ends.push({ assignmentId, endDate: pushEndBySchoolDays(a.end, count, days, skipsFor(a, proposed, existing)) });
  }
  return { ends, conflict: null };
}

export type PickProblem = "inside" | "before-start" | "not-school-day" | "day-off";

/**
 * Why a picked day cannot be the end, or null when it can.
 * It must be after the break, after the book's start, a family school day, and not already off.
 */
export function pickRefusal(date: LocalDate, opts: {
  breakEnd: LocalDate;
  assignmentStart: LocalDate;
  schoolDays: readonly number[];
  /** Days already off, including this break. A whole-family break has no child ids. */
  off?: readonly BreakSpan[];
  childIds?: readonly string[];
}): PickProblem | null {
  if (!isValidLocalDate(date)) return "inside";
  if (isValidLocalDate(opts.breakEnd) && date <= opts.breakEnd) return "inside";
  if (!isValidLocalDate(opts.assignmentStart) || date <= opts.assignmentStart) return "before-start";
  if (!opts.schoolDays.includes(weekdayOf(date))) return "not-school-day";
  const kids = opts.childIds ?? [];
  const blocked = (opts.off ?? []).some((b) => date >= b.start && date <= b.end && (b.childIds.length === 0 || b.childIds.some((id) => kids.includes(id))));
  if (blocked) return "day-off";
  return null;
}
