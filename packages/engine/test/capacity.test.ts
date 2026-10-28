import { describe, expect, it } from "vitest";
import { buildCapacityModel, ruleFactor, toDayNumber, type RecurringEvent } from "../src";
import { MON_FRI } from "./helpers";

const d = toDayNumber;
const coop: RecurringEvent = {
  id: "coop", childIds: ["frank", "margaret"], weekdays: [2], capacityFraction: 0.5,
  subjectRules: { lit: "skip", math: "lighter", music: "normal" },
};

describe("capacity", () => {
  it("rule factors: skip 0, lighter 1 - fraction, normal 1", () => {
    expect(ruleFactor("skip", 0.5)).toBe(0);
    expect(ruleFactor("lighter", 0.25)).toBe(0.75);
    expect(ruleFactor("normal", 0.9)).toBe(1);
    expect(ruleFactor("lighter", 1.5)).toBe(0); // clamped
    expect(ruleFactor("lighter", -1)).toBe(1); // clamped
    expect(ruleFactor("lighter", Number.NaN)).toBe(1);
  });

  it("weekends are 0, weekdays 1", () => {
    const m = buildCapacityModel(MON_FRI);
    expect(m.capacity(d("2026-09-12"), "frank", "lit")).toBe(0); // Sat
    expect(m.capacity(d("2026-09-13"), "frank", "lit")).toBe(0); // Sun
    expect(m.capacity(d("2026-09-14"), "frank", "lit")).toBe(1); // Mon
  });

  it("custom school days (4-day week, Saturday school)", () => {
    const m = buildCapacityModel({ weekStart: "mon", schoolDays: [1, 2, 3, 4, 6] });
    expect(m.capacity(d("2026-09-18"), "frank", "lit")).toBe(0); // Fri off
    expect(m.capacity(d("2026-09-19"), "frank", "lit")).toBe(1); // Sat on
  });

  it("family blocks hit everyone; child blocks hit only that child", () => {
    const m = buildCapacityModel(MON_FRI, [], [
      { id: "xmas", start: "2026-12-21", end: "2027-01-01", kind: "vacation" },
      { id: "sick", start: "2026-09-14", end: "2026-09-14", childIds: ["frank"], kind: "sick" },
    ]);
    expect(m.capacity(d("2026-12-21"), "margaret", "lit")).toBe(0);
    expect(m.capacity(d("2027-01-01"), "frank", "math")).toBe(0);
    expect(m.capacity(d("2027-01-04"), "frank", "math")).toBe(1);
    expect(m.capacity(d("2026-09-14"), "frank", "lit")).toBe(0);
    expect(m.capacity(d("2026-09-14"), "margaret", "lit")).toBe(1);
    expect(m.schoolDay(d("2026-09-14"), "frank")).toBe(false);
  });

  it("events apply per subject and only to their children", () => {
    const m = buildCapacityModel(MON_FRI, [coop, { id: "piano", childIds: ["frank"], weekdays: [5], capacityFraction: 0.25, subjectRules: { music: "skip", math: "lighter" } }]);
    const tue = d("2026-09-15");
    const fri = d("2026-09-18");
    expect(m.capacity(tue, "frank", "lit")).toBe(0);
    expect(m.capacity(tue, "frank", "math")).toBe(0.5);
    expect(m.capacity(tue, "frank", "music")).toBe(1);
    expect(m.capacity(tue, "frank", "history")).toBe(1); // not listed -> normal
    expect(m.capacity(fri, "frank", "math")).toBe(0.75);
    expect(m.capacity(fri, "margaret", "math")).toBe(1); // piano is Frank's
    expect(m.schoolDay(tue, "frank")).toBe(true); // co-op day is still a school day
  });

  it("several events on one day multiply", () => {
    const m = buildCapacityModel(MON_FRI, [
      { id: "a", childIds: ["frank"], weekdays: [3], capacityFraction: 0.5, subjectRules: { math: "lighter" } },
      { id: "b", childIds: ["frank"], weekdays: [3], capacityFraction: 0.5, subjectRules: { math: "lighter" } },
    ]);
    expect(m.capacity(d("2026-09-16"), "frank", "math")).toBe(0.25);
  });

  it("defaultRule covers unlisted subjects ('same for all')", () => {
    const m = buildCapacityModel(MON_FRI, [{ id: "trip", childIds: ["frank"], weekdays: [1], capacityFraction: 1, subjectRules: { music: "normal" }, defaultRule: "skip" }]);
    expect(m.capacity(d("2026-09-14"), "frank", "lit")).toBe(0);
    expect(m.capacity(d("2026-09-14"), "frank", "music")).toBe(1);
  });

  it("event start/end bound when it applies", () => {
    const m = buildCapacityModel(MON_FRI, [{ ...coop, start: "2026-09-08", end: "2026-09-22" }]);
    expect(m.capacity(d("2026-09-01"), "frank", "lit")).toBe(1); // before start
    expect(m.capacity(d("2026-09-08"), "frank", "lit")).toBe(0);
    expect(m.capacity(d("2026-09-22"), "frank", "lit")).toBe(0);
    expect(m.capacity(d("2026-09-29"), "frank", "lit")).toBe(1); // after end
  });

  it("an event with no children applies to the whole family", () => {
    const m = buildCapacityModel(MON_FRI, [{ ...coop, childIds: [] }]);
    expect(m.capacity(d("2026-09-15"), "anyone", "lit")).toBe(0);
  });

  it("blocked beats events (no negative or >1 capacity)", () => {
    const m = buildCapacityModel(MON_FRI, [coop], [{ id: "b", start: "2026-09-15", end: "2026-09-15" }]);
    expect(m.capacity(d("2026-09-15"), "frank", "music")).toBe(0);
  });
});
