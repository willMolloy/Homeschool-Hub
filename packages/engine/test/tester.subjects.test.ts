/**
 * Tester round 4 (S2b-37): subject defaults and precedence on the engine side. Independent of weights.subject.test.ts.
 * API/DB half: apps/api/test/tester4.subjects.test.ts.
 */
import { describe, expect, it } from "vitest";
import { DEFAULT_WEIGHT_PER_UNIT, planAll, suggestWeight, UNIT_TYPES, type SubjectWeight, type UnitType } from "../src";
import { book, expectSane, MON_FRI } from "./helpers";

const sw = (unitType: UnitType, weightPerUnit: number, subjectId = "lit"): SubjectWeight => ({ subjectId, unitType, weightPerUnit });
const plan = (over: Parameters<typeof book>[0], subjectWeights: SubjectWeight[] = []) => {
  const [p] = planAll([book(over)], { calendar: MON_FRI, subjectWeights });
  expectSane(p!);
  for (const d of p!.days) expect(d.thickness).toBeCloseTo(d.units * p!.weightPerUnit, 9);
  return { w: p!.weightPerUnit, src: p!.weightSource };
};

describe("case 1: precedence matrix", () => {
  describe.each(["pages", "chapters"] as const)("%s", (unitType) => {
    const builtIn = DEFAULT_WEIGHT_PER_UNIT[unitType];
    it("plan: explicit > subject > built-in", () => {
      expect(plan({ unitType, weightPerUnit: 3 }, [sw(unitType, 2)])).toEqual({ w: 3, src: "assignment" });
      expect(plan({ unitType, weightPerUnit: null }, [sw(unitType, 2)])).toEqual({ w: 2, src: "subject" });
      expect(plan({ unitType }, [])).toEqual({ w: builtIn, src: "default" });
    });
    it("suggestion: learned beats subject (D19), subject beats built-in", () => {
      const sd = { unitType, weightPerUnit: 2 };
      expect(suggestWeight({ unitType, perChild: [{ childId: "a", usual: 1.4 }], subjectDefault: sd })).toMatchObject({ weight: 1.4, source: "child" });
      expect(suggestWeight({ unitType, perChild: [{ childId: "a", usual: null }], subjectDefault: sd })).toMatchObject({ weight: 2, source: "subject" });
      expect(suggestWeight({ unitType, perChild: [{ childId: "a", usual: null }], subjectDefault: null })).toMatchObject({ weight: builtIn, source: "builtin" });
    });
  });
  it.each(["lessons", "minutes"] as const)("%s: a usual weight is ignored (subject, else built-in)", (unitType) => {
    const perChild = [{ childId: "a", usual: 40 }, { childId: "b", usual: 2 }];
    expect(suggestWeight({ unitType, perChild, subjectDefault: { unitType, weightPerUnit: 20 } }))
      .toEqual({ weight: 20, source: "subject", childIdsWithHistory: [], childIdsWithout: ["a", "b"] });
    expect(suggestWeight({ unitType, perChild, subjectDefault: null })).toMatchObject({ weight: DEFAULT_WEIGHT_PER_UNIT[unitType], source: "builtin" });
  });
});

describe("case 2: live subject default (D20)", () => {
  it("the same null-weight assignment follows the subject's current value; an explicit one never does", () => {
    for (const w of [2, 3.5, 0.01, 100]) {
      expect(plan({ weightPerUnit: null }, [sw("pages", w)])).toEqual({ w, src: "subject" });
      expect(plan({ weightPerUnit: 1.6 }, [sw("pages", w)])).toEqual({ w: 1.6, src: "assignment" });
    }
  });
  it("another subject's default doesn't leak in", () => {
    expect(plan({ subjectId: "lit" }, [sw("pages", 4, "math")])).toEqual({ w: 1, src: "default" });
  });
  it("a bad stored subject value falls back to the built-in", () => {
    for (const bad of [0, -1, 101, 1.234, Number.NaN]) expect(plan({}, [sw("pages", bad)])).toEqual({ w: 1, src: "default" });
  });
});

describe("case 3: unit mismatch", () => {
  it.each(UNIT_TYPES.flatMap((a) => UNIT_TYPES.filter((b) => b !== a).map((b) => [a, b] as const)))(
    "a %s default doesn't apply to a %s assignment",
    (subjectUnit, unitType) => {
      expect(plan({ unitType }, [sw(subjectUnit, 7)])).toEqual({ w: DEFAULT_WEIGHT_PER_UNIT[unitType], src: "default" });
      expect(suggestWeight({ unitType, perChild: [], subjectDefault: { unitType: subjectUnit, weightPerUnit: 7 } }).source).toBe("builtin");
    });
});

describe("case 6: multi-child + subject, no history", () => {
  it("→ the subject default; both children are listed without history", () => {
    expect(suggestWeight({ unitType: "pages", perChild: [{ childId: "a", usual: null }, { childId: "b", usual: null }], subjectDefault: { unitType: "pages", weightPerUnit: 2.5 } }))
      .toEqual({ weight: 2.5, source: "subject", childIdsWithHistory: [], childIdsWithout: ["a", "b"] });
    const plans = planAll([book({ childIds: ["a", "b"] })], { calendar: MON_FRI, subjectWeights: [sw("pages", 2.5)] });
    expect(plans.map((p) => [p.childId, p.weightPerUnit, p.weightSource])).toEqual([["a", 2.5, "subject"], ["b", 2.5, "subject"]]);
  });
});
