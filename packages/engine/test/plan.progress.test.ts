/** S2b-18: the plan assumes scheduled work was done; asOf only labels days and logs never move bars. */
import { describe, expect, it } from "vitest";
import { planAll, planChild, type ChildPlan, type PlanContext } from "../src";
import { addDays } from "../src/dates";
import * as S from "./fixtures/sample-family";
import { book, expectConserved, expectSane, MON_FRI, unitsBetween, unitsOn } from "./helpers";

// 100 pages, Mon Sep 7 - Fri Sep 18 (10 days, 10/day)
// S2b-19 removed PlanContext.progress; an old caller's stray key must still change nothing.
const log = (date: string, units: number, childId = "frank") => ({ assignmentId: "a1", childId, date, units });
const units = (p: ChildPlan) => p.days.map((d) => [d.date, d.units] as const);
const kindOn = (p: ChildPlan, date: string) => p.days.find((d) => d.date === date)!.kind;
const sampleCtx: PlanContext = { calendar: S.calendar, events: S.events, blocked: S.blocked };
const ti = S.assignments.find((a) => a.id === "ti")!;

describe("assumed progress (S2b-18)", () => {
  it("unlogged work does not roll forward (DeeDee, Oct 28)", () => {
    const p = planChild(ti, "frank", { ...sampleCtx, asOf: "2026-10-26" });
    expectSane(p);
    // The ticket says 184 pages; the sample family's Treasure Island is 270 pages (12 days x 22.5). See sprint-2b.md.
    expect(ti.totalUnits).toBe(270);
    expect(ti.start).toBe("2026-10-19");
    expect(p.baseRate).toBeCloseTo(22.5);
    expect(unitsBetween(p, "2026-10-26", "2026-10-30")).toBeCloseTo(90);
    expect(unitsBetween(p, "2026-10-26", "2026-10-30")).not.toBeCloseTo(135);
  });

  it("asOf 2026-10-19, 2026-10-26 and 2026-11-30 give identical units; only kinds differ", () => {
    const [a, b, c] = ["2026-10-19", "2026-10-26", "2026-11-30"].map((asOf) => planChild(ti, "frank", { ...sampleCtx, asOf }));
    expect(units(b!)).toEqual(units(a!));
    expect(units(c!)).toEqual(units(a!));
    expect(kindOn(a!, "2026-10-19")).toBe("planned");
    expect(kindOn(b!, "2026-10-19")).toBe("assumed");
    expect(kindOn(b!, "2026-10-26")).toBe("planned");
    expect(c!.days.every((d) => d.kind === "assumed" || d.date >= "2026-11-30")).toBe(true);
  });

  it("asOf invariance: every sample-family plan is the same for 5 random asOf dates", () => {
    let seed = 18;
    const r = () => ((seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31);
    const base = planAll(S.assignments, sampleCtx);
    for (let i = 0; i < 5; i += 1) {
      const asOf = addDays("2026-08-01", Math.floor(r() * 400));
      const other = planAll(S.assignments, { ...sampleCtx, asOf });
      expect(other.map(units), asOf).toEqual(base.map(units));
      expect(other.map((p) => [p.rate, p.baseRate, p.end, p.unplacedUnits]), asOf).toEqual(base.map((p) => [p.rate, p.baseRate, p.end, p.unplacedUnits]));
      for (const p of other) for (const d of p.days) expect(d.kind === "assumed", `${p.assignmentId} ${d.date}`).toBe(d.date < asOf);
    }
  });

  it("asOf invariance on the book fixture, with and without overrides", () => {
    const overrides = [{ assignmentId: "a1", weekStart: "2026-09-14", plannedUnits: 20, mode: "pushEndDate" as const }];
    for (const ctx of [{ calendar: MON_FRI }, { calendar: MON_FRI, overrides }]) {
      const base = planChild(book(), "frank", ctx);
      for (const asOf of ["2026-08-01", "2026-09-09", "2026-09-14", "2026-09-18", "2027-01-04"]) {
        expect(units(planChild(book(), "frank", { ...ctx, asOf }))).toEqual(units(base));
      }
    }
  });

  it("a legacy progress key (removed in S2b-19) has no effect", () => {
    const base = planChild(book(), "frank", { calendar: MON_FRI, asOf: "2026-09-14" });
    for (const progress of [[log("2026-09-07", 30)], [log("2026-09-07", 130)], [log("2026-09-08", -5)], [log("2026-09-04", 5)], [log("2026-09-08", 50, "margaret")]]) {
      const p = planChild(book(), "frank", { calendar: MON_FRI, asOf: "2026-09-14", progress } as PlanContext);
      expect(p).toEqual(base);
    }
    expect(base.doneUnits).toBe(0);
    expect(base.remainingUnits).toBe(100);
    expect(base.complete).toBe(false);
    expectConserved(base);
  });

  it("days before asOf are assumed, the rest planned or override", () => {
    const p = planChild(book(), "frank", {
      calendar: MON_FRI, asOf: "2026-09-10",
      overrides: [{ assignmentId: "a1", weekStart: "2026-09-14", plannedUnits: 20, mode: "keepEndDate" }],
    });
    for (const d of p.days) {
      if (d.date < "2026-09-10") expect(d.kind).toBe("assumed");
      else if (d.date >= "2026-09-14") expect(d.kind).toBe("override");
      else expect(d.kind).toBe("planned");
    }
    expect(unitsOn(p, "2026-09-07")).toBeCloseTo(16);
  });

  it("a past override week keeps its override units (kind assumed, mode kept)", () => {
    const overrides = [{ assignmentId: "a1", weekStart: "2026-09-07", plannedUnits: 5, mode: "pushEndDate" as const }];
    const before = planChild(book(), "frank", { calendar: MON_FRI, overrides });
    const p = planChild(book(), "frank", { calendar: MON_FRI, asOf: "2026-09-14", overrides });
    expect(unitsBetween(p, "2026-09-07", "2026-09-11")).toBeCloseTo(5);
    expect(kindOn(p, "2026-09-07")).toBe("assumed");
    expect(kindOn(before, "2026-09-07")).toBe("override");
    expect(p.mode).toBe("pushEndDate");
    expect(p.warnings).not.toContain("override-outside-range");
    expect(units(p)).toEqual(units(before));
  });

  it("asOf before the start: nothing assumed", () => {
    const p = planChild(book(), "frank", { calendar: MON_FRI, asOf: "2026-08-01" });
    expect(p.baseRate).toBeCloseTo(10);
    expect(p.days.some((d) => d.kind === "assumed")).toBe(false);
  });

  it("asOf after the end: every day assumed, nothing unplaced, no past-end warning", () => {
    const p = planChild(book(), "frank", { calendar: MON_FRI, asOf: "2026-09-21" });
    expectSane(p);
    expect(p.days.every((d) => d.kind === "assumed")).toBe(true);
    expect(p.unplacedUnits).toBe(0);
    expect(p.noCapacity).toBe(false);
    expect(p.warnings).not.toContain("past-end");
    expect(p.complete).toBe(false);
  });

  it("a zero-unit assignment is still complete", () => {
    expect(planChild(book({ totalUnits: 0 }), "frank", { calendar: MON_FRI, asOf: "2026-09-14" }).complete).toBe(true);
  });
});
