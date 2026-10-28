import { describe, expect, it } from "vitest";
import { mergeLane, planAll, planAssignment, type Assignment, type PlanContext, type RecurringEvent } from "../src";
import { book, expectConserved, MON_FRI, unitsBetween, unitsOn } from "./helpers";

const shared: Assignment = book({ id: "hist", subjectId: "hist", childIds: ["frank", "margaret"], unitType: "lessons", totalUnits: 20 });

describe("assignments shared by several children", () => {
  it("returns one plan per child", () => {
    const plans = planAssignment(shared, { calendar: MON_FRI });
    expect(plans.map((p) => p.childId)).toEqual(["frank", "margaret"]);
    for (const p of plans) {
      expect(p.baseRate).toBeCloseTo(2);
      expectConserved(p);
    }
  });

  it("duplicate child ids are collapsed; no children = no plans", () => {
    expect(planAssignment({ ...shared, childIds: ["frank", "frank"] }, { calendar: MON_FRI })).toHaveLength(1);
    expect(planAssignment({ ...shared, childIds: [] }, { calendar: MON_FRI })).toHaveLength(0);
  });

  it("one child's sick day shifts only that child's plan", () => {
    const ctx: PlanContext = { calendar: MON_FRI, blocked: [{ id: "s", start: "2026-09-07", end: "2026-09-07", childIds: ["frank"], kind: "sick" }] };
    const [f, m] = planAssignment(shared, ctx);
    expect(unitsOn(f!, "2026-09-07")).toBe(0);
    expect(f!.baseRate).toBeCloseTo(20 / 9);
    expect(unitsOn(m!, "2026-09-07")).toBeCloseTo(2);
  });

  it("one child's event (Frank's piano) doesn't thin the other child's shared lesson", () => {
    const piano: RecurringEvent = { id: "piano", childIds: ["frank"], weekdays: [5], capacityFraction: 0.5, subjectRules: { hist: "skip" } };
    const [f, m] = planAssignment(shared, { calendar: MON_FRI, events: [piano] });
    expect(unitsOn(f!, "2026-09-11")).toBe(0);
    expect(unitsOn(m!, "2026-09-11")).toBeCloseTo(2);
  });

  it("family blocks apply to every child", () => {
    const plans = planAssignment(shared, { calendar: MON_FRI, blocked: [{ id: "v", start: "2026-09-14", end: "2026-09-18" }] });
    for (const p of plans) expect(unitsBetween(p, "2026-09-14", "2026-09-18")).toBe(0);
  });
});

describe("overlapping assignments sum in a lane", () => {
  it("two books in the same week add up per day", () => {
    const a = book({ id: "a", totalUnits: 50, weightPerUnit: 2 }); // 5/day -> thickness 10
    const b = book({ id: "b", totalUnits: 100, weightPerUnit: 1, start: "2026-09-14" }); // 20/day -> thickness 20, second week only
    const plans = planAll([a, b], { calendar: MON_FRI });
    const lane = mergeLane(plans);
    expect(lane.find((d) => d.date === "2026-09-07")!.thickness).toBeCloseTo(10);
    expect(lane.find((d) => d.date === "2026-09-14")!.thickness).toBeCloseTo(30);
  });

  it("planAll covers every child of every assignment", () => {
    const plans = planAll([book({ id: "x" }), { ...shared }], { calendar: MON_FRI });
    expect(plans.map((p) => `${p.assignmentId}:${p.childId}`)).toEqual(["x:frank", "hist:frank", "hist:margaret"]);
  });
});
