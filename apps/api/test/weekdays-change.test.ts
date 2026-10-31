/** S4-01b: when a weekday change leaves history (the date-and-previous-days rule, without the database). */
import { describe, expect, it } from "vitest";
import { effectiveWeekdays, weekdaysChange } from "../src/services/weekdaysChange";

const base = { startDate: "2026-10-05", today: "2026-10-29", weekStart: "mon" as const, before: null, after: [5] };

describe("weekdaysChange", () => {
  it("a started assignment stores the current week's start and the days before", () => {
    expect(weekdaysChange(base)).toEqual({ weekdaysFrom: "2026-10-26", previousWeekdays: null });
    expect(weekdaysChange({ ...base, before: [1, 2], after: null })).toEqual({ weekdaysFrom: "2026-10-26", previousWeekdays: [1, 2] });
  });
  it("uses the family's week start", () => {
    expect(weekdaysChange({ ...base, weekStart: "sun" })!.weekdaysFrom).toBe("2026-10-25");
  });
  it("an assignment that starts this week or later stores nothing", () => {
    expect(weekdaysChange({ ...base, startDate: "2026-10-26" })).toBeNull();
    expect(weekdaysChange({ ...base, startDate: "2026-11-02" })).toBeNull();
    expect(weekdaysChange({ ...base, startDate: "2026-10-25" })).toEqual({ weekdaysFrom: "2026-10-26", previousWeekdays: null });
  });
  it("no change in the effective days stores nothing (order doesn't matter)", () => {
    expect(weekdaysChange({ ...base, before: [5], after: [5] })).toBeNull();
    expect(weekdaysChange({ ...base, before: [4, 2], after: [2, 4] })).toBeNull();
    expect(weekdaysChange({ ...base, before: null, after: null })).toBeNull();
  });
  it("S4b-02: a record from this week keeps its days before; going back clears; an older record is replaced", () => {
    const stored = { weekdaysFrom: "2026-10-26", previousWeekdays: [1, 2, 3] };
    expect(weekdaysChange({ ...base, before: [5], after: [2, 4], stored })).toEqual({ weekdaysFrom: "2026-10-26", previousWeekdays: [1, 2, 3] });
    expect(weekdaysChange({ ...base, before: [5], after: [3, 1, 2], stored })).toEqual({ weekdaysFrom: null, previousWeekdays: null });
    expect(weekdaysChange({ ...base, before: [5], after: null, stored: { weekdaysFrom: "2026-10-26", previousWeekdays: null } })).toEqual({ weekdaysFrom: null, previousWeekdays: null });
    expect(weekdaysChange({ ...base, before: [5], after: [2], stored: { ...stored, weekdaysFrom: "2026-10-19" } })).toEqual({ weekdaysFrom: "2026-10-26", previousWeekdays: [5] });
  });
  it("S7-11: following (null) and an explicit list of the family's school days are the same days, both ways", () => {
    const school = [1, 2, 3, 4, 5];
    expect(weekdaysChange({ ...base, before: null, after: [5, 4, 3, 2, 1], schoolDays: school })).toBeNull();
    expect(weekdaysChange({ ...base, before: school, after: null, schoolDays: school })).toBeNull();
    // A real change still stores its history, and without schoolDays null stays "unknown".
    expect(weekdaysChange({ ...base, before: null, after: [1, 2, 3], schoolDays: school })).toEqual({ weekdaysFrom: "2026-10-26", previousWeekdays: null });
    expect(weekdaysChange({ ...base, before: null, after: school })).toEqual({ weekdaysFrom: "2026-10-26", previousWeekdays: null });
    // Going back to the days the past was planned on (null, i.e. the school days) clears this week's record.
    expect(weekdaysChange({ ...base, before: [1, 2, 3], after: school, schoolDays: school, stored: { weekdaysFrom: "2026-10-26", previousWeekdays: null } })).toEqual({ weekdaysFrom: null, previousWeekdays: null });
  });
  it("effective days: own, else subject, else null", () => {
    expect(effectiveWeekdays([5], [2])).toEqual([5]);
    expect(effectiveWeekdays(null, [2])).toEqual([2]);
    expect(effectiveWeekdays(null, null)).toBeNull();
  });
});
