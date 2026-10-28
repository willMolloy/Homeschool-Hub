import { DEFAULT_WEIGHT_PER_UNIT, MAX_WEIGHT_PER_UNIT } from "@hh/engine";
import { describe, expect, it } from "vitest";
import { HttpError } from "../src/http/errors";
import {
  CapacityFraction, checkDateOrder, IdList, LocalDate, MAX_ASSIGNMENT_DAYS, MAX_BLOCKED_DAYS,
  MAX_TOTAL_UNITS, Title, TotalUnits, Weekdays, WeightPerUnit,
} from "../src/http/scheduleLimits";

const fromJson = (s: string) => (JSON.parse(`{"v":${s}}`) as { v: unknown }).v;
const ok = (schema: { safeParse: (v: unknown) => { success: boolean } }, v: unknown) => schema.safeParse(v).success;

describe("numeric limits", () => {
  it("JSON 1e309 really is Infinity (the case we guard)", () => {
    expect(fromJson("1e309")).toBe(Infinity);
  });

  it.each([1, 0.01, 12.5, 99999.99, MAX_TOTAL_UNITS, 0.1 + 0.2])("TotalUnits accepts %s", (v) => expect(ok(TotalUnits, v)).toBe(true));
  it.each([0, -1, 0.001, 1e-3, 100000.01, Infinity, -Infinity, NaN, fromJson("1e309"), "10", null])("TotalUnits rejects %s", (v) =>
    expect(ok(TotalUnits, v)).toBe(false));

  it.each([0.01, 0.5, 2, 30, MAX_WEIGHT_PER_UNIT])("WeightPerUnit accepts %s", (v) => expect(ok(WeightPerUnit, v)).toBe(true));
  it.each([0, -2, 100.01, 0.005, Infinity, NaN, fromJson("1e309"), "2"])("WeightPerUnit rejects %s", (v) =>
    expect(ok(WeightPerUnit, v)).toBe(false));

  it.each([0, 0.5, 0.333, 1])("CapacityFraction accepts %s", (v) => expect(ok(CapacityFraction, v)).toBe(true));
  it.each([-0.1, 1.001, 0.3333, Infinity, NaN])("CapacityFraction rejects %s", (v) => expect(ok(CapacityFraction, v)).toBe(false));

  it("the worst accepted assignment stays finite and fits the columns", () => {
    const thickness = MAX_TOTAL_UNITS * MAX_WEIGHT_PER_UNIT;
    expect(Number.isFinite(thickness)).toBe(true);
    expect(MAX_TOTAL_UNITS).toBeLessThan(1e8); // numeric(10,2)
    expect(MAX_WEIGHT_PER_UNIT).toBeLessThan(1e4); // numeric(6,2)
    // Per-day thickness over the shortest range (1 day), at the largest built-in weight, is still finite.
    expect(Number.isFinite((MAX_TOTAL_UNITS * Math.max(...Object.values(DEFAULT_WEIGHT_PER_UNIT))) / 1)).toBe(true);
  });
});

describe("LocalDate", () => {
  it.each(["2026-10-28", "2000-01-01", "2100-12-31", "2028-02-29"])("accepts %s", (v) => expect(ok(LocalDate, v)).toBe(true));
  it.each(["2026-02-30", "2027-02-29", "1999-12-31", "2101-01-01", "2026-1-5", "20261028", "", 20261028, null, "2026-10-28T00:00"])(
    "rejects %j", (v) => expect(ok(LocalDate, v)).toBe(false));
});

describe("Weekdays", () => {
  it("sorts and accepts 1–7 distinct days", () => {
    expect(Weekdays.parse([5, 1, 3])).toEqual([1, 3, 5]);
    expect(Weekdays.parse([0, 1, 2, 3, 4, 5, 6])).toHaveLength(7);
  });
  it.each([[[]], [[7]], [[-1]], [[1, 1]], [[1.5]], [["1"]], [[0, 1, 2, 3, 4, 5, 6, 0]]])("rejects %j", (v) =>
    expect(ok(Weekdays, v)).toBe(false));
});

describe("Title", () => {
  it("trims and accepts up to 120", () => {
    expect(Title.parse("  Story of the World  ")).toBe("Story of the World");
    expect(ok(Title, "x".repeat(120))).toBe(true);
  });
  it.each(["", "   ", "x".repeat(121), "a\u0000b", 5])("rejects %j", (v) => expect(ok(Title, v)).toBe(false));
});

describe("IdList", () => {
  const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
  it("accepts distinct uuids and lower-cases them", () => {
    expect(IdList().parse([id(1).toUpperCase(), id(2)])).toEqual([id(1), id(2)]);
    expect(ok(IdList(), [])).toBe(true);
  });
  it("rejects duplicates (case-insensitive), non-uuids and too many", () => {
    expect(ok(IdList(), [id(1), id(1).toUpperCase()])).toBe(false);
    expect(ok(IdList(), ["nope"])).toBe(false);
    expect(ok(IdList(), Array.from({ length: 51 }, (_, i) => id(i)))).toBe(false);
    expect(ok(IdList(3), [id(1), id(2), id(3), id(4)])).toBe(false);
  });
});

describe("checkDateOrder", () => {
  const code = (fn: () => void) => {
    try {
      fn();
      return "ok";
    } catch (e) {
      return e instanceof HttpError ? `${e.statusCode} ${e.code}` : "other";
    }
  };
  it("same day and the exact max are fine", () => {
    expect(code(() => checkDateOrder("2026-10-28", "2026-10-28", 1))).toBe("ok");
    expect(code(() => checkDateOrder("2026-01-01", "2026-12-31", 365))).toBe("ok");
    expect(code(() => checkDateOrder("2026-08-01", "2029-07-31", MAX_ASSIGNMENT_DAYS))).toBe("ok");
  });
  it("end before start, or one day too long → 400 invalid_range", () => {
    expect(code(() => checkDateOrder("2026-10-28", "2026-10-27", 10))).toBe("400 invalid_range");
    expect(code(() => checkDateOrder("2026-01-01", "2027-01-02", MAX_BLOCKED_DAYS))).toBe("400 invalid_range");
  });
});
