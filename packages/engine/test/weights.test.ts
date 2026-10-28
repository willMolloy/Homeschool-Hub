import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHT_PER_UNIT, MINUTES_PER_WEIGHT_POINT, isLearnedUnit, isValidWeight, weightPerUnitOf } from "../src";

describe("weight constants", () => {
  it("built-ins are page 1, chapter 10, lesson 15, minute 0.5 and frozen", () => {
    expect(DEFAULT_WEIGHT_PER_UNIT).toEqual({ pages: 1, chapters: 10, lessons: 15, minutes: 0.5 });
    expect(Object.isFrozen(DEFAULT_WEIGHT_PER_UNIT)).toBe(true);
    expect(MINUTES_PER_WEIGHT_POINT).toBe(2);
  });
});

describe("weightPerUnitOf precedence", () => {
  it("an assignment value beats a subject default", () => {
    expect(weightPerUnitOf({ unitType: "pages", weightPerUnit: 1.4 }, { unitType: "pages", weightPerUnit: 3 })).toEqual({ weight: 1.4, source: "assignment" });
  });
  it("a null assignment uses a matching subject default", () => {
    expect(weightPerUnitOf({ unitType: "pages", weightPerUnit: null }, { unitType: "pages", weightPerUnit: 3 })).toEqual({ weight: 3, source: "subject" });
  });
  it("a subject default for another unit type is ignored", () => {
    expect(weightPerUnitOf({ unitType: "pages", weightPerUnit: null }, { unitType: "lessons", weightPerUnit: 3 })).toEqual({ weight: 1, source: "default" });
  });
  it("nothing set gives the built-in", () => {
    expect(weightPerUnitOf({ unitType: "lessons" })).toEqual({ weight: 15, source: "default" });
    expect(weightPerUnitOf({ unitType: "minutes", weightPerUnit: null }, null)).toEqual({ weight: 0.5, source: "default" });
  });
  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 101])("invalid stored value %s falls through", (bad) => {
    expect(weightPerUnitOf({ unitType: "pages", weightPerUnit: bad }, { unitType: "pages", weightPerUnit: 2 })).toEqual({ weight: 2, source: "subject" });
    expect(weightPerUnitOf({ unitType: "pages", weightPerUnit: null }, { unitType: "pages", weightPerUnit: bad })).toEqual({ weight: 1, source: "default" });
  });
});

describe("isValidWeight / isLearnedUnit", () => {
  it.each([0.01, 100, 1, 1.25])("%s is valid", (n) => expect(isValidWeight(n)).toBe(true));
  it.each([0, 0.001, 100.01, 1.234, "1", Number.NaN, null, undefined])("%s is not valid", (n) => expect(isValidWeight(n)).toBe(false));
  it("pages and chapters are learned; lessons and minutes are not", () => {
    expect(isLearnedUnit("pages")).toBe(true);
    expect(isLearnedUnit("chapters")).toBe(true);
    expect(isLearnedUnit("lessons")).toBe(false);
    expect(isLearnedUnit("minutes")).toBe(false);
  });
});
