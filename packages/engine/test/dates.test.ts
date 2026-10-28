import { describe, expect, it } from "vitest";
import {
  addDays, civilFromDays, dateRange, daysFromCivil, diffDays, EngineInputError, fromDayNumber, isLeapYear,
  isValidLocalDate, toDayNumber, weekdayOf, weekStartOf,
} from "../src";

describe("local date math", () => {
  it("day 0 is 1970-01-01, a Thursday", () => {
    expect(toDayNumber("1970-01-01")).toBe(0);
    expect(weekdayOf("1970-01-01")).toBe(4);
  });

  it("round-trips every day from 1999 through 2101", () => {
    for (let n = toDayNumber("1999-01-01"); n <= toDayNumber("2101-12-31"); n += 1) {
      const s = fromDayNumber(n);
      expect(toDayNumber(s)).toBe(n);
      const [y, m, d] = civilFromDays(n);
      expect(daysFromCivil(y, m, d)).toBe(n);
    }
  });

  it("knows leap years (4, 100, 400 rules)", () => {
    expect(isLeapYear(2024)).toBe(true);
    expect(isLeapYear(2026)).toBe(false);
    expect(isLeapYear(2028)).toBe(true);
    expect(isLeapYear(2100)).toBe(false);
    expect(isLeapYear(2000)).toBe(true);
  });

  it("Feb 29 exists only in leap years", () => {
    expect(isValidLocalDate("2028-02-29")).toBe(true);
    expect(isValidLocalDate("2027-02-29")).toBe(false);
    expect(isValidLocalDate("2100-02-29")).toBe(false);
    expect(isValidLocalDate("2000-02-29")).toBe(true);
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2028-02-29", 1)).toBe("2028-03-01");
    expect(addDays("2027-02-28", 1)).toBe("2027-03-01");
    expect(diffDays("2028-02-01", "2028-03-01")).toBe(29);
    expect(diffDays("2027-02-01", "2027-03-01")).toBe(28);
  });

  it("rejects malformed dates instead of guessing", () => {
    for (const bad of ["2026-9-1", "2026-13-01", "2026-00-10", "2026-04-31", "20260901", "2026-09-01T00:00:00Z", "", null, 20260901]) {
      expect(isValidLocalDate(bad)).toBe(false);
    }
    expect(() => toDayNumber("2027-02-29")).toThrow(EngineInputError);
  });

  it("crosses month and year boundaries", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2027-01-01", -1)).toBe("2026-12-31");
    expect(dateRange("2026-12-30", "2027-01-02")).toEqual(["2026-12-30", "2026-12-31", "2027-01-01", "2027-01-02"]);
    expect(dateRange("2027-01-02", "2026-12-30")).toEqual([]);
  });

  it("DST weeks still have exactly 7 calendar days (US spring forward / fall back)", () => {
    // US DST 2026: starts Sun Mar 8, ends Sun Nov 1. 2027: Mar 14, Nov 7.
    for (const [from, to] of [["2026-03-08", "2026-03-15"], ["2026-11-01", "2026-11-08"], ["2027-03-14", "2027-03-21"], ["2027-11-07", "2027-11-14"]]) {
      expect(diffDays(from!, to!)).toBe(7);
      expect(dateRange(from!, addDays(from!, 6))).toHaveLength(7);
    }
    expect(weekdayOf("2026-03-08")).toBe(0);
    expect(weekdayOf("2026-03-09")).toBe(1);
    expect(weekdayOf("2026-11-02")).toBe(1);
    expect(addDays("2026-03-07", 1)).toBe("2026-03-08");
    expect(addDays("2026-10-31", 2)).toBe("2026-11-02");
  });

  it("weekStartOf respects Mon vs Sun weeks", () => {
    // Wed Sep 16 2026
    expect(weekStartOf("2026-09-16", "mon")).toBe("2026-09-14");
    expect(weekStartOf("2026-09-16", "sun")).toBe("2026-09-13");
    // Sunday itself
    expect(weekStartOf("2026-09-13", "mon")).toBe("2026-09-07");
    expect(weekStartOf("2026-09-13", "sun")).toBe("2026-09-13");
    // Monday itself
    expect(weekStartOf("2026-09-14", "mon")).toBe("2026-09-14");
    expect(weekStartOf("2026-09-14", "sun")).toBe("2026-09-13");
    // across a year boundary
    expect(weekStartOf("2027-01-01", "mon")).toBe("2026-12-28");
    expect(weekStartOf("2027-01-01", "sun")).toBe("2026-12-27");
  });

  it("does not depend on the process time zone", () => {
    // Engine never builds a Date; the same inputs give the same day numbers under any TZ.
    // `npm run test:tz` reruns the whole suite under several zones to prove it.
    expect(toDayNumber("2026-11-01")).toBe(20758);
    expect(fromDayNumber(20758)).toBe("2026-11-01");
  });
});
