/**
 * S2b-28 tester pass: check-in edge cases at the engine level. The API/end-to-end half is in
 * apps/api/test/tester3.checkins.test.ts; cases that only make sense there are noted in tester-report.md.
 */
import { describe, expect, it } from "vitest";
import {
  planChild, plannedRangeForWeek,
  type Assignment, type BlockedPeriod, type ChildPlan, type OverrideMode, type PlanContext, type ProgressCheckIn,
} from "../src";
import { book, expectConserved, expectSane, MON_FRI, unitsBetween } from "./helpers";

// 300 pages over four school weeks (Mon Sep 7 – Fri Oct 2): 15 a day, 75 a week.
const four = book({ totalUnits: 300, end: "2026-10-02", childIds: ["frank", "margaret"] });
const W1 = "2026-09-07", W2 = "2026-09-14", W3 = "2026-09-21", W4 = "2026-09-28";
const base: PlanContext = { calendar: MON_FRI };
const ci = (weekStart: string, position: number, mode: OverrideMode | null, childId = "frank"): ProgressCheckIn =>
  ({ assignmentId: "a1", childId, weekStart, position, mode });
const plan = (checkIns: ProgressCheckIn[], ctx: PlanContext = base, a: Assignment = four, child = "frank") =>
  planChild(a, child, { ...ctx, checkIns });
const units = (p: ChildPlan, from = "0000-00-00") => p.days.filter((d) => d.date >= from).map((d) => [d.date, d.units] as const);
const sum = (p: ChildPlan) => p.days.reduce((s, d) => s + d.units, 0);

function expectWhole(p: ChildPlan) {
  expectSane(p);
  expectConserved(p);
  expect(sum(p)).toBeCloseTo(p.totalUnits, 6);
}

describe("case 1: no logging needed", () => {
  it("the plan doesn't depend on today (asOf only labels days)", () => {
    const days = ["2026-09-07", "2026-09-15", "2026-09-29", "2026-10-02"].map((asOf) => units(plan([], { ...base, asOf })));
    for (const d of days) expect(d).toEqual(days[0]);
    expect(plannedRangeForWeek(plan([]), W3)).toEqual({ from: expect.closeTo(150, 9), to: expect.closeTo(225, 9), hasPlannedWork: true });
  });
});

describe("case 2: multi-child", () => {
  it("Margaret done and Frank behind: only Frank's plan changes, in both modes", () => {
    for (const mode of ["keepEndDate", "pushEndDate"] as const) {
      const cis = [ci(W1, 300, null, "margaret"), ci(W1, 65, mode, "frank")];
      const m = plan(cis, base, four, "margaret");
      const f = plan(cis, base, four, "frank");
      expect(m.finishedEarly).toBe(true);
      expect(unitsBetween(m, W2, "2026-12-31")).toBe(0);
      expect(units(f, W2)).not.toEqual(units(plan([]), W2));
      expect(units(f)).toEqual(units(plan([ci(W1, 65, mode)])));
      expectWhole(f);
    }
  });
});

describe("case 3: finished early", () => {
  it("position = total in week 2: no bars after it, finishedEarly; removing the check-in brings them back", () => {
    const done = plan([ci(W2, 300, null)]);
    expectWhole(done);
    expect(done.finishedEarly).toBe(true);
    expect(done.complete).toBe(true);
    expect(unitsBetween(done, W3, "2026-12-31")).toBe(0);
    expect(done.end <= "2026-09-18").toBe(true);
    const back = plan([]);
    expect(unitsBetween(back, W3, "2026-12-31")).toBeCloseTo(150);
    expect(back.finishedEarly).toBe(false);
  });
  it("reaching the total in the last planned week is on plan, not 'finished early'", () => {
    const p = plan([ci(W4, 300, null)]);
    expect(p.finishedEarly).toBe(false);
    expect(units(p)).toEqual(units(plan([])));
  });
});

describe("case 4: ahead", () => {
  it.each(["keepEndDate", "pushEndDate"] as const)("100 of 75 with %s: end earlier or equal, totals intact", (mode) => {
    const before = plan([]);
    const p = plan([ci(W1, 100, mode)]);
    expectWhole(p);
    expect(p.end <= before.end).toBe(true);
    if (mode === "keepEndDate") {
      expect(p.end).toBe(before.end);
      expect(unitsBetween(p, W2, W2.replace("14", "18"))).toBeLessThan(75);
    } else expect(p.end < before.end).toBe(true);
  });
  it("way ahead (299 of 75) stays whole", () => {
    for (const mode of ["keepEndDate", "pushEndDate"] as const) expectWhole(plan([ci(W1, 299, mode)]));
  });
});

describe("case 5: vacation weeks", () => {
  const block = (id: string, start: string, end: string): BlockedPeriod => ({ id, start, end });
  it("a fully blocked week has no planned work", () => {
    const p = plan([], { ...base, blocked: [block("v", W2, "2026-09-18")] });
    expect(plannedRangeForWeek(p, W2).hasPlannedWork).toBe(false);
    expectWhole(p);
  });
  it("a partly blocked week: the planned range covers only the open days", () => {
    const p = plan([], { ...base, blocked: [block("v", "2026-09-16", "2026-09-18")] }); // Wed–Fri off
    const r = plannedRangeForWeek(p, W2);
    expect(r.hasPlannedWork).toBe(true);
    expect(unitsBetween(p, "2026-09-16", "2026-09-18")).toBe(0);
    expect(r.to - r.from).toBeCloseTo(unitsBetween(p, "2026-09-14", "2026-09-15"), 9);
  });
  it("behind + push across a future vacation: no work in the vacation, and the end is after it", () => {
    const ctx = { ...base, blocked: [block("v", "2026-10-05", "2026-10-09")] };
    const p = plan([ci(W4, 200, "pushEndDate")], ctx);
    expectWhole(p);
    expect(unitsBetween(p, "2026-10-05", "2026-10-09")).toBe(0);
    expect(p.end > "2026-10-09").toBe(true);
  });
});

describe("case 6: editing a past check-in", () => {
  it("week 1 at 65 (keep), week 2 at 140 (push); editing week 1 to 80: week 3 on starts from week 2's anchor", () => {
    const a = plan([ci(W1, 65, "keepEndDate"), ci(W2, 140, "pushEndDate")]);
    const b = plan([ci(W1, 80, "keepEndDate"), ci(W2, 140, "pushEndDate")]);
    for (const p of [a, b]) {
      expectWhole(p);
      expect(p.days.find((d) => d.date === "2026-09-20")!.position).toBeCloseTo(140);
      expect(unitsBetween(p, W3, "2026-12-31")).toBeCloseTo(160);
    }
    // S2b-38 (D24): the latest check-in is authoritative, so week 3 on is identical (T5-2, resolved).
    expect(units(a, W3)).toEqual(units(b, W3));
    expect([a.end, a.rate]).toEqual([b.end, b.rate]);
  });
  it("with keep at week 2, editing week 1 leaves week 3 on identical", () => {
    const a = plan([ci(W1, 65, "keepEndDate"), ci(W2, 140, "keepEndDate")]);
    const b = plan([ci(W1, 80, "keepEndDate"), ci(W2, 140, "keepEndDate")]);
    expect(units(a, W3)).toEqual(units(b, W3));
    expect(a.end).toBe(b.end);
  });
  it("clearing week 2 → driven by week 1 again", () => {
    const one = plan([ci(W1, 65, "keepEndDate")]);
    const both = plan([ci(W1, 65, "keepEndDate"), ci(W2, 140, "pushEndDate")]);
    expect(units(both, W3)).not.toEqual(units(one, W3));
    // The same input minus week 2 is exactly week 1's plan: nothing of week 2 lingers.
    const cleared = plan([ci(W1, 65, "keepEndDate"), ci(W2, 140, "pushEndDate")].filter((c) => c.weekStart !== W2));
    expect(units(cleared)).toEqual(units(one));
    expect(cleared.end).toBe("2026-10-02");
  });
});

describe("case 7: a week with no planned work", () => {
  it("before the start, or after the last unit, hasPlannedWork is false", () => {
    const p = plan([]);
    expect(plannedRangeForWeek(p, "2026-08-31").hasPlannedWork).toBe(false);
    expect(plannedRangeForWeek(p, "2026-10-05").hasPlannedWork).toBe(false);
    expect(plannedRangeForWeek(plan([ci(W1, 300, null)]), W2).hasPlannedWork).toBe(false);
  });
  it("progress in a week with nothing planned: unplanned-progress, and the plan stays whole", () => {
    const ctx: PlanContext = { ...base, overrides: [{ assignmentId: "a1", weekStart: W2, plannedUnits: 0, mode: "keepEndDate" }] };
    const p = plan([ci(W2, 110, "keepEndDate")], ctx);
    expect(p.warnings).toContain("unplanned-progress");
    expectWhole(p);
    expect(p.days.find((d) => d.date === "2026-09-20")!.position).toBeCloseTo(110);
  });
});

describe("case 10: the total shrinks below a stored position", () => {
  it("the check-in is clamped to the new total, with a warning", () => {
    const p = plan([ci(W1, 250, "keepEndDate")], base, { ...four, totalUnits: 200 });
    expect(p.warnings).toContain("checkin-clamped");
    expect(p.complete).toBe(true);
    expect(p.doneUnits).toBe(200);
    expectWhole(p);
  });
});
