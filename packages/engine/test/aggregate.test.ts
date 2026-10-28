import { describe, expect, it } from "vitest";
import {
  aggregate, DAILY_ZOOM_THRESHOLD_PX, detailForZoom, mergeLane, planChild, sumByDate, weeklySummary,
  type ChildPlan, type RecurringEvent,
} from "../src";
import { book, MON_FRI } from "./helpers";

const coop: RecurringEvent = { id: "coop", childIds: ["frank"], weekdays: [2], capacityFraction: 0.5, subjectRules: { lit: "skip" } };
const val = (xs: { date: string; value: number }[], date: string) => xs.find((x) => x.date === date)?.value ?? Number.NaN;

function weeklyInvariant(p: ChildPlan, weekStart: "mon" | "sun") {
  for (const w of weeklySummary(p.days, weekStart)) {
    expect(w.average * w.capacityDays).toBeCloseTo(w.totalMinutes, 9);
    if (w.capacityDays === 0) expect(w.average).toBe(0);
  }
}

describe("semantic zoom aggregation", () => {
  it("daily detail is the engine's daily minutes, unchanged", () => {
    const p = planChild(book(), "frank", { calendar: MON_FRI, events: [coop] });
    const daily = aggregate(p.days, "daily", "mon");
    expect(daily.map((d) => d.value)).toEqual(p.days.map((d) => d.minutes));
  });

  it("weekly: average x capacity days = the week's total (invariant)", () => {
    const p = planChild(book({ end: "2026-10-30" }), "frank", { calendar: MON_FRI, events: [coop], blocked: [{ id: "v", start: "2026-10-07", end: "2026-10-09" }] });
    weeklyInvariant(p, "mon");
    weeklyInvariant(p, "sun");
  });

  it("weekly: a co-op skip week is not diluted (divides by 4, not 5)", () => {
    const p = planChild(book(), "frank", { calendar: MON_FRI, events: [coop] });
    // 100 pages / 8 capacity days = 12.5 pages = 25 min per working day
    const w = aggregate(p.days, "weekly", "mon");
    expect(val(w, "2026-09-07")).toBeCloseTo(25);
    expect(val(w, "2026-09-08")).toBeCloseTo(25); // drawn flat, even on the skipped Tuesday (no notch)
    expect(val(w, "2026-09-12")).toBe(0); // weekend
  });

  it("weekly: flat across the week's school days", () => {
    const ev: RecurringEvent = { id: "e", childIds: ["frank"], weekdays: [3], capacityFraction: 0.5, subjectRules: { lit: "lighter" } };
    const p = planChild(book(), "frank", { calendar: MON_FRI, events: [ev] });
    const w = aggregate(p.days, "weekly", "mon").filter((d) => d.date >= "2026-09-07" && d.date <= "2026-09-11");
    for (const d of w) expect(d.value).toBeCloseTo(w[0]!.value);
  });

  it("weekly: a partial vacation week averages over the days that remain; vacation days draw 0", () => {
    const p = planChild(book(), "frank", { calendar: MON_FRI, blocked: [{ id: "v", start: "2026-09-10", end: "2026-09-11" }] });
    const w = aggregate(p.days, "weekly", "mon");
    expect(val(w, "2026-09-07")).toBeCloseTo(p.days[0]!.minutes);
    expect(val(w, "2026-09-10")).toBe(0);
  });

  it("weekly with an all-zero-capacity week returns 0, never NaN", () => {
    const p = planChild(book({ start: "2026-12-22", end: "2026-12-31" }), "frank", { calendar: MON_FRI, blocked: [{ id: "x", start: "2026-12-21", end: "2027-01-01" }] });
    for (const d of aggregate(p.days, "weekly", "mon")) expect(d.value).toBe(0);
    for (const w of weeklySummary(p.days, "mon")) expect(w.average).toBe(0);
  });

  it("weekStart Mon vs Sun groups a Saturday-school week differently", () => {
    const cal = { weekStart: "mon" as const, schoolDays: [1, 2, 3, 4, 5, 6] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[] };
    const p = planChild(book({ totalUnits: 120, start: "2026-09-12", end: "2026-09-26" }), "frank", { calendar: cal });
    const mon = weeklySummary(p.days, "mon").map((w) => w.weekStart);
    const sun = weeklySummary(p.days, "sun").map((w) => w.weekStart);
    expect(mon).toEqual(["2026-09-07", "2026-09-14", "2026-09-21"]);
    expect(sun).toEqual(["2026-09-06", "2026-09-13", "2026-09-20"]);
    // The assignment starts Sat Sep 12, alone in its first week either way.
    expect(weeklySummary(p.days, "mon")[0]!.capacityDays).toBe(1);
    expect(weeklySummary(p.days, "sun")[0]!.capacityDays).toBe(1);
    // Mon weeks: Sep 14-19 = 6 school days; Sun weeks: Sep 13-19 = 6 too, but the last Sun week (Sep 20-26) holds Sat 26.
    expect(weeklySummary(p.days, "mon")[2]!.capacityDays).toBe(6);
    expect(weeklySummary(p.days, "sun")[2]!.capacityDays).toBe(6);
    expect(weeklySummary(p.days, "mon").at(-1)!.weekStart).toBe("2026-09-21");
  });

  it("logged work on a non-school day counts in its week (no divide-by-zero)", () => {
    const p = planChild(book(), "frank", { calendar: MON_FRI, asOf: "2026-09-14", progress: [{ assignmentId: "a1", childId: "frank", date: "2026-09-12", units: 10 }] });
    const w = weeklySummary(p.days, "mon").find((x) => x.weekStart === "2026-09-07")!;
    // Mon-Fri still have capacity (nothing logged there), plus the Saturday that has logged work.
    expect(w.capacityDays).toBe(6);
    expect(w.totalMinutes).toBeCloseTo(20);
    expect(w.average).toBeCloseTo(20 / 6);
    expect(val(aggregate(p.days, "weekly", "mon"), "2026-09-12")).toBeCloseTo(20 / 6);
  });

  it("lane merge: a mid-week hand-off between two books averages over the lane's days", () => {
    // Book A Mon-Wed at 10 pages/day (20 min), Book B Thu-Fri at 10 pages/day (20 min)
    const a = planChild(book({ id: "A", totalUnits: 30, start: "2026-09-07", end: "2026-09-09" }), "frank", { calendar: MON_FRI });
    const b = planChild(book({ id: "B", totalUnits: 20, start: "2026-09-10", end: "2026-09-11" }), "frank", { calendar: MON_FRI });
    const lane = mergeLane([a, b]);
    const w = aggregate(lane, "weekly", "mon");
    expect(val(w, "2026-09-07")).toBeCloseTo(20); // a typical day in this lane is 20 min
    // Per-assignment series only cover their own dates, so summing them also gives 20 here.
    // proto-0.6 drew each assignment's average across the whole week and got 40; see proto-regressions.test.ts.
    const perAssignment = sumByDate([aggregate(a.days, "weekly", "mon"), aggregate(b.days, "weekly", "mon")]);
    expect(val(perAssignment, "2026-09-07")).toBeCloseTo(20);
    expect(val(perAssignment, "2026-09-10")).toBeCloseTo(20);
  });

  it("lane merge sums overlapping assignments and keeps the invariant", () => {
    const a = planChild(book({ id: "A" }), "frank", { calendar: MON_FRI, events: [coop] });
    const b = planChild(book({ id: "B", subjectId: "lit", totalUnits: 50 }), "frank", { calendar: MON_FRI });
    const lane = mergeLane([a, b]);
    for (const w of weeklySummary(lane, "mon")) expect(w.average * w.capacityDays).toBeCloseTo(w.totalMinutes, 9);
    expect(lane.find((d) => d.date === "2026-09-07")!.minutes).toBeCloseTo(a.days[0]!.minutes + b.days[0]!.minutes);
  });

  it("total strip = sum of the lanes' values per date (each lane its own denominator)", () => {
    const lit = planChild(book({ id: "L" }), "frank", { calendar: MON_FRI, events: [coop] });
    const math = planChild(book({ id: "M", subjectId: "math", unitType: "lessons", totalUnits: 10 }), "frank", { calendar: MON_FRI, events: [coop] });
    const lanes = [aggregate(lit.days, "weekly", "mon"), aggregate(math.days, "weekly", "mon")];
    const strip = sumByDate(lanes);
    expect(val(strip, "2026-09-07")).toBeCloseTo(25 + 20); // lit 25 (÷4 days), math 20 (÷5 days)
  });

  it("detailForZoom: Auto switches to daily at >= 8 px per day; Daily/Weekly override", () => {
    expect(DAILY_ZOOM_THRESHOLD_PX).toBe(8);
    expect(detailForZoom(7.99)).toBe("weekly");
    expect(detailForZoom(8)).toBe("daily");
    expect(detailForZoom(2, "daily")).toBe("daily");
    expect(detailForZoom(50, "weekly")).toBe("weekly");
    expect(detailForZoom(Number.NaN)).toBe("weekly");
    expect(detailForZoom(5, "auto", 4)).toBe("daily");
  });

  it("empty inputs give empty outputs", () => {
    expect(aggregate([], "weekly", "mon")).toEqual([]);
    expect(weeklySummary([], "mon")).toEqual([]);
    expect(mergeLane([])).toEqual([]);
    expect(sumByDate([])).toEqual([]);
  });
});
