/** S4-08: forecastFinish and heavyWeek. */
import { describe, expect, it } from "vitest";
import { addDays, forecastFinish, forecastOutcome, heavyWeek, noRecentProgress, HEAVY_WEEK_RATIO, planChild, type ChildPlan, type PlanContext, type ProgressCheckIn } from "../src";
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

  it("S7-10: forecastOutcome tells a pace too slow to finish (beyondLimit) from nothing to forecast (null)", () => {
    const slow = run([ci("2026-09-07", 0.1), ci("2026-09-14", 0.2)]);
    expect(forecastFinish(slow.plan, slow.checkIns, MON_FRI)).toBeNull();
    expect(forecastOutcome(slow.plan, slow.checkIns, MON_FRI)).toEqual({ beyondLimit: true });
    const late = run([ci("2026-09-07", 15), ci("2026-09-14", 30)]);
    expect(forecastOutcome(late.plan, late.checkIns, MON_FRI)).toEqual({ finish: "2026-12-08" });
    for (const none of [run([]), run([ci("2026-09-07", 25), ci("2026-09-14", 50)]), run([ci("2026-09-07", 0), ci("2026-09-14", 0)])]) {
      expect(forecastOutcome(none.plan, none.checkIns, MON_FRI)).toBeNull();
    }
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

describe("forecast and deliberate changes (S7b-04)", () => {
  const ov = (weekStart: string, plannedUnits: number) => ({ assignmentId: "a1", childId: "frank", weekStart, plannedUnits, mode: "keepEndDate" as const });
  // Three check-in weeks, a steady 3 a day (15 a week); the second week was deliberately lightened by the parent.
  const three = [ci("2026-09-07", 15), ci("2026-09-14", 20), ci("2026-09-21", 35)];

  it("a deliberately lightened week doesn't count as the child's pace", () => {
    const plain = run(three);
    const adjusted = run(three, a, { overrides: [ov("2026-09-14", 5)] });
    expect(adjusted.plan.adjustedWeeks).toEqual(["2026-09-14"]);
    expect(plain.plan.adjustedWeeks).toEqual([]);
    // Weeks 1 and 3 are 15 pages each: 3 a day, so the same date as the 15-a-week case; counting week 2 (5 pages) would be later.
    expect(forecast(adjusted)! < forecast(plain)!).toBe(true);
    // Only the unadjusted weeks are measured: with week 2 left out the pace is exactly 15 a week.
    const steady = run([ci("2026-09-07", 15), ci("2026-09-14", 22), ci("2026-09-21", 37)], a, { overrides: [ov("2026-09-14", 7)] });
    // 15 pages a week = 3 a day; 163 left from Mon Sep 28 is 54.33 school days: the 55th.
    const school = [...Array(400).keys()].map((i) => addDays("2026-09-28", i)).filter((d) => { const w = new Date(`${d}T00:00:00Z`).getUTCDay(); return w >= 1 && w <= 5; });
    expect(forecast(steady)).toBe(school[54]);
  });

  it("an adjustment that leaves fewer than 2 check-in weeks gives no forecast, and no 'no progress' claim", () => {
    const r = run([ci("2026-09-07", 15), ci("2026-09-14", 15)], a, { overrides: [ov("2026-09-14", 0)] });
    expect(forecast(r)).toBeNull();
    expect(noRecentProgress(r.plan, MON_FRI)).toBe(false);
    const stuck = run([ci("2026-09-07", 0), ci("2026-09-14", 0)]);
    expect(noRecentProgress(stuck.plan, MON_FRI)).toBe(true);
  });

  it("an adjustment for another assignment or child doesn't exclude the week", () => {
    const other = run(three, a, { overrides: [{ ...ov("2026-09-14", 5), assignmentId: "zz" }, { ...ov("2026-09-14", 5), childId: "margaret" }] });
    expect(forecast(other)).toBe(forecast(run(three)));
  });

  it("a weekday change on its own doesn't move the forecast", () => {
    // Behind at 3 a day for two weeks (Mon-Fri); then Math drops Friday from Mon Sep 28 with no new check-in.
    const checkIns = [ci("2026-09-07", 15), ci("2026-09-14", 30)];
    const same = run(checkIns);
    const changed = run(checkIns, book({ totalUnits: 200, end: "2026-10-30", weekdays: [1, 2, 3, 4], weekdaysFrom: "2026-09-28", previousWeekdays: null }));
    expect(changed.plan.weekdaysFrom).toBe("2026-09-28");
    // S7b-19: measured on the days before the change and projected on those same days, so the date is exactly the same.
    expect(forecast(changed)).toBe(forecast(same));
  });

  it("with 2 or more check-in weeks after the change the pace is measured on the new days", () => {
    // Mon-Fri to Mon-Thu from Sep 14; weeks 2 and 3 are after it: 8 a week = 2 a day on 4 days.
    const asg = book({ totalUnits: 200, end: "2026-10-30", weekdays: [1, 2, 3, 4], weekdaysFrom: "2026-09-14", previousWeekdays: null });
    const r = run([ci("2026-09-07", 15), ci("2026-09-14", 23), ci("2026-09-21", 31)], asg);
    const f = forecast(r)!;
    // 169 left from Sep 28 at 2 a day on Mon-Thu: 85 days, 21.25 weeks of 4 days: the 85th Mon-Thu day.
    const days = [...Array(400).keys()].map((i) => addDays("2026-09-28", i)).filter((d) => { const w = new Date(`${d}T00:00:00Z`).getUTCDay(); return w >= 1 && w <= 4; });
    expect(f).toBe(days[84]);
  });

  it("is still pure and never NaN with adjusted weeks everywhere", () => {
    const r = run(three, a, { overrides: [ov("2026-09-07", 1), ov("2026-09-14", 1), ov("2026-09-21", 1)] });
    expect(forecastOutcome(r.plan, r.checkIns, MON_FRI)).toBeNull();
  });
});

describe("a days change never hides or moves the late forecast (S7b-19)", () => {
  // 300 pages, Mon Sep 7 2026 to Fri Jan 29 2027, behind at 10 pages a week; check-ins through week 8 (Oct 26).
  const asg = book({ totalUnits: 300, start: "2026-09-07", end: "2027-01-29" });
  const weeks = ["2026-09-07", "2026-09-14", "2026-09-21", "2026-09-28", "2026-10-05", "2026-10-12", "2026-10-19", "2026-10-26"];
  const checkIns = (gains: number[]): ProgressCheckIn[] => {
    let pos = 0;
    return weeks.slice(0, gains.length).map((w, i) => ({ assignmentId: "a1", childId: "frank", weekStart: w, position: (pos += gains[i]!), mode: "keepEndDate" as const }));
  };
  const plan = (cis: ProgressCheckIn[], days: Partial<typeof asg> = {}, overrides: PlanContext["overrides"] = []) =>
    planChild({ ...asg, ...days }, "frank", { calendar: MON_FRI, checkIns: cis, overrides, asOf: "2026-11-02" });
  const change = (from: string, weekdays: never) => ({ weekdays, weekdaysFrom: from, previousWeekdays: null }) as Partial<typeof asg>;
  const late = (p: ChildPlan, cis: ProgressCheckIn[]) => { const f = forecastOutcome(p, cis, MON_FRI); return f && "finish" in f && f.finish > p.end ? f.finish : null; };

  it("N6: a days change with no new check-in leaves the forecast exactly where it was (same date), for several day sets", () => {
    const cis = checkIns([10, 10, 10, 10]); // the last check-in is Sep 28; the days change Oct 12, after it
    const before = late(plan(cis), cis);
    expect(before).not.toBeNull();
    for (const days of [[1, 2, 3, 4], [1, 3, 5], [1, 2, 3, 4, 5], [2, 4]]) {
      const p = plan(cis, change("2026-10-12", days as never));
      expect(late(p, cis), days.join()).toBe(before);
    }
  });

  it("N5: a late assignment that has an adjusted week stays late after its days change, as the control does", () => {
    // 14 pages a week against about 15 planned: only a little late, which is when a days change used to hide the line.
    const gains = [14, 14, 0, 14, 14, 14, 14, 14];
    const cis = checkIns(gains);
    const adjusted: PlanContext["overrides"] = [{ assignmentId: "a1", childId: "frank", weekStart: "2026-09-21", plannedUnits: 0, mode: "keepEndDate" }];
    for (const upTo of [4, 5, 6]) {
      const c = cis.slice(0, upTo);
      const control = late(plan(c), c);
      const withAdj = late(plan(c, {}, adjusted), c);
      expect(control, `control ${upTo}`).not.toBeNull();
      expect(withAdj, `adjusted ${upTo}`).not.toBeNull();
      for (const days of [[1, 2, 3, 4], [1, 3]]) {
        const changed = plan(c, change("2026-10-12", days as never), adjusted);
        expect(late(changed, c), `adjusted + change ${days.join()} after ${upTo} check-ins`).not.toBeNull();
        const ctl = plan(c, change("2026-10-12", days as never));
        expect(late(ctl, c), `control + change ${upTo}`).not.toBeNull();
      }
    }
  });

  it("with 2 or more check-in weeks after the change, the pace is measured and projected on the new days", () => {
    const cis = checkIns([10, 10, 10, 10, 10, 10, 10, 10]); // Oct 12, 19, 26 are after the change
    const p = plan(cis, change("2026-10-12", [1, 2, 3, 4] as never));
    const f = late(p, cis)!;
    expect(new Date(`${f}T00:00:00Z`).getUTCDay()).toBeGreaterThanOrEqual(1);
    expect(new Date(`${f}T00:00:00Z`).getUTCDay()).toBeLessThanOrEqual(4); // a Monday to Thursday finish
  });

  it("on track is judged on the days left: a child who catches up to what remains is not late", () => {
    const cis = checkIns([30, 30, 30, 30, 30, 30, 30, 30]); // 240 of 300 by Oct 30; 60 left over ~13 weeks
    const p = plan(cis);
    expect(late(p, cis)).toBeNull();
    expect(forecastOutcome(p, cis, MON_FRI)).toBeNull();
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
