/** S2b-32: planChild resolves weights assignment → subject (same unit) → built-in. */
import { describe, expect, it } from "vitest";
import { planAll, planChild, type PlanContext, type SubjectWeight } from "../src";
import * as fam from "./fixtures/sample-family";
import { MON_FRI, book } from "./helpers";

const math = (over: Partial<SubjectWeight> = {}): SubjectWeight => ({ subjectId: "math", unitType: "lessons", weightPerUnit: 20, ...over });
const lessons = book({ subjectId: "math", unitType: "lessons", totalUnits: 10, weightPerUnit: null });
const ctx = (subjectWeights?: SubjectWeight[]): PlanContext => ({ calendar: MON_FRI, ...(subjectWeights ? { subjectWeights } : {}) });

describe("subject default weights in the plan", () => {
  it("a null-weight lessons assignment in Math (lessons 20) → 20 a lesson, source subject", () => {
    const p = planChild(lessons, "frank", ctx([math()]));
    expect(p.weightPerUnit).toBe(20);
    expect(p.weightSource).toBe("subject");
    for (const d of p.days) expect(d.thickness).toBeCloseTo(d.units * 20, 9);
  });

  it("an explicit 12 beats Math's 20", () => {
    const p = planChild({ ...lessons, weightPerUnit: 12 }, "frank", ctx([math()]));
    expect([p.weightPerUnit, p.weightSource]).toEqual([12, "assignment"]);
  });

  it("Math's default for minutes doesn't apply to a lessons assignment", () => {
    const p = planChild(lessons, "frank", ctx([math({ unitType: "minutes", weightPerUnit: 0.75 })]));
    expect([p.weightPerUnit, p.weightSource]).toEqual([15, "default"]);
  });

  it("picks the entry for the assignment's own subject and unit", () => {
    const p = planChild(lessons, "frank", ctx([math({ subjectId: "lit", weightPerUnit: 3 }), math({ unitType: "pages", weightPerUnit: 4 }), math({ weightPerUnit: 18 })]));
    expect(p.weightPerUnit).toBe(18);
  });

  it("an invalid stored default falls back to the built-in", () => {
    expect(planChild(lessons, "frank", ctx([math({ weightPerUnit: 0 })])).weightSource).toBe("default");
  });

  it("no subject weights → identical to before, over the fixtures", () => {
    const base: PlanContext = { calendar: fam.calendar, events: fam.events, blocked: fam.blocked, asOf: "2026-09-01" };
    const without = planAll(fam.assignments, base);
    expect(planAll(fam.assignments, { ...base, subjectWeights: [] })).toEqual(without);
    // Defaults for subjects or units nothing uses change nothing either.
    expect(planAll(fam.assignments, { ...base, subjectWeights: [{ subjectId: "nope", unitType: "pages", weightPerUnit: 9 }] })).toEqual(without);
    // And weighted fixture assignments ignore a matching default entirely.
    const weighted = fam.assignments.filter((a) => a.weightPerUnit != null);
    expect(weighted.length).toBeGreaterThan(0);
    const all = weighted.map((a) => ({ subjectId: a.subjectId, unitType: a.unitType, weightPerUnit: 99 }));
    expect(planAll(weighted, { ...base, subjectWeights: all })).toEqual(planAll(weighted, base));
  });
});
