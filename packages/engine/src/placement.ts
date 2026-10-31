/**
 * Placing units on days (S2b-20 split this out of plan.ts so check-ins reuse it).
 * One call places one segment: `remaining` units from `from` on, with fixed override weeks first, then
 * keepEndDate (spread over the free capacity up to `end`) or pushEndDate (keep a pace, move the end).
 */
import { toDayNumber, weekStartOfDayNumber } from "./dates";
import type { Assignment, DayKind, FamilyCalendar, OverrideMode, PlanWarning, WeekOverride } from "./types";

/** Floating-point tolerance for "nothing left". */
export const EPS = 1e-9;
/** pushEndDate never extends more than this many days past the planned end. */
export const MAX_PUSH_DAYS = 730;

export type Warn = (w: PlanWarning) => void;
export type CapacityOf = (day: number) => number;

const finiteOr0 = (x: unknown): number => (typeof x === "number" && Number.isFinite(x) ? x : 0);

export interface PreparedOverride {
  w0: number; // first day of week
  w1: number; // last day of week
  plannedUnits: number;
  mode: OverrideMode;
}

/** This child's overrides, one per week (the later entry wins), in edit order. */
export function prepareOverrides(a: Assignment, childId: string, overrides: WeekOverride[] | undefined, calendar: FamilyCalendar, warn: Warn): PreparedOverride[] {
  const mine = (overrides ?? []).filter((o) => o.assignmentId === a.id && (o.childId == null || o.childId === childId));
  const byWeek = new Map<number, PreparedOverride>();
  for (const o of mine) {
    const d = toDayNumber(o.weekStart);
    const w0 = weekStartOfDayNumber(d, calendar.weekStart);
    if (w0 !== d) warn("override-misaligned");
    if (byWeek.has(w0)) warn("override-duplicate-week"); // later entry wins; it is the newer edit
    byWeek.delete(w0); // keep insertion order = edit order
    byWeek.set(w0, { w0, w1: w0 + 6, plannedUnits: Math.max(0, finiteOr0(o.plannedUnits)), mode: o.mode });
  }
  return [...byWeek.values()];
}

export interface SegmentInput {
  /** First day to place on. */
  from: number;
  /** Last day keepEndDate may use (the current end). */
  end: number;
  /** pushEndDate never places past this day. */
  pushLimit: number;
  remaining: number;
  overrides: PreparedOverride[];
  /** Check-in segments force their mode; the first segment takes the latest applied override's. */
  forcedMode?: OverrideMode;
  /** pushEndDate pace (units per full day) carried over from the previous segment. */
  pace?: number;
  /** Only the first segment reports overrides that lie wholly before it. */
  first: boolean;
  /**
   * S7b-18: the first day an adjustment may still change (today). A keepEndDate adjustment in the last week, with nothing after
   * it to take the rest, pulls the rest back only into the days from here, never into earlier ones.
   */
  notBefore?: number;
}

export interface Placement {
  planned: Map<number, number>;
  kinds: Map<number, DayKind>;
  baseRate: number;
  rate: number;
  endDay: number;
  unplaced: number;
  noCapacity: boolean;
  mode: OverrideMode | null;
}

/**
 * S7b-09: the anchored keepEndDate placement (see placeSegment), or null when the units left after the last applied
 * override have no free day after it to go on (the caller then spreads them over the free days before it).
 */
function anchorKeep(seg: SegmentInput, c: CapacityOf, applied: Set<PreparedOverride>, baseRate: number):
  { planned: Map<number, number>; kinds: Map<number, DayKind>; rate: number } | null {
  const { from, end } = seg;
  const planned = new Map<number, number>();
  const kinds = new Map<number, DayKind>();
  const capBetween = (a: number, b: number) => {
    let s = 0;
    for (let d = a; d <= b; d += 1) s += c(d);
    return s;
  };
  let remaining = seg.remaining;
  let cursor = from;
  let rate = baseRate;
  const spread = (a: number, b: number) => {
    const cap = capBetween(a, end);
    rate = cap > EPS ? remaining / cap : 0;
    for (let d = a; d <= b; d += 1) {
      planned.set(d, rate * c(d));
      kinds.set(d, "planned");
      remaining -= rate * c(d);
    }
  };
  for (const o of [...applied].sort((x, y) => x.w0 - y.w0)) {
    const lo = Math.max(o.w0, from);
    const hi = Math.min(o.w1, end);
    if (lo > hi || lo < cursor) continue;
    if (lo > cursor) spread(cursor, lo - 1);
    const weekCap = capBetween(lo, hi);
    const units = Math.min(o.plannedUnits, Math.max(0, remaining));
    for (let d = lo; d <= hi; d += 1) {
      kinds.set(d, "override");
      planned.set(d, (units * c(d)) / weekCap);
    }
    remaining -= units;
    cursor = hi + 1;
  }
  if (cursor <= end && capBetween(cursor, end) > EPS) spread(cursor, end);
  else if (remaining > EPS) return null;
  return { planned, kinds, rate };
}

export function placeSegment(seg: SegmentInput, c: CapacityOf, warn: Warn): Placement {
  const out: Placement = {
    planned: new Map(), kinds: new Map(), baseRate: 0, rate: 0, endDay: seg.end, unplaced: 0, noCapacity: false, mode: seg.forcedMode ?? null,
  };
  if (seg.remaining <= EPS) return out;
  const { from, end } = seg;
  let baseCap = 0;
  for (let d = from; d <= end; d += 1) baseCap += c(d);
  const pace = seg.forcedMode === "pushEndDate" && seg.pace !== undefined && seg.pace > EPS ? seg.pace : null;

  if (baseCap <= EPS && pace === null) {
    // Nothing can be placed before the end date (fully inside a vacation, every day skipped, or already past the end).
    out.noCapacity = true;
    out.unplaced = seg.remaining;
    warn("no-capacity");
    for (const o of seg.overrides) if (o.w1 >= from) warn("override-no-capacity");
    return out;
  }
  out.baseRate = pace ?? seg.remaining / baseCap;

  // Fixed override weeks, chronological so earlier weeks claim units first.
  const fixed = new Set<number>();
  const applied = new Set<PreparedOverride>();
  let left = seg.remaining;
  for (const o of [...seg.overrides].sort((x, y) => x.w0 - y.w0)) {
    const lo = Math.max(o.w0, from);
    const hi = Math.min(o.w1, end);
    if (lo > hi) {
      if (seg.first || o.w1 >= from) warn("override-outside-range");
      continue;
    }
    let weekCap = 0;
    for (let d = lo; d <= hi; d += 1) weekCap += c(d);
    if (weekCap <= EPS) {
      warn("override-no-capacity");
      continue;
    }
    let units = o.plannedUnits;
    if (units > left) {
      warn("override-clamped");
      units = left;
    }
    for (let d = lo; d <= hi; d += 1) {
      fixed.add(d);
      out.kinds.set(d, "override");
      out.planned.set(d, (units * c(d)) / weekCap);
    }
    left -= units;
    applied.add(o);
  }
  // Mode = the most recent edit: the last applied override in input (edit) order, unless the segment forces one.
  if (seg.forcedMode === undefined) for (const o of seg.overrides) if (applied.has(o)) out.mode = o.mode;

  if (out.mode === "pushEndDate") {
    out.rate = out.baseRate;
    let last = -Infinity;
    for (const d of fixed) if ((out.planned.get(d) ?? 0) > EPS) last = Math.max(last, d);
    for (let d = from; d <= seg.pushLimit && left > EPS; d += 1) {
      if (fixed.has(d)) continue;
      const v = Math.min(out.rate * c(d), left);
      if (v > 0) {
        out.planned.set(d, v);
        out.kinds.set(d, "planned");
        left -= v;
        last = Math.max(last, d);
      }
    }
    if (left > EPS) {
      warn("push-horizon-exceeded");
      out.unplaced = left;
    }
    out.endDay = Number.isFinite(last) ? last : end;
  } else {
    // S7b-09: keepEndDate is anchored at each adjusted week. Days before the first adjusted week keep the plan as it
    // was without the adjustment; the week gets its units; what is left is spread over the days after it, up to the
    // end, and the next adjusted week anchors there in turn (adjustments apply in week order, on top of each other).
    // Nothing before an adjusted week changes. Only when nothing is left after the last adjusted week to take the rest
    // (an adjustment in the last week) is the rest pulled back into the free days before it, as before.
    const anchored = anchorKeep(seg, c, applied, out.baseRate);
    if (anchored) {
      for (const [d, v] of anchored.planned) out.planned.set(d, v);
      for (const [d, k] of anchored.kinds) out.kinds.set(d, k);
      out.rate = anchored.rate;
    } else {
      // S7b-18: nothing after the last adjusted week can take the rest. It goes into the free days from today (`notBefore`) up to
      // the end; the days before today keep the plan they had without the adjustment. With no free day from today, the end
      // moves later, at the old pace, just enough to hold the work (and "keep-end-extended" says so).
      const floor = Math.max(from, seg.notBefore ?? from);
      let freeFrom = 0;
      let freePast = 0;
      for (let d = from; d <= end; d += 1) {
        if (fixed.has(d)) continue;
        if (d >= floor) freeFrom += c(d);
        else freePast += c(d);
      }
      let rest = left;
      if (freePast > EPS) {
        for (let d = from; d < floor && d <= end; d += 1) {
          if (fixed.has(d)) continue;
          const v = Math.min(out.baseRate * c(d), Math.max(0, rest));
          out.planned.set(d, v);
          out.kinds.set(d, "planned");
          rest -= v;
        }
      }
      if (freeFrom > EPS) {
        out.rate = Math.max(0, rest) / freeFrom;
        for (let d = floor; d <= end; d += 1) {
          if (fixed.has(d)) continue;
          out.planned.set(d, out.rate * c(d));
          out.kinds.set(d, "planned");
        }
      } else if (freePast > EPS && rest > EPS && out.baseRate > EPS) {
        out.rate = out.baseRate;
        let last = end;
        for (let d = end + 1; d <= seg.pushLimit && rest > EPS; d += 1) {
          const v = Math.min(out.baseRate * c(d), rest);
          if (v > 0) {
            out.planned.set(d, v);
            out.kinds.set(d, "planned");
            rest -= v;
            last = d;
          }
        }
        warn("keep-end-extended");
        if (rest > EPS) {
          warn("push-horizon-exceeded");
          out.unplaced = rest;
        }
        out.endDay = last;
        return out;
      } else if (rest > EPS) {
        warn("keep-no-free-capacity");
        out.unplaced = rest;
      }
    }
    out.endDay = end;
  }
  return out;
}
