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
  it("effective days: own, else subject, else null", () => {
    expect(effectiveWeekdays([5], [2])).toEqual([5]);
    expect(effectiveWeekdays(null, [2])).toEqual([2]);
    expect(effectiveWeekdays(null, null)).toBeNull();
  });
});
