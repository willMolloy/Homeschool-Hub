/**
 * Tester round 4 (S2b-37), case 7: each thickness-picker preset, saved as the assignment's weight, plans at
 * built-in × multiplier thickness per unit. API/DB half: apps/api/test/tester4.subjects.test.ts.
 */
import { DEFAULT_WEIGHT_PER_UNIT, planAll, UNIT_TYPES, type Assignment, type FamilyCalendar } from "@hh/engine";
import { describe, expect, it } from "vitest";
import { PRESETS, presetFor, presetWeight } from "../src/components/weightPresets";

const MON_FRI: FamilyCalendar = { weekStart: "mon", schoolDays: [1, 2, 3, 4, 5] };
const a = (unitType: Assignment["unitType"], weightPerUnit: number | null): Assignment => ({
  id: "x", childIds: ["k"], subjectId: "s", title: "T", unitType, totalUnits: 100, start: "2026-09-07", end: "2026-09-18", weightPerUnit,
});

describe("tester4: picker presets → plan thickness", () => {
  it("the presets are Light ½, Normal 1, Heavy 1½, Very heavy 2", () => {
    expect(PRESETS.map((p) => [p.key, p.multiplier])).toEqual([["light", 0.5], ["normal", 1], ["heavy", 1.5], ["veryHeavy", 2]]);
  });
  it.each(UNIT_TYPES.flatMap((u) => PRESETS.map((p) => [u, p.key, p.multiplier] as const)))("%s × %s", (unitType, key, multiplier) => {
    const w = presetWeight(unitType, multiplier);
    expect(w).toBeCloseTo(DEFAULT_WEIGHT_PER_UNIT[unitType] * multiplier, 9);
    expect(presetFor(unitType, w)).toBe(key);
    const [p] = planAll([a(unitType, w)], { calendar: MON_FRI });
    expect(p!.weightSource).toBe("assignment");
    const work = p!.days.filter((d) => d.units > 0);
    expect(work.length).toBeGreaterThan(0);
    for (const d of work) expect(d.thickness).toBeCloseTo(d.units * DEFAULT_WEIGHT_PER_UNIT[unitType] * multiplier, 6);
  });
  it("None saves null: the plan uses the subject default, else the built-in", () => {
    expect(presetFor("pages", null)).toBe("none");
    expect(planAll([a("pages", null)], { calendar: MON_FRI, subjectWeights: [{ subjectId: "s", unitType: "pages", weightPerUnit: 2 }] })[0]!.weightPerUnit).toBe(2);
    expect(planAll([a("pages", null)], { calendar: MON_FRI })[0]!).toMatchObject({ weightPerUnit: 1, weightSource: "default" });
  });
});
