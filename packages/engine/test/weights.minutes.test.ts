/** S6-09: weight per unit from minutes a day, and back. */
import { describe, expect, it } from "vitest";
import {
  EngineInputError, MAX_WEIGHT_PER_UNIT, MIN_WEIGHT_PER_UNIT, MINUTES_PER_WEIGHT_POINT, isValidWeight, minutesPerDayFromWeight, weightFromMinutesPerDay,
} from "../src";

describe("weightFromMinutesPerDay", () => {
  it("300 pages over 60 school days (5 a day) at 30 minutes a day is weight 3", () => {
    expect(weightFromMinutesPerDay(30, 300 / 60)).toBe(3);
  });

  it("is minutes ÷ units ÷ minutes per point", () => {
    expect(MINUTES_PER_WEIGHT_POINT).toBe(2);
    expect(weightFromMinutesPerDay(60, 4)).toBe(7.5);
    expect(weightFromMinutesPerDay(15, 1)).toBe(7.5);
    expect(weightFromMinutesPerDay(45, 3)).toBe(7.5);
    expect(weightFromMinutesPerDay(30, 30)).toBe(0.5); // minutes: the built-in 0.5
  });

  it("rounds to two decimals, half away from zero", () => {
    expect(weightFromMinutesPerDay(10, 3)).toBe(1.67); // 1.6667
    expect(weightFromMinutesPerDay(1, 3)).toBe(0.17); // 0.1667
    expect(weightFromMinutesPerDay(30.1, 10)).toBe(1.51); // 1.505
  });

  it("keeps the result inside the weight limits", () => {
    expect(weightFromMinutesPerDay(1, 10_000)).toBe(MIN_WEIGHT_PER_UNIT);
    expect(weightFromMinutesPerDay(0.5, 1000)).toBe(MIN_WEIGHT_PER_UNIT);
    expect(weightFromMinutesPerDay(1440, 0.001)).toBe(MAX_WEIGHT_PER_UNIT);
    expect(weightFromMinutesPerDay(200, 1)).toBe(100);
  });

  it("always returns a valid weight", () => {
    for (const m of [1, 7, 15, 33.3, 60, 480, 1440]) for (const u of [0.01, 0.5, 1, 2.5, 7, 40, 999]) {
      expect(isValidWeight(weightFromMinutesPerDay(m, u)), `${m} min, ${u} units`).toBe(true);
    }
  });

  it.each([0, -5, NaN, Infinity])("minutes %s is an input error", (m) => {
    expect(() => weightFromMinutesPerDay(m, 5)).toThrow(EngineInputError);
  });
  it.each([0, -1, NaN, Infinity])("units a day %s is an input error", (u) => {
    expect(() => weightFromMinutesPerDay(30, u)).toThrow(EngineInputError);
  });
});

describe("minutesPerDayFromWeight", () => {
  it("is weight × units × minutes per point", () => {
    expect(minutesPerDayFromWeight(3, 5)).toBe(30);
    expect(minutesPerDayFromWeight(1, 5)).toBe(10);
    expect(minutesPerDayFromWeight(0.5, 30)).toBe(30);
    expect(minutesPerDayFromWeight(7.5, 4)).toBe(60);
  });

  it("is not rounded", () => {
    expect(minutesPerDayFromWeight(1.4, 3.3)).toBeCloseTo(9.24, 10);
  });

  it("a weight survives the round trip within rounding", () => {
    for (const w of [0.01, 0.5, 1, 1.4, 3, 7.5, 20, 100]) for (const u of [1, 2.5, 5, 10]) {
      expect(weightFromMinutesPerDay(minutesPerDayFromWeight(w, u), u)).toBe(w);
    }
  });

  it("zero stays zero; negative or non-finite input is an input error", () => {
    expect(minutesPerDayFromWeight(0, 5)).toBe(0);
    expect(minutesPerDayFromWeight(2, 0)).toBe(0);
    expect(() => minutesPerDayFromWeight(-1, 5)).toThrow(EngineInputError);
    expect(() => minutesPerDayFromWeight(1, NaN)).toThrow(EngineInputError);
  });
});
