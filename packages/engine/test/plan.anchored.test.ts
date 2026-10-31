/** S7b-09: a keepEndDate week adjustment only re-spreads the weeks after it; every earlier week keeps its amounts. */
import { describe, expect, it } from "vitest";
import { planChild, type ChildPlan, type PlanContext, type ProgressCheckIn, type WeekOverride } from "../src";
import { book, expectConserved, expectSane, MON_FRI, sumUnits, unitsBetween, unitsOn } from "./helpers";

// 300 pages, Mon Sep 7 to Fri Oct 30 2026: 8 weeks of 5 days = 40 days, 7.5 a day, 37.5 a week.
const a = book({ totalUnits: 300, start: "2026-09-07", end: "2026-10-30" });
const W = (n: number) => ["", "2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"][n]!;
const ov = (week: number, plannedUnits: number, mode: WeekOverride["mode"] = "keepEndDate"): WeekOverride => ({ assignmentId: "a1", weekStart: W(week), plannedUnits, mode });
const ci = (week: number, position: number, mode: ProgressCheckIn["mode"] = "keepEndDate"): ProgressCheckIn => ({ assignmentId: "a1", childId: "frank", weekStart: W(week), position, mode });
const run = (ctx: Partial<PlanContext> = {}): ChildPlan => planChild(a, "frank", { calendar: MON_FRI, ...ctx });
const amounts = (p: ChildPlan, before: string) => p.days.filter((d) => d.date < before).map((d) => [d.date, d.units]);

describe("keepEndDate adjustments anchor at the adjusted week (S7b-09)", () => {
  it("the review's case: a coming-week adjustment leaves every earlier week exactly as it was", () => {
    // Today is in week 3 (asOf Sep 23); the parent lightens week 5 to 10 pages, keeping the end date.
    const none = run({ asOf: "2026-09-23" });
    const p = run({ asOf: "2026-09-23", overrides: [ov(5, 10)] });
    expect(amounts(p, W(5))).toEqual(amounts(none, W(5))); // weeks 1 to 4: identical, per day
    expect(unitsBetween(p, W(5), "2026-10-11")).toBeCloseTo(10);
    expect(p.end).toBe("2026-10-30");
    // The 27.5 not done in week 5 shows only in the weeks after it: 3 weeks, 15 days.
    const rest = 300 - 4 * 37.5 - 10;
    for (const d of p.days.filter((x) => x.date >= W(6) && x.capacity > 0)) expect(d.units).toBeCloseTo(rest / 15, 9);
    expect(p.rate).toBeCloseTo(rest / 15, 9);
    expectSane(p);
    expectConserved(p);
  });

  it("the current week can be adjusted too: the weeks before it are untouched", () => {
    const none = run();
    const p = run({ overrides: [ov(3, 60)] });
    expect(amounts(p, W(3))).toEqual(amounts(none, W(3)));
    expect(unitsBetween(p, W(3), "2026-09-27")).toBeCloseTo(60);
    expectConserved(p);
  });

  it("two adjustments apply in week order, on top of each other", () => {
    const p = run({ overrides: [ov(6, 20), ov(3, 50)] });
    const none = run();
    expect(amounts(p, W(3))).toEqual(amounts(none, W(3)));
    expect(unitsBetween(p, W(3), "2026-09-27")).toBeCloseTo(50);
    // After week 3 the rest (300 - 75 - 50 = 175) is spread over weeks 4 to 8, until week 6 takes 20.
    const r1 = 175 / 25;
    for (const d of p.days.filter((x) => x.date >= W(4) && x.date < W(6) && x.capacity > 0)) expect(d.units).toBeCloseTo(r1, 9);
    expect(unitsBetween(p, W(6), "2026-10-18")).toBeCloseTo(20);
    const r2 = (175 - 10 * r1 - 20) / 10;
    for (const d of p.days.filter((x) => x.date >= W(7) && x.capacity > 0)) expect(d.units).toBeCloseTo(r2, 9);
    expect(p.end).toBe("2026-10-30");
    expectConserved(p);
  });

  it("an adjustment after a check-in: the weeks between the check-in and the adjusted week keep their plan", () => {
    const checkIns = [ci(2, 60)]; // behind: 60 of the 75 planned by the end of week 2
    const without = run({ checkIns });
    const p = run({ checkIns, overrides: [ov(5, 10)] });
    expect(amounts(p, W(5))).toEqual(amounts(without, W(5)));
    expect(unitsBetween(p, W(5), "2026-10-11")).toBeCloseTo(10);
    expect(p.checkInWeeks).toEqual([W(2)]);
    expect(p.doneUnits).toBe(60);
    expectConserved(p);
  });

  it("an adjustment before a later check-in: the check-in still decides everything after it", () => {
    const checkIns = [ci(4, 140)];
    const p = run({ checkIns, overrides: [ov(2, 30)] });
    expect(p.doneUnits).toBe(140);
    // What is left (160) is spread from week 5 as the check-in says, whatever the adjustment did before.
    expect(unitsBetween(p, W(5), "2026-10-30")).toBeCloseTo(160);
    expect(p.end).toBe("2026-10-30");
    expectConserved(p);
  });

  it("an adjustment in the last week still pulls the rest into the weeks before it (nothing after it can take it)", () => {
    const p = run({ overrides: [ov(8, 10)] });
    expect(unitsBetween(p, W(8), "2026-11-01")).toBeCloseTo(10);
    expect(p.unplacedUnits).toBe(0);
    expectConserved(p);
  });

  it("pushEndDate is unchanged: the old pace everywhere, the end moves", () => {
    const p = run({ overrides: [ov(5, 10, "pushEndDate")] });
    expect(p.rate).toBeCloseTo(7.5);
    expect(unitsOn(p, W(1))).toBeCloseTo(7.5);
    expect(unitsOn(p, W(8))).toBeCloseTo(7.5);
    expect(p.end > "2026-10-30").toBe(true);
    expectConserved(p);
  });

  it("units are conserved over many random adjustments (not in the last week), and the days before the first adjusted week never change", () => {
    let seed = 7;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
    const none = run();
    for (let i = 0; i < 200; i++) {
      const overrides = Array.from({ length: 1 + Math.floor(rnd() * 3) }, () => ov(1 + Math.floor(rnd() * 7), Math.floor(rnd() * 120)));
      const first = [...overrides].map((o) => o.weekStart).sort()[0]!;
      const p = run({ overrides });
      expectSane(p);
      expect(sumUnits(p) + p.unplacedUnits).toBeCloseTo(300, 6);
      expect(amounts(p, first)).toEqual(amounts(none, first));
    }
  });
});
