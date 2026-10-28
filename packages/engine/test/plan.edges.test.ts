import { describe, expect, it } from "vitest";
import { EngineInputError, planChild, type BlockedPeriod, type RecurringEvent } from "../src";
import { book, expectConserved, expectSane, MON_FRI, sumUnits, unitsBetween, unitsOn } from "./helpers";

const xmas: BlockedPeriod = { id: "xmas", start: "2026-12-21", end: "2027-01-01", kind: "vacation" };

describe("vacations at assignment edges", () => {
  it("vacation covering the first week: work starts after it", () => {
    const a = book({ start: "2026-12-21", end: "2027-01-15" }); // 2 weeks blocked + 2 school weeks
    const p = planChild(a, "frank", { calendar: MON_FRI, blocked: [xmas] });
    expectSane(p);
    expectConserved(p);
    expect(unitsBetween(p, "2026-12-21", "2027-01-01")).toBe(0);
    expect(p.baseRate).toBeCloseTo(10);
    expect(unitsOn(p, "2027-01-04")).toBeCloseTo(10);
  });

  it("vacation covering the last week: end date holds, work squeezes before it", () => {
    const a = book({ start: "2026-12-07", end: "2027-01-01" }); // 2 school weeks then 2 blocked
    const p = planChild(a, "frank", { calendar: MON_FRI, blocked: [xmas] });
    expectConserved(p);
    expect(unitsBetween(p, "2026-12-21", "2027-01-01")).toBe(0);
    expect(p.baseRate).toBeCloseTo(10);
    expect(p.end).toBe("2027-01-01");
  });

  it("vacation starting exactly on the start day and ending exactly on the end day minus one", () => {
    const a = book({ start: "2026-12-21", end: "2027-01-04" });
    const p = planChild(a, "frank", { calendar: MON_FRI, blocked: [xmas] });
    expect(unitsOn(p, "2027-01-04")).toBeCloseTo(100); // all on the one free day
    expectConserved(p);
  });

  it("assignment fully inside a vacation: zero capacity is defined, never NaN/Infinity", () => {
    const a = book({ start: "2026-12-22", end: "2026-12-31" });
    const p = planChild(a, "frank", { calendar: MON_FRI, blocked: [xmas] });
    expectSane(p);
    expect(p.noCapacity).toBe(true);
    expect(p.warnings).toContain("no-capacity");
    expect(p.baseRate).toBe(0);
    expect(p.rate).toBe(0);
    expect(p.unplacedUnits).toBe(100);
    expect(sumUnits(p)).toBe(0);
    expectConserved(p);
  });

  it("zero capacity + pushEndDate override still has no NaN (override ignored with a warning)", () => {
    const a = book({ start: "2026-12-22", end: "2026-12-31" });
    const p = planChild(a, "frank", { calendar: MON_FRI, blocked: [xmas], overrides: [{ assignmentId: "a1", weekStart: "2026-12-21", plannedUnits: 10, mode: "pushEndDate" }] });
    expectSane(p);
    expect(p.noCapacity).toBe(true);
    expect(p.warnings).toContain("override-no-capacity");
  });

  it("weekend-only assignment has no capacity on a Mon-Fri calendar", () => {
    const p = planChild(book({ start: "2026-09-12", end: "2026-09-13" }), "frank", { calendar: MON_FRI });
    expect(p.noCapacity).toBe(true);
    expectSane(p);
  });

  it("vacation in the middle thickens the other days", () => {
    const a = book({ start: "2026-12-14", end: "2027-01-08" }); // 4 weeks, 2 blocked
    const p = planChild(a, "frank", { calendar: MON_FRI, blocked: [xmas] });
    expect(p.baseRate).toBeCloseTo(10);
    expectConserved(p);
  });

  it("overlapping blocked periods don't double-count", () => {
    const p = planChild(book(), "frank", { calendar: MON_FRI, blocked: [
      { id: "1", start: "2026-09-07", end: "2026-09-09" },
      { id: "2", start: "2026-09-08", end: "2026-09-10" },
    ] });
    expect(p.baseRate).toBeCloseTo(100 / 6);
    expectConserved(p);
  });
});

describe("events every day", () => {
  it("skip every school day = no capacity", () => {
    const ev: RecurringEvent = { id: "e", childIds: ["frank"], weekdays: [1, 2, 3, 4, 5], capacityFraction: 1, subjectRules: { lit: "skip" } };
    const p = planChild(book(), "frank", { calendar: MON_FRI, events: [ev] });
    expect(p.noCapacity).toBe(true);
    expectSane(p);
  });

  it("lighter every day just scales the rate up", () => {
    const ev: RecurringEvent = { id: "e", childIds: ["frank"], weekdays: [1, 2, 3, 4, 5], capacityFraction: 0.5, subjectRules: { lit: "lighter" } };
    const p = planChild(book(), "frank", { calendar: MON_FRI, events: [ev] });
    expect(p.baseRate).toBeCloseTo(20); // units per full-capacity day
    expect(unitsOn(p, "2026-09-07")).toBeCloseTo(10); // but each real day is still 10
    expectConserved(p);
  });

  it("an all-day 'lighter' (fraction 1) behaves like skip", () => {
    const ev: RecurringEvent = { id: "e", childIds: ["frank"], weekdays: [1], capacityFraction: 1, subjectRules: { lit: "lighter" } };
    const p = planChild(book(), "frank", { calendar: MON_FRI, events: [ev] });
    expect(unitsOn(p, "2026-09-07")).toBe(0);
    expect(p.baseRate).toBeCloseTo(100 / 8);
  });
});

describe("degenerate ranges and inputs", () => {
  it("one-day assignment", () => {
    const p = planChild(book({ start: "2026-09-09", end: "2026-09-09" }), "frank", { calendar: MON_FRI });
    expect(unitsOn(p, "2026-09-09")).toBeCloseTo(100);
    expect(p.days).toHaveLength(1);
  });

  it("end before start: empty, flagged, no throw", () => {
    const p = planChild(book({ start: "2026-09-18", end: "2026-09-07" }), "frank", { calendar: MON_FRI });
    expectSane(p);
    expect(p.warnings).toContain("invalid-range");
    expect(p.unplacedUnits).toBe(100);
    expect(sumUnits(p)).toBe(0);
  });

  it("zero total units is complete with an all-zero plan", () => {
    const p = planChild(book({ totalUnits: 0 }), "frank", { calendar: MON_FRI });
    expect(p.complete).toBe(true);
    expect(sumUnits(p)).toBe(0);
    expectSane(p);
  });

  it("fractional totals are fine", () => {
    const p = planChild(book({ totalUnits: 7.5 }), "frank", { calendar: MON_FRI });
    expect(sumUnits(p)).toBeCloseTo(7.5);
  });

  it("throws EngineInputError on bad dates or totals", () => {
    expect(() => planChild(book({ start: "2027-02-29" }), "frank", { calendar: MON_FRI })).toThrow(EngineInputError);
    expect(() => planChild(book({ end: "2026/09/18" }), "frank", { calendar: MON_FRI })).toThrow(EngineInputError);
    expect(() => planChild(book({ totalUnits: -1 }), "frank", { calendar: MON_FRI })).toThrow(EngineInputError);
    expect(() => planChild(book({ totalUnits: Number.NaN }), "frank", { calendar: MON_FRI })).toThrow(EngineInputError);
    expect(() => planChild(book(), "frank", { calendar: MON_FRI, blocked: [{ id: "b", start: "2026-02-30", end: "2026-03-01" }] })).toThrow(EngineInputError);
  });
});

describe("leap years", () => {
  it("Feb 29 2028 is a school day (Tuesday) and gets work", () => {
    const p = planChild(book({ start: "2028-02-28", end: "2028-03-03" }), "frank", { calendar: MON_FRI });
    expect(p.days.map((d) => d.date)).toContain("2028-02-29");
    expect(unitsOn(p, "2028-02-29")).toBeCloseTo(20);
    expect(p.days).toHaveLength(5);
  });

  it("Feb in a non-leap year has one fewer day", () => {
    const p27 = planChild(book({ start: "2027-02-01", end: "2027-03-01" }), "frank", { calendar: MON_FRI });
    const p28 = planChild(book({ start: "2028-02-01", end: "2028-03-01" }), "frank", { calendar: MON_FRI });
    expect(p27.days).toHaveLength(29);
    expect(p28.days).toHaveLength(30);
  });

  it("a vacation on Feb 29 blocks just that day", () => {
    const p = planChild(book({ start: "2028-02-28", end: "2028-03-03" }), "frank", { calendar: MON_FRI, blocked: [{ id: "leap", start: "2028-02-29", end: "2028-02-29" }] });
    expect(unitsOn(p, "2028-02-29")).toBe(0);
    expect(p.baseRate).toBeCloseTo(25);
  });

  it("a year-long plan across a leap day conserves", () => {
    const p = planChild(book({ totalUnits: 180, start: "2027-08-30", end: "2028-05-26" }), "frank", { calendar: MON_FRI, blocked: [xmas] });
    expectConserved(p);
    expect(sumUnits(p)).toBeCloseTo(180);
  });
});

describe("DST weeks", () => {
  it("weeks containing US DST changes plan like any other week", () => {
    for (const [s, e] of [["2026-03-09", "2026-03-13"], ["2026-11-02", "2026-11-06"], ["2027-03-15", "2027-03-19"], ["2027-11-08", "2027-11-12"]]) {
      const p = planChild(book({ start: s!, end: e! }), "frank", { calendar: MON_FRI });
      expect(p.days).toHaveLength(5);
      for (const d of p.days) expect(d.units).toBeCloseTo(20);
    }
  });

  it("an assignment spanning the Sunday DST switch keeps 5 school days per week", () => {
    const p = planChild(book({ start: "2026-10-26", end: "2026-11-06" }), "frank", { calendar: { weekStart: "sun", schoolDays: [1, 2, 3, 4, 5] } });
    expect(p.days.filter((d) => d.schoolDay)).toHaveLength(10);
    expect(p.baseRate).toBeCloseTo(10);
  });
});
