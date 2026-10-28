/** S2b-20: actual-progress check-ins re-anchor the plan after their week. */
import { describe, expect, it } from "vitest";
import { addDays, planAssignment, planChild, plannedRangeForWeek, type ChildPlan, type OverrideMode, type PlanContext, type ProgressCheckIn, type RecurringEvent } from "../src";
import { book, expectConserved, expectSane, MON_FRI, unitsBetween, unitsOn } from "./helpers";

// DeeDee's example: 184 pages from Mon Sep 7 to Tue Sep 22, 16 pages a day, so week 1 is pp. 1-80.
// Capacity 5 + 5 + 1.5 (Tue Sep 22 is a half day) = 11.5 days.
const halfDay: RecurringEvent = { id: "half", childIds: [], weekdays: [2], start: "2026-09-22", end: "2026-09-22", capacityFraction: 0.5, subjectRules: {}, defaultRule: "lighter" };
const deedee = book({ totalUnits: 184, end: "2026-09-22" });
const base: PlanContext = { calendar: MON_FRI, events: [halfDay] };
const ci = (weekStart: string, position: number, mode: OverrideMode | null, childId = "frank"): ProgressCheckIn => ({ assignmentId: "a1", childId, weekStart, position, mode });
const plan = (checkIns: ProgressCheckIn[], ctx: PlanContext = base, a = deedee, child = "frank") => planChild(a, child, { ...ctx, checkIns }, undefined);
const units = (p: ChildPlan) => p.days.map((d) => [d.date, d.units] as const);
const positionAt = (p: ChildPlan, date: string) => p.days.find((d) => d.date === date)!.position;

function expectInvariants(p: ChildPlan): void {
  expectSane(p);
  expectConserved(p);
  let last = 0;
  for (const d of p.days) {
    expect(d.position).toBeGreaterThanOrEqual(last - 1e-9);
    expect(Number.isFinite(d.position)).toBe(true);
    expect(d.thickness).toBeCloseTo(d.units * p.weightPerUnit, 9);
    last = d.position;
  }
  if (p.unplacedUnits <= 1e-9) expect(p.days.at(-1)?.position ?? 0).toBeCloseTo(p.totalUnits, 6);
}

describe("check-ins (S2b-20)", () => {
  it("the fixture matches DeeDee's example: 16 a day, week 1 planned 0-80", () => {
    const p = plan([]);
    expect(p.baseRate).toBeCloseTo(16);
    expect(plannedRangeForWeek(p, "2026-09-07")).toEqual({ from: 0, to: expect.closeTo(80, 9), hasPlannedWork: true });
    expect(plannedRangeForWeek(p, "2026-09-14").to).toBeCloseTo(160);
    expect(plannedRangeForWeek(p, "2026-09-28")).toEqual({ from: expect.closeTo(184, 9), to: expect.closeTo(184, 9), hasPlannedWork: false });
    expect(p.checkInWeeks).toEqual([]);
    expect(p.days.at(-1)!.position).toBeCloseTo(184);
  });

  it("behind (65 of 80), keep end date: the remaining 119 go to the same end, thicker", () => {
    const p = plan([ci("2026-09-07", 65, "keepEndDate")]);
    expectInvariants(p);
    expect(unitsBetween(p, "2026-09-07", "2026-09-11")).toBeCloseTo(65);
    expect(unitsOn(p, "2026-09-07")).toBeCloseTo(13); // D9: the week's own bars show what happened
    expect(positionAt(p, "2026-09-13")).toBeCloseTo(65);
    expect(unitsBetween(p, "2026-09-14", "2026-09-22")).toBeCloseTo(119);
    expect(p.end).toBe("2026-09-22");
    expect(unitsOn(p, "2026-09-14")).toBeCloseTo(119 / 6.5);
    expect(unitsOn(p, "2026-09-14")).toBeGreaterThan(16);
    expect(p.doneUnits).toBe(65);
    expect(p.remainingUnits).toBe(119);
    expect(p.mode).toBe("keepEndDate");
    expect(p.checkInWeeks).toEqual(["2026-09-07"]);
  });

  it("behind (65 of 80), push: the same pace, the end moves later by about 15 pages' worth", () => {
    const p = plan([ci("2026-09-07", 65, "pushEndDate")]);
    expectInvariants(p);
    expect(p.rate).toBeCloseTo(16);
    expect(unitsOn(p, "2026-09-14")).toBeCloseTo(16);
    // 119 from Sep 14 at 16 a day: 80 + 16 (Mon 21) + 8 (half-day Tue 22) + 15 on Wed Sep 23.
    expect(p.end).toBe("2026-09-23");
    expect(unitsOn(p, "2026-09-23")).toBeCloseTo(15);
    expect(p.mode).toBe("pushEndDate");
  });

  it("ahead (100 of 80), keep: thinner bars", () => {
    const p = plan([ci("2026-09-07", 100, "keepEndDate")]);
    expectInvariants(p);
    expect(unitsBetween(p, "2026-09-07", "2026-09-11")).toBeCloseTo(100);
    expect(unitsOn(p, "2026-09-14")).toBeCloseTo(84 / 6.5);
    expect(unitsOn(p, "2026-09-14")).toBeLessThan(16);
    expect(p.end).toBe("2026-09-22");
  });

  it("ahead (100 of 80), push: the end is pulled in", () => {
    const p = plan([ci("2026-09-07", 100, "pushEndDate")]);
    expectInvariants(p);
    // 84 at 16 a day: 80 this week + 4 on Mon Sep 21.
    expect(p.end).toBe("2026-09-21");
    expect(unitsOn(p, "2026-09-21")).toBeCloseTo(4);
    expect(unitsOn(p, "2026-09-22")).toBe(0);
  });

  it("position = total: nothing after that week, finishedEarly", () => {
    const p = plan([ci("2026-09-07", 184, "keepEndDate")]);
    expectInvariants(p);
    expect(p.complete).toBe(true);
    expect(p.finishedEarly).toBe(true);
    expect(unitsBetween(p, "2026-09-14", "2026-12-31")).toBe(0);
    expect(p.end).toBe("2026-09-11");
    expect(p.remainingUnits).toBe(0);
    expect(plan([]).finishedEarly).toBe(false);
  });

  it.each([null, "keepEndDate", "pushEndDate"] as const)("on plan (80 of 80, mode %s) is identical to no check-in", (mode) => {
    const none = plan([]);
    const p = plan([ci("2026-09-07", 80, mode)]);
    expect(units(p)).toEqual(units(none));
    expect([p.end, p.rate, p.baseRate, p.mode]).toEqual([none.end, none.rate, none.baseRate, none.mode]);
    expect(p.warnings).toEqual([]);
    expect(p.checkInWeeks).toEqual(["2026-09-07"]);
  });

  it("two check-ins: editing the earlier one doesn't move the later anchor", () => {
    const a = plan([ci("2026-09-07", 65, "keepEndDate"), ci("2026-09-14", 140, "keepEndDate")]);
    const b = plan([ci("2026-09-07", 70, "keepEndDate"), ci("2026-09-14", 140, "keepEndDate")]);
    for (const p of [a, b]) {
      expectInvariants(p);
      expect(positionAt(p, "2026-09-20")).toBeCloseTo(140);
    }
    expect(positionAt(a, "2026-09-13")).toBeCloseTo(65);
    expect(positionAt(b, "2026-09-13")).toBeCloseTo(70);
    expect(units(a).filter(([d]) => d >= "2026-09-21")).toEqual(units(b).filter(([d]) => d >= "2026-09-21"));
    expect(a.checkInWeeks).toEqual(["2026-09-07", "2026-09-14"]);
    // Input order doesn't matter: check-ins are applied oldest week first.
    expect(units(plan([ci("2026-09-14", 140, "keepEndDate"), ci("2026-09-07", 65, "keepEndDate")]))).toEqual(units(a));
  });

  describe("the latest check-in is authoritative (S2b-38, D24)", () => {
    const after = (p: ChildPlan) => units(p).filter(([d]) => d >= "2026-09-21");
    it.each(["pushEndDate", "keepEndDate"] as const)("week 2 %s, then week 1 edited (65 → 70, push or keep): nothing after week 2 changes", (mode2) => {
      const ref = plan([ci("2026-09-07", 65, "keepEndDate"), ci("2026-09-14", 140, mode2)]);
      for (const edit of [ci("2026-09-07", 70, "keepEndDate"), ci("2026-09-07", 50, "pushEndDate"), ci("2026-09-07", 100, "pushEndDate")]) {
        const p = plan([edit, ci("2026-09-14", 140, mode2)]);
        expectInvariants(p);
        expect(positionAt(p, "2026-09-20")).toBeCloseTo(140);
        expect(after(p)).toEqual(after(ref));
        expect([p.end, p.rate, p.baseRate, p.mode, p.unplacedUnits]).toEqual([ref.end, ref.rate, ref.baseRate, ref.mode, ref.unplacedUnits]);
      }
    });
    it.each(["pushEndDate", "keepEndDate"] as const)("S2c-06: progress added on an unplanned week 1, then week 2 %s: editing week 1 changes nothing after week 2", (mode2) => {
      // Week 1 was planned at zero, so its check-in is unplanned progress (S2c-06's "Add progress").
      const zero: PlanContext = { ...base, overrides: [{ assignmentId: "a1", weekStart: "2026-09-07", plannedUnits: 0, mode: "keepEndDate" }] };
      expect(plannedRangeForWeek(plan([], zero), "2026-09-07").hasPlannedWork).toBe(false);
      const ref = plan([ci("2026-09-07", 30, "keepEndDate"), ci("2026-09-14", 140, mode2)], zero);
      expect(ref.warnings).toContain("unplanned-progress");
      for (const edit of [ci("2026-09-07", 45, "keepEndDate"), ci("2026-09-07", 10, "pushEndDate")]) {
        const p = plan([edit, ci("2026-09-14", 140, mode2)], zero);
        expectInvariants(p);
        expect(positionAt(p, "2026-09-13")).toBeCloseTo(edit.position);
        expect(positionAt(p, "2026-09-20")).toBeCloseTo(140);
        expect(after(p)).toEqual(after(ref));
        expect([p.end, p.rate, p.baseRate, p.mode, p.unplacedUnits]).toEqual([ref.end, ref.rate, ref.baseRate, ref.mode, ref.unplacedUnits]);
      }
    });
    it("week 2 push keeps the original pace, whatever week 1 said", () => {
      const p = plan([ci("2026-09-07", 50, "pushEndDate"), ci("2026-09-14", 140, "pushEndDate")]);
      expect(p.rate).toBeCloseTo(16);
      expect(unitsOn(p, "2026-09-21")).toBeCloseTo(16);
    });
    it("week 2 keep keeps the original end, even after week 1 pushed it", () => {
      const p = plan([ci("2026-09-07", 50, "pushEndDate"), ci("2026-09-14", 120, "keepEndDate")]);
      expectInvariants(p);
      expect(p.end).toBe("2026-09-22");
      expect(unitsBetween(p, "2026-09-21", "2026-09-22")).toBeCloseTo(64);
    });
    it("no later check-in: editing week 1 replans everything after it", () => {
      const a = plan([ci("2026-09-07", 65, "pushEndDate")]);
      const b = plan([ci("2026-09-07", 70, "pushEndDate")]);
      expect(after(a)).not.toEqual(after(b));
      expect(positionAt(b, "2026-09-13")).toBeCloseTo(70);
      expect(unitsBetween(b, "2026-09-14", b.end)).toBeCloseTo(114);
    });
    it("a keep check-in after the original end (an earlier push carried the work past it) goes at the original pace", () => {
      const p = plan([ci("2026-09-07", 20, "pushEndDate"), ci("2026-09-21", 100, "keepEndDate")]);
      expectInvariants(p);
      expect(p.mode).toBe("pushEndDate");
      expect(p.rate).toBeCloseTo(16);
      expect(positionAt(p, "2026-09-27")).toBeCloseTo(100);
      expect(unitsBetween(p, "2026-09-28", p.end)).toBeCloseTo(84);
    });
  });

  it("a duplicate week: the last entry wins, with a warning", () => {
    const p = plan([ci("2026-09-07", 10, "keepEndDate"), ci("2026-09-07", 65, "keepEndDate")]);
    expect(p.warnings).toContain("checkin-duplicate-week");
    expect(units(p)).toEqual(units(plan([ci("2026-09-07", 65, "keepEndDate")])));
  });

  it("a mid-week date is normalized to its week, with a warning", () => {
    const p = plan([ci("2026-09-09", 65, "keepEndDate")]);
    expect(p.warnings).toContain("checkin-misaligned");
    expect(p.checkInWeeks).toEqual(["2026-09-07"]);
    expect(positionAt(p, "2026-09-13")).toBeCloseTo(65);
  });

  it("a position beyond total is clamped with a warning; a negative one becomes 0", () => {
    const over = plan([ci("2026-09-07", 500, "keepEndDate")]);
    expect(over.warnings).toContain("checkin-clamped");
    expect(over.doneUnits).toBe(184);
    expect(over.finishedEarly).toBe(true);
    expectInvariants(over);
    const neg = plan([ci("2026-09-07", -5, "keepEndDate")]);
    expect(neg.warnings).toContain("checkin-clamped");
    expect(unitsBetween(neg, "2026-09-07", "2026-09-11")).toBe(0);
    expect(unitsBetween(neg, "2026-09-14", "2026-09-22")).toBeCloseTo(184);
    expectInvariants(neg);
    const nan = plan([ci("2026-09-07", Number.NaN, "keepEndDate")]);
    expect(nan.warnings).toContain("checkin-clamped");
    expectInvariants(nan);
  });

  it("a later check-in below an earlier one is raised to it, with a warning", () => {
    const p = plan([ci("2026-09-07", 65, "keepEndDate"), ci("2026-09-14", 50, "keepEndDate")]);
    expect(p.warnings).toContain("checkin-before-previous");
    expect(positionAt(p, "2026-09-20")).toBeCloseTo(65);
    expectInvariants(p);
  });

  it("behind before the week too: the assumed days since the last anchor are scaled down", () => {
    // Only week 2 checked in, at 50 (the plan had 80 before it): weeks 1-2 show 50 in total.
    const p = plan([ci("2026-09-14", 50, "keepEndDate")]);
    expectInvariants(p);
    expect(positionAt(p, "2026-09-20")).toBeCloseTo(50);
    expect(unitsOn(p, "2026-09-07")).toBeCloseTo(5);
    expect(unitsBetween(p, "2026-09-21", "2026-09-22")).toBeCloseTo(134);
  });

  it("a check-in for a week before the start or after the end is ignored, with a warning", () => {
    const none = plan([]);
    for (const week of ["2026-08-31", "2026-09-28"]) {
      const p = plan([ci(week, 50, "keepEndDate")]);
      expect(p.warnings).toContain("checkin-outside-range");
      expect(units(p)).toEqual(units(none));
      expect(p.checkInWeeks).toEqual([]);
    }
  });

  it("multi-child: check-ins are per child", () => {
    const shared = { ...deedee, childIds: ["frank", "margaret"] };
    const [f0] = planAssignment(shared, base);
    const [f, m] = planAssignment(shared, { ...base, checkIns: [ci("2026-09-07", 65, "pushEndDate", "margaret")] });
    expect(units(f!)).toEqual(units(f0!));
    expect(f!.checkInWeeks).toEqual([]);
    expect(m!.checkInWeeks).toEqual(["2026-09-07"]);
    expect(m!.end).toBe("2026-09-23");
  });

  const threeWeeks = book({ end: "2026-09-25" }); // 100 pages, 15 school days
  const vacation: PlanContext = { calendar: MON_FRI, blocked: [{ id: "v", start: "2026-09-14", end: "2026-09-18" }] };

  it("vacation: a fully blocked week checked in at the previous position changes nothing and warns nothing", () => {
    const none = plan([], vacation, threeWeeks);
    const p = plan([ci("2026-09-07", 50, "keepEndDate"), ci("2026-09-14", 50, "keepEndDate")], vacation, threeWeeks);
    expect(units(p)).toEqual(units(none));
    expect(p.warnings).toEqual([]);
  });

  it("a blocked week after the anchor gets no work", () => {
    const p = plan([ci("2026-09-07", 30, "keepEndDate")], vacation, threeWeeks);
    expectInvariants(p);
    expect(unitsBetween(p, "2026-09-14", "2026-09-18")).toBe(0);
    expect(unitsBetween(p, "2026-09-21", "2026-09-25")).toBeCloseTo(70);
  });

  it("work reported in a week with nothing planned lands on its last capacity day (unplanned-progress)", () => {
    const zeroWeek: PlanContext = { calendar: MON_FRI, overrides: [{ assignmentId: "a1", weekStart: "2026-09-14", plannedUnits: 0, mode: "keepEndDate" }] };
    const p = plan([ci("2026-09-14", 60, "keepEndDate")], zeroWeek, threeWeeks);
    expect(p.warnings).toContain("unplanned-progress");
    expect(unitsOn(p, "2026-09-18")).toBeCloseTo(10);
    expect(positionAt(p, "2026-09-20")).toBeCloseTo(60);
    expect(unitsBetween(p, "2026-09-21", "2026-09-25")).toBeCloseTo(40);
    expectInvariants(p);
  });

  it("an override after the anchor still applies in the new segment", () => {
    const ctx: PlanContext = { ...base, overrides: [{ assignmentId: "a1", weekStart: "2026-09-14", plannedUnits: 30, mode: "pushEndDate" }] };
    const p = plan([ci("2026-09-07", 65, "keepEndDate")], ctx);
    expectInvariants(p);
    expect(unitsBetween(p, "2026-09-14", "2026-09-18")).toBeCloseTo(30);
    // keepEndDate keeps the current end, which the push override had already moved.
    expect(p.end).toBe(plan([], ctx).end);
    expect(p.end > "2026-09-22").toBe(true);
    expect(unitsBetween(p, "2026-09-21", p.end)).toBeCloseTo(89);
  });

  it("invariants over random check-ins", () => {
    let seed = 20;
    const r = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const pick = <T,>(xs: readonly T[]): T => xs[Math.floor(r() * xs.length)]!;
    for (let i = 0; i < 300; i += 1) {
      const a = book({ totalUnits: pick([0, 1, 50, 184, 333.3]), end: addDays("2026-09-07", 4 + Math.floor(r() * 60)) });
      const checkIns = Array.from({ length: Math.floor(r() * 4) }, () =>
        ci(addDays("2026-08-31", 7 * Math.floor(r() * 12)), pick([0, 10, 65, 100, 184, 400, -3]), pick([null, "keepEndDate", "pushEndDate"] as const)));
      const ctx: PlanContext = { calendar: MON_FRI, blocked: r() < 0.4 ? [{ id: "b", start: addDays("2026-09-07", Math.floor(r() * 30)), end: addDays("2026-09-07", Math.floor(r() * 40)) }] : [] };
      expectInvariants(plan(checkIns, ctx, a));
    }
  });
});
