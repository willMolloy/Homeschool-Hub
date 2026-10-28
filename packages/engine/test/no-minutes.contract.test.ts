/**
 * S2b-14 contract: plans never estimate time. Thickness is relative effort; hours come only from
 * log_entry.minutes_spent. So no key named like "minutes" may appear anywhere in a serialized plan
 * (the unit type value "minutes" is data, not a key, and is allowed).
 */
import { describe, expect, it } from "vitest";
import * as S from "./fixtures/sample-family";
import { ENGINE_VERSION, aggregate, mergeLane, planAll, weeklySummary, type PlanContext } from "../src";

/** Every object key in a JSON value, with its path, depth first. */
function keysOf(v: unknown, path = "$"): string[] {
  if (Array.isArray(v)) return v.flatMap((x, i) => keysOf(x, `${path}[${i}]`));
  if (v !== null && typeof v === "object") {
    return Object.entries(v).flatMap(([k, x]) => [`${path}.${k}`, ...keysOf(x, `${path}.${k}`)]);
  }
  return [];
}
const minuteKeys = (v: unknown) => keysOf(JSON.parse(JSON.stringify(v))).filter((p) => /minute/i.test(p.slice(p.lastIndexOf(".") + 1)));

const ctx: PlanContext = {
  calendar: S.calendar, events: S.events, blocked: S.blocked, subjectWeights: S.subjectWeights,
  asOf: "2026-10-14",
  progress: [
    { assignmentId: "aesop", childId: "frank", date: "2026-09-01", units: 12 },
    { assignmentId: "piano", childId: "frank", date: "2026-09-02", units: 30 },
    { assignmentId: "violin", childId: "margaret", date: "2026-09-05", units: 20 }, // a Saturday
  ],
  overrides: [{ assignmentId: "math3", weekStart: "2026-10-19", plannedUnits: 2, mode: "pushEndDate" }],
};

describe("no minutes in a serialized plan (S2b-14)", () => {
  const plans = planAll(S.assignments, ctx);

  it("the walker finds a nested minutes key (self-test)", () => {
    expect(minuteKeys({ a: [{ b: { totalMinutes: 1 } }], minutes: 2, unitType: "minutes" })).toEqual(["$.a[0].b.totalMinutes", "$.minutes"]);
  });

  it("every ChildPlan, all unit types, logged, planned and override days included", () => {
    expect(new Set(plans.map((p) => p.unitType))).toEqual(new Set(["pages", "chapters", "lessons", "minutes"]));
    expect(new Set(plans.flatMap((p) => p.days.map((d) => d.kind)))).toEqual(new Set(["logged", "planned", "override"]));
    expect(plans.every((p) => p.engineVersion === ENGINE_VERSION)).toBe(true);
    expect(minuteKeys(plans)).toEqual([]);
  });

  it("lane series, weekly summaries and display series", () => {
    const lane = mergeLane(plans.filter((p) => p.childId === "frank" && p.subjectId === "music"));
    expect(minuteKeys(lane)).toEqual([]);
    expect(minuteKeys(weeklySummary(lane, "mon"))).toEqual([]);
    expect(minuteKeys(aggregate(lane, "weekly", "mon"))).toEqual([]);
  });

  it("thickness stays units × weight on every day", () => {
    for (const p of plans) for (const d of p.days) expect(d.thickness).toBe(d.units * p.weightPerUnit);
  });
});
