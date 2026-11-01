/** S7b-10: capacityDays counts the days the plan will really use. */
import { describe, expect, it } from "vitest";
import { capacityDays, planChild, type BlockedPeriod, type RecurringEvent } from "../src";
import { book, MON_FRI } from "./helpers";

const base = { calendar: MON_FRI, childId: "frank", subjectId: "lit" };
const blocked = (start: string, end: string, childIds: string[] | null = null): BlockedPeriod => ({ id: start, label: "b", kind: "vacation", start, end, childIds } as BlockedPeriod);
const tuesdaySkip: RecurringEvent = { id: "coop", name: "Co-op", weekdays: [2], capacityFraction: 1, defaultRule: "normal", subjectRules: { lit: "skip" }, childIds: [] } as RecurringEvent;

describe("capacityDays (S7b-10)", () => {
  it("counts school days only: two weeks is 10, a weekend adds nothing, a backwards range is 0", () => {
    expect(capacityDays({ ...base, start: "2026-11-02", end: "2026-11-15" })).toBe(10);
    expect(capacityDays({ ...base, start: "2026-11-07", end: "2026-11-08" })).toBe(0);
    expect(capacityDays({ ...base, start: "2026-11-09", end: "2026-11-02" })).toBe(0);
  });

  it("leaves out days off for the child (or everyone), and events that skip the subject; counts lighter ones partly", () => {
    expect(capacityDays({ ...base, start: "2026-11-02", end: "2026-11-13", blocked: [blocked("2026-11-09", "2026-11-11")] })).toBe(7);
    expect(capacityDays({ ...base, start: "2026-11-02", end: "2026-11-13", blocked: [blocked("2026-11-09", "2026-11-11", ["margaret"])] })).toBe(10);
    expect(capacityDays({ ...base, start: "2026-11-02", end: "2026-11-13", events: [tuesdaySkip] })).toBe(8);
    expect(capacityDays({ ...base, subjectId: "math", start: "2026-11-02", end: "2026-11-13", events: [tuesdaySkip] })).toBe(10);
    const lighter = { ...tuesdaySkip, defaultRule: "lighter", capacityFraction: 0.5, subjectRules: {} } as RecurringEvent;
    expect(capacityDays({ ...base, start: "2026-11-02", end: "2026-11-13", events: [lighter] })).toBe(9);
  });

  it("uses the assignment's own days, else the subject's, else every school day", () => {
    expect(capacityDays({ ...base, start: "2026-11-02", end: "2026-11-15", weekdays: [1, 3] })).toBe(4);
    expect(capacityDays({ ...base, start: "2026-11-02", end: "2026-11-15", subjectWeekdays: [{ subjectId: "lit", weekdays: [5] }] })).toBe(2);
    expect(capacityDays({ ...base, start: "2026-11-02", end: "2026-11-15", weekdays: [1], subjectWeekdays: [{ subjectId: "lit", weekdays: [5] }] })).toBe(2);
  });

  it("matches the plan: total over capacityDays is the plan's own pace, in the review's case (breaks and a Tuesday skip)", () => {
    const blockedPeriods = [blocked("2026-11-23", "2026-11-27"), blocked("2026-12-21", "2027-01-01")];
    const asg = book({ totalUnits: 300, start: "2026-11-02", end: "2027-01-29" });
    const days = capacityDays({ ...base, start: asg.start, end: asg.end, events: [tuesdaySkip], blocked: blockedPeriods });
    const p = planChild(asg, "frank", { calendar: MON_FRI, events: [tuesdaySkip], blocked: blockedPeriods });
    expect(p.baseRate).toBeCloseTo(300 / days, 9);
    // Counting weekdays only (what the form did) would say far fewer pages a day.
    expect(300 / capacityDays({ ...base, start: asg.start, end: asg.end })).toBeLessThan(p.baseRate * 0.8);
  });
});
