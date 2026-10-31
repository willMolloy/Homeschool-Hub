/** S4-08: forecastFinish and heavyWeek. */
import { describe, expect, it } from "vitest";
import { addDays, forecastFinish, heavyWeek, HEAVY_WEEK_RATIO, planChild, type ChildPlan, type PlanContext, type ProgressCheckIn } from "../src";
import { book, MON_FRI } from "./helpers";

// 200 pages, Mon 7 Sep to Fri 30 Oct: 40 school days, 5 a day, 25 a week.
const a = book({ totalUnits: 200, end: "2026-10-30" });
const ci = (weekStart: string, position: number): ProgressCheckIn => ({ assignmentId: "a1", childId: "frank", weekStart, position, mode: "keepEndDate" });
const run = (checkIns: ProgressCheckIn[], asg = a, ctx: Partial<PlanContext> = {}): { plan: ChildPlan; checkIns: ProgressCheckIn[] } =>
  ({ plan: planChild(asg, "frank", { calendar: MON_FRI, checkIns, ...ctx }), checkIns });
const forecast = (x: { plan: ChildPlan; checkIns: ProgressCheckIn[] }) => forecastFinish(x.plan, x.checkIns, MON_FRI);

describe("forecastFinish (S4-08)", () => {
  it("no check-ins, or one, gives null", () => {
    expect(forecast(run([]))).toBeNull();
    expect(forecast(run([ci("2026-09-07", 10)]))).toBeNull();
  });

  it("on pace gives null", () => {
    expect(forecast(run([ci("2026-09-07", 25), ci("2026-09-14", 50)]))).toBeNull();
  });

  it("ahead of pace gives null", () => {
    expect(forecast(run([ci("2026-09-07", 40), ci("2026-09-14", 80)]))).toBeNull();
  });

  it("behind over 2 weeks gives a date after the planned end, at the observed pace", () => {
    // 30 pages in 10 school days = 3 a day; 170 left from Mon Sep 21 is 56.67 days: the 57th school day.
    const r = run([ci("2026-09-07", 15), ci("2026-09-14", 30)]);
    expect(forecast(r)).toBe("2026-12-08");
    expect(forecast(r)! > r.plan.plannedEnd).toBe(true);
  });

  it("the same check-ins in another order, or an extra one for another child, give the same date", () => {
    const x = run([ci("2026-09-14", 30), ci("2026-09-07", 15)]);
    expect(forecast(x)).toBe("2026-12-08");
    expect(forecastFinish(x.plan, [...x.checkIns, { ...ci("2026-09-21", 1), childId: "margaret" }], MON_FRI)).toBe("2026-12-08");
  });

  it("zero progress over 2 weeks gives null and does not crash", () => {
    const r = run([ci("2026-09-07", 0), ci("2026-09-14", 0)]);
    expect(forecast(r)).toBeNull();
  });

  it("a finished assignment gives null", () => {
    expect(forecast(run([ci("2026-09-07", 100), ci("2026-09-14", 200)]))).toBeNull();
  });

  it("is placed on the assignment's own days", () => {
    // Fridays only: 8 Fridays, 25 a Friday. 10 and 20 after two weeks is 10 a Friday, 180 left = 18 more Fridays.
    const fri = book({ totalUnits: 200, end: "2026-10-30", weekdays: [5] });
    const r = run([ci("2026-09-07", 10), ci("2026-09-14", 20)], fri);
    const when = forecast(r)!;
    expect(new Date(`${when}T00:00:00Z`).getUTCDay()).toBe(5);
    expect(when).toBe("2027-01-22");
  });

  it("is never NaN or Infinity, even for odd plans", () => {
    const empty = run([ci("2026-09-07", 1), ci("2026-09-14", 2)], book({ totalUnits: 200, end: "2026-10-30", weekdays: [0, 6] }));
    expect(forecast(empty)).toBeNull();
    expect(forecastFinish(empty.plan, undefined, MON_FRI)).toBeNull();
  });
});

describe("heavyWeek (S4-08)", () => {
  // Four assignments' worth of weeks with the same load, so a week at 2x the average is easy to build.
  const plans = (loads: number[]): ChildPlan[] =>
    loads.map((l, i) => planChild(book({ id: `w${i}`, totalUnits: l, start: addDays("2026-09-07", 7 * i), end: addDays("2026-09-11", 7 * i) }), "frank", { calendar: MON_FRI }));

  it("a week at 2x the average has ratio 2 and counts as heavy", () => {
    const r = heavyWeek(plans([10, 10, 10, 30]), "2026-09-28", MON_FRI);
    expect(r.load).toBeCloseTo(30, 9);
    expect(r.average).toBeCloseTo(15, 9);
    expect(r.ratio).toBeCloseTo(2, 9);
    expect(r.ratio >= HEAVY_WEEK_RATIO).toBe(true);
  });

  it("a usual week is not heavy; a mid-week date finds its week", () => {
    const r = heavyWeek(plans([10, 10, 10, 30]), "2026-09-09", MON_FRI);
    expect(r.load).toBeCloseTo(10, 9);
    expect(r.ratio).toBeCloseTo(10 / 15, 9);
    expect(HEAVY_WEEK_RATIO).toBe(1.5);
  });

  it("weeks with no work don't count toward the average", () => {
    const r = heavyWeek(plans([10, 10]), "2026-11-02", MON_FRI);
    expect(r).toEqual({ load: 0, average: 10, ratio: 0 });
  });

  it("a child with no work: zeros, no division by zero", () => {
    expect(heavyWeek([], "2026-09-07", MON_FRI)).toEqual({ load: 0, average: 0, ratio: 0 });
    const idle = planChild(book({ totalUnits: 0 }), "frank", { calendar: MON_FRI });
    expect(heavyWeek([idle], "2026-09-07", MON_FRI)).toEqual({ load: 0, average: 0, ratio: 0 });
  });

  it("sums every assignment in the week, using the family's week start", () => {
    const two = [...plans([10]), planChild(book({ id: "x", totalUnits: 5, start: "2026-09-07", end: "2026-09-11" }), "frank", { calendar: MON_FRI })];
    expect(heavyWeek(two, "2026-09-07", MON_FRI).load).toBeCloseTo(15, 9);
    expect(heavyWeek(two, "2026-09-06", { weekStart: "sun", schoolDays: [1, 2, 3, 4, 5] }).load).toBeCloseTo(15, 9);
  });
});
