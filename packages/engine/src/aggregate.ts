import { fromDayNumber, toDayNumber, weekStartOfDayNumber } from "./dates";
import type { ChildPlan, DayLoad, Detail, DetailChoice, DisplayDay, LocalDate, WeekStart, WeekSummary } from "./types";

/** px per day at or above which Auto switches from weekly to daily detail (prototype value). */
export const DAILY_ZOOM_THRESHOLD_PX = 8;

/** A lane is one child x one subject; its series merges every assignment in it. */
export interface LaneDay {
  date: LocalDate;
  /** Day counts toward a weekly average when any assignment in the lane has capacity, or work was logged. */
  counts: boolean;
  schoolDay: boolean;
  minutes: number;
}

function toLaneDays(days: DayLoad[]): LaneDay[] {
  return days.map((d) => ({ date: d.date, counts: d.capacity > 0 || d.units > 0, schoolDay: d.schoolDay, minutes: d.minutes }));
}

/**
 * Merge several plans (or day series) into one lane series. Overlapping assignments sum.
 * The weekly denominator is the lane's own capacity days, so two books that hand off mid-week
 * (one ends Wed, the next starts Thu) average over 5 days, not 3 + 2.
 */
export function mergeLane(series: Array<ChildPlan | DayLoad[] | LaneDay[]>): LaneDay[] {
  const map = new Map<number, LaneDay>();
  for (const s of series) {
    const raw = Array.isArray(s) ? s : s.days;
    const days: LaneDay[] = raw.length && "capacity" in (raw[0] as object) ? toLaneDays(raw as DayLoad[]) : (raw as LaneDay[]);
    for (const d of days) {
      const n = toDayNumber(d.date);
      const cur = map.get(n);
      if (!cur) map.set(n, { ...d });
      else {
        cur.minutes += d.minutes;
        cur.counts = cur.counts || d.counts;
        cur.schoolDay = cur.schoolDay || d.schoolDay;
      }
    }
  }
  return [...map.entries()].sort((x, y) => x[0] - y[0]).map(([, v]) => v);
}

function asLane(days: DayLoad[] | LaneDay[]): LaneDay[] {
  if (days.length === 0) return [];
  return "capacity" in (days[0] as object) ? toLaneDays(days as DayLoad[]) : (days as LaneDay[]);
}

/** Per-week totals and averages. A week's average = its minutes / its capacity days (not / 5). */
export function weeklySummary(days: DayLoad[] | LaneDay[], weekStart: WeekStart): WeekSummary[] {
  const weeks = new Map<number, { total: number; n: number }>();
  for (const d of asLane(days)) {
    const w = weekStartOfDayNumber(toDayNumber(d.date), weekStart);
    const e = weeks.get(w) ?? { total: 0, n: 0 };
    e.total += d.minutes;
    if (d.counts) e.n += 1;
    weeks.set(w, e);
  }
  return [...weeks.entries()]
    .sort((x, y) => x[0] - y[0])
    .map(([w, e]) => ({ weekStart: fromDayNumber(w), totalMinutes: e.total, capacityDays: e.n, average: e.n > 0 ? e.total / e.n : 0 }));
}

/**
 * The one aggregation function behind semantic zoom.
 * - daily: each day's minutes as-is.
 * - weekly: the week's average drawn flat across that week's school days (and any counted day),
 *   0 elsewhere. Invariant: average x capacityDays = the week's total minutes.
 */
export function aggregate(days: DayLoad[] | LaneDay[], detail: Detail, weekStart: WeekStart): DisplayDay[] {
  const lane = asLane(days);
  if (detail === "daily") return lane.map((d) => ({ date: d.date, value: d.minutes }));
  const avg = new Map<string, number>(weeklySummary(lane, weekStart).map((w) => [w.weekStart, w.average]));
  return lane.map((d) => {
    const w = fromDayNumber(weekStartOfDayNumber(toDayNumber(d.date), weekStart));
    return { date: d.date, value: d.schoolDay || d.counts ? avg.get(w) ?? 0 : 0 };
  });
}

/** Auto picks daily once a day column is at least `threshold` px wide. */
export function detailForZoom(pxPerDay: number, choice: DetailChoice = "auto", threshold = DAILY_ZOOM_THRESHOLD_PX): Detail {
  if (choice !== "auto") return choice;
  return Number.isFinite(pxPerDay) && pxPerDay >= threshold ? "daily" : "weekly";
}

/** Sum display series by date (the total-load strip: sum of the lanes' values). */
export function sumByDate(series: DisplayDay[][]): DisplayDay[] {
  const map = new Map<number, number>();
  for (const s of series) for (const d of s) {
    const n = toDayNumber(d.date);
    map.set(n, (map.get(n) ?? 0) + d.value);
  }
  return [...map.entries()].sort((x, y) => x[0] - y[0]).map(([n, v]) => ({ date: fromDayNumber(n), value: v }));
}
