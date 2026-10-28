/**
 * Actual-progress check-ins (S2b-20). A check-in says "at the end of this week we were really at N".
 * Each one re-anchors the plan on the day after its week: the week's own bars are scaled to what happened
 * (D9), and what is left is replanned from there with the parent's mode (placement.ts, reused).
 *
 * S2b-38 (D24): the latest check-in is authoritative for everything after it. A check-in's replan reads
 * only its own position and mode plus the plan *without* check-ins (segment 0's end and pace), never what
 * an earlier check-in did, so editing an earlier week can't move a bar after a later check-in.
 */
import { fromDayNumber, toDayNumber, weekStartOfDayNumber } from "./dates";
import { EPS, MAX_PUSH_DAYS, placeSegment, type CapacityOf, type Placement, type PreparedOverride, type Warn } from "./placement";
import type { Assignment, ChildPlan, FamilyCalendar, LocalDate, OverrideMode, ProgressCheckIn } from "./types";

interface PreparedCheckIn {
  w0: number;
  position: number;
  mode: OverrideMode | null;
}

/** This child's check-ins, one per week (the later entry wins), oldest week first. */
function prepareCheckIns(a: Assignment, childId: string, checkIns: ProgressCheckIn[] | undefined, calendar: FamilyCalendar, warn: Warn): PreparedCheckIn[] {
  const byWeek = new Map<number, PreparedCheckIn>();
  for (const ci of checkIns ?? []) {
    if (ci.assignmentId !== a.id || ci.childId !== childId) continue;
    const d = toDayNumber(ci.weekStart);
    const w0 = weekStartOfDayNumber(d, calendar.weekStart);
    if (w0 !== d) warn("checkin-misaligned");
    if (byWeek.has(w0)) warn("checkin-duplicate-week");
    byWeek.set(w0, { w0, position: ci.position, mode: ci.mode ?? null });
  }
  return [...byWeek.values()].sort((x, y) => x.w0 - y.w0);
}

const sumPlanned = (planned: Map<number, number>, from: number, to: number): number => {
  let s = 0;
  for (const [d, v] of planned) if (d >= from && d <= to) s += v;
  return s;
};

/** Multiply every planned day in [from, to] by `factor`. */
function scale(planned: Map<number, number>, from: number, to: number, factor: number): void {
  for (const [d, v] of planned) if (d >= from && d <= to) planned.set(d, v * factor);
}

export interface CheckInArgs {
  a: Assignment;
  childId: string;
  calendar: FamilyCalendar;
  checkIns: ProgressCheckIn[] | undefined;
  /** Start and planned end as day numbers. */
  S: number;
  E: number;
  overrides: PreparedOverride[];
  c: CapacityOf;
  warn: Warn;
}

export interface CheckInResult {
  checkInWeeks: LocalDate[];
  /** Position at the last check-in (0 without one). */
  done: number;
  finishedEarly: boolean;
}

/** Apply the check-ins to segment 0 in place. */
export function applyCheckIns(p: Placement, { a, childId, calendar, checkIns, S, E, overrides, c, warn }: CheckInArgs): CheckInResult {
  const total = a.totalUnits;
  // Segment 0 as planned before any check-in: the end keepEndDate keeps and the pace pushEndDate keeps.
  const original = { end: p.endDay, pace: p.baseRate };
  const weeks: LocalDate[] = [];
  let lastAnchor = S;
  let lastDone = 0;
  let finishedEarly = false;

  for (const ci of prepareCheckIns(a, childId, checkIns, calendar, warn)) {
    const w0 = ci.w0;
    const w1 = w0 + 6;
    const anchor = w0 + 7;
    if (w1 < S || w0 > Math.max(E, p.endDay)) {
      warn("checkin-outside-range");
      continue;
    }
    let pos = Number.isFinite(ci.position) ? ci.position : 0;
    if (!Number.isFinite(ci.position) || pos < 0 || pos > total) {
      warn("checkin-clamped");
      pos = Math.min(total, Math.max(0, pos));
    }
    if (pos < lastDone - EPS) {
      // An earlier check-in already reported more; positions can't go backwards.
      warn("checkin-before-previous");
      pos = lastDone;
    }
    weeks.push(fromDayNumber(w0));

    const before = sumPlanned(p.planned, S, w0 - 1);
    const week = sumPlanned(p.planned, w0, w1);
    if (Math.abs(pos - (before + week)) <= EPS) {
      // On plan: nothing to scale or replan, whatever the mode.
      lastAnchor = anchor;
      lastDone = pos;
      continue;
    }

    // D9: past bars show what really happened.
    if (pos >= before - EPS) {
      const target = Math.max(0, pos - before);
      if (week > EPS) scale(p.planned, w0, w1, target / week);
      else if (target > EPS) {
        // The week's last capacity day, or its last day when it had none (the parent says work happened anyway).
        let day = w1;
        for (let d = w1; d >= Math.max(w0, S); d -= 1) if (c(d) > EPS) { day = d; break; }
        p.planned.set(day, (p.planned.get(day) ?? 0) + target);
        if (!p.kinds.has(day)) p.kinds.set(day, "planned");
        warn("unplanned-progress");
      }
    } else {
      // Behind even before this week: the assumed days since the last anchor didn't all happen either.
      const span = sumPlanned(p.planned, lastAnchor, w1);
      if (span > EPS) scale(p.planned, lastAnchor, w1, (pos - lastDone) / span);
    }

    // Replan the rest from the anchor.
    for (const d of [...p.planned.keys()]) if (d >= anchor) { p.planned.delete(d); p.kinds.delete(d); }
    const remaining = Math.max(0, total - pos);
    lastAnchor = anchor;
    lastDone = pos;
    if (remaining <= EPS) {
      finishedEarly = anchor <= E;
      let last = -Infinity;
      for (const [d, v] of p.planned) if (v > EPS) last = Math.max(last, d);
      Object.assign(p, { baseRate: 0, rate: 0, unplaced: 0, noCapacity: false, endDay: Number.isFinite(last) ? last : anchor - 1, mode: ci.mode ?? p.mode });
      continue;
    }
    finishedEarly = false;
    // keepEndDate keeps the original end. Once that end has passed (an earlier push carried the work past
    // it), there is no end left to keep, so the rest goes at the original pace instead.
    const endPassed = original.end < anchor;
    const mode = endPassed ? "pushEndDate" : (ci.mode ?? "keepEndDate");
    const seg = placeSegment({
      from: anchor,
      end: endPassed ? E + MAX_PUSH_DAYS : original.end,
      pushLimit: E + MAX_PUSH_DAYS,
      remaining,
      overrides,
      forcedMode: mode,
      pace: original.pace,
      first: false,
    }, c, warn);
    for (const [d, v] of seg.planned) p.planned.set(d, v);
    for (const [d, k] of seg.kinds) p.kinds.set(d, k);
    Object.assign(p, { baseRate: seg.baseRate, rate: seg.rate, endDay: seg.endDay, unplaced: seg.unplaced, noCapacity: seg.noCapacity, mode: seg.mode });
  }
  return { checkInWeeks: weeks, done: lastDone, finishedEarly };
}

/**
 * The planned position range for one week, for the check-in card (S2b-23): cumulative units done
 * before the week (`from`) and at its end (`to`). The card shows e.g. "pp. 1–80" for 0..80.
 */
export function plannedRangeForWeek(plan: ChildPlan, weekStart: LocalDate): { from: number; to: number; hasPlannedWork: boolean } {
  const w0 = toDayNumber(weekStart);
  let from = 0;
  let week = 0;
  for (const d of plan.days) {
    const n = toDayNumber(d.date);
    if (n < w0) from += d.units;
    else if (n <= w0 + 6) week += d.units;
  }
  return { from, to: from + week, hasPlannedWork: week > EPS };
}
