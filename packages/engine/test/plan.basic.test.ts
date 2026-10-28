import { describe, expect, it } from "vitest";
import { DEFAULT_MINUTES_PER_UNIT, ENGINE_VERSION, planChild, type RecurringEvent } from "../src";
import { book, expectConserved, expectSane, MON_FRI, sumUnits, unitsOn } from "./helpers";

const ctx = { calendar: MON_FRI };

describe("basic plan", () => {
  it("exports a semver ENGINE_VERSION and stamps it on every plan", () => {
    expect(ENGINE_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
    expect(planChild(book(), "frank", ctx).engineVersion).toBe(ENGINE_VERSION);
  });

  it("spreads units evenly over school days: 100 pages / 10 days = 10 a day", () => {
    const p = planChild(book(), "frank", ctx);
    expectSane(p);
    expectConserved(p);
    expect(p.baseRate).toBeCloseTo(10);
    expect(p.rate).toBeCloseTo(10);
    expect(unitsOn(p, "2026-09-07")).toBeCloseTo(10);
    expect(unitsOn(p, "2026-09-12")).toBe(0); // Saturday
    expect(sumUnits(p)).toBeCloseTo(100);
    expect(p.end).toBe("2026-09-18");
    expect(p.mode).toBeNull();
  });

  it("spec example: 300 pages over 60 days is 5/day; skipping 10 co-op days makes it 6", () => {
    // 12 weeks Mon Sep 7 - Fri Nov 27 = 60 school days, 12 Tuesdays. Use 10 weeks of co-op to remove exactly 10 days.
    const a = book({ totalUnits: 300, start: "2026-09-07", end: "2026-11-27" });
    expect(planChild(a, "frank", ctx).baseRate).toBeCloseTo(5);
    const coop: RecurringEvent = { id: "coop", childIds: ["frank"], weekdays: [2], capacityFraction: 0.5, subjectRules: { lit: "skip" }, start: "2026-09-08", end: "2026-11-10" };
    const p = planChild(a, "frank", { calendar: MON_FRI, events: [coop] });
    expect(p.baseRate).toBeCloseTo(6);
    expect(unitsOn(p, "2026-09-08")).toBe(0);
    expect(unitsOn(p, "2026-11-17")).toBeCloseTo(6); // co-op over, Tuesday is a normal day again
    expectConserved(p);
  });

  it("lighter days get a proportional share", () => {
    const ev: RecurringEvent = { id: "e", childIds: ["frank"], weekdays: [2], capacityFraction: 0.5, subjectRules: { lit: "lighter" } };
    const p = planChild(book(), "frank", { calendar: MON_FRI, events: [ev] });
    // capacity per week = 4 + 0.5 = 4.5; 2 weeks = 9; rate = 100/9
    expect(p.baseRate).toBeCloseTo(100 / 9);
    expect(unitsOn(p, "2026-09-08")).toBeCloseTo(50 / 9);
    expectConserved(p);
  });

  it("thickness is minutes per day via default minutes per unit, flagged estimated", () => {
    const p = planChild(book(), "frank", ctx);
    expect(p.minutesPerUnit).toBe(DEFAULT_MINUTES_PER_UNIT.pages);
    expect(p.minutesPerUnitEstimated).toBe(true);
    expect(p.days.find((d) => d.date === "2026-09-07")!.minutes).toBeCloseTo(10 * DEFAULT_MINUTES_PER_UNIT.pages);
  });

  it("a parent-set minutesPerUnit clears the estimated flag (0 is a valid choice)", () => {
    const p = planChild(book({ minutesPerUnit: 3 }), "frank", ctx);
    expect(p.minutesPerUnit).toBe(3);
    expect(p.minutesPerUnitEstimated).toBe(false);
    const z = planChild(book({ minutesPerUnit: 0 }), "frank", ctx);
    expect(z.minutesPerUnit).toBe(0);
    expect(z.minutesPerUnitEstimated).toBe(false);
  });

  it("null / negative / NaN minutesPerUnit falls back to the default", () => {
    for (const v of [null, undefined, -2, Number.NaN, Number.POSITIVE_INFINITY]) {
      const p = planChild(book({ minutesPerUnit: v as number | null | undefined }), "frank", ctx);
      expect(p.minutesPerUnit).toBe(2);
      expect(p.minutesPerUnitEstimated).toBe(true);
    }
  });

  it("minutes unit is always 1 min per unit and never estimated", () => {
    const p = planChild(book({ unitType: "minutes", totalUnits: 300, minutesPerUnit: 5 }), "frank", ctx);
    expect(p.minutesPerUnit).toBe(1);
    expect(p.minutesPerUnitEstimated).toBe(false);
    expect(p.days[0]!.minutes).toBeCloseTo(30);
  });

  it("each unit type has its own default", () => {
    for (const unitType of ["pages", "chapters", "lessons", "minutes"] as const) {
      expect(planChild(book({ unitType }), "frank", ctx).minutesPerUnit).toBe(DEFAULT_MINUTES_PER_UNIT[unitType]);
    }
  });

  it("thickness = units × the built-in weight when the weight is null (1, 10, 15, 0.5)", () => {
    for (const [unitType, w] of [["pages", 1], ["chapters", 10], ["lessons", 15], ["minutes", 0.5]] as const) {
      const p = planChild(book({ unitType, weightPerUnit: null }), "frank", ctx);
      expect(p.weightPerUnit).toBe(w);
      expect(p.weightSource).toBe("default");
      expect(p.days[0]!.thickness).toBeCloseTo(10 * w);
    }
  });

  it("an explicit weight sets thickness: 10 pages a day at 1.4 → 14", () => {
    const p = planChild(book({ weightPerUnit: 1.4 }), "frank", ctx);
    expect(p.weightSource).toBe("assignment");
    expect(p.days[0]!.thickness).toBeCloseTo(14);
  });

  it("minutes: 30 a day with no weight → 15 (= 15 pages at weight 1); an explicit weight 1 → 30", () => {
    expect(planChild(book({ unitType: "minutes", totalUnits: 300 }), "frank", ctx).days[0]!.thickness).toBeCloseTo(15);
    expect(planChild(book({ unitType: "minutes", totalUnits: 300, weightPerUnit: 1 }), "frank", ctx).days[0]!.thickness).toBeCloseTo(30);
  });

  it("returns the full start..end range including weekends, with schoolDay flags", () => {
    const p = planChild(book(), "frank", ctx);
    expect(p.days).toHaveLength(12);
    expect(p.days[0]!.date).toBe("2026-09-07");
    expect(p.days.at(-1)!.date).toBe("2026-09-18");
    expect(p.days.filter((d) => d.schoolDay)).toHaveLength(10);
  });

  it("is pure: same inputs give identical output, inputs are not mutated", () => {
    const a = book();
    const c = { calendar: MON_FRI, events: [], blocked: [], overrides: [{ assignmentId: "a1", weekStart: "2026-09-07", plannedUnits: 20, mode: "keepEndDate" as const }] };
    const before = JSON.stringify({ a, c });
    const p1 = planChild(a, "frank", c);
    const p2 = planChild(a, "frank", c);
    expect(p1).toEqual(p2);
    expect(JSON.stringify({ a, c })).toBe(before);
  });

  it("output is JSON-safe (no Infinity/NaN/Date)", () => {
    const p = planChild(book(), "frank", ctx);
    expect(JSON.parse(JSON.stringify(p))).toEqual(p);
  });
});
