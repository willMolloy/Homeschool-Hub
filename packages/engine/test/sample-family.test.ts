/** Parity with the prototype on its own sample family, where the prototype has no known bug. */
import { describe, expect, it } from "vitest";
import * as proto from "./fixtures/proto-engine";
import * as protoData from "./fixtures/proto-data";
import * as S from "./fixtures/sample-family";
import { aggregate, mergeLane, planAll, planAssignment, planChild, toDayNumber, fromDayNumber } from "../src";
import { expectConserved, expectSane, unitsBetween } from "./helpers";

const ctx = { calendar: S.calendar, events: S.events, blocked: S.blocked };

describe("sample family (proto data.ts)", () => {
  it("every plan is sane and conserves its units", () => {
    for (const p of planAll(S.assignments, ctx)) {
      expectSane(p);
      expectConserved(p);
      expect(p.unplacedUnits).toBe(0);
    }
  });

  it("matches the prototype day by day for all 14 assignments (no overrides)", () => {
    for (const pa of protoData.assignments) {
      const pp = proto.plan(pa, protoData.events);
      const na = S.assignments.find((x) => x.id === pa.id)!;
      for (const np of planAssignment(na, ctx)) {
        for (const d of np.days) {
          const i = proto.dayOf(d.date);
          expect(d.units, `${pa.id} ${np.childId} ${d.date}`).toBeCloseTo(pp.daily[i] ?? 0, 9);
        }
      }
    }
  });

  it("Treasure Island: co-op Tuesdays skipped -> 22.5 pages/day, 90 pages in the week of Oct 26", () => {
    const p = planChild(S.assignments.find((a) => a.id === "ti")!, "frank", ctx);
    expect(p.baseRate).toBeCloseTo(22.5);
    expect(unitsBetween(p, "2026-10-26", "2026-10-30")).toBeCloseTo(90);
  });

  it("Crusoe and Heidi don't schedule anything over Christmas break", () => {
    for (const p of planAll(S.assignments, ctx)) expect(unitsBetween(p, "2026-12-21", "2027-01-01")).toBe(0);
  });

  it("weekly lane invariant holds for every child's lane in every week", () => {
    const plans = planAll(S.assignments, ctx);
    for (const child of ["frank", "margaret"]) {
      for (const subject of ["lit", "math", "hist", "sci", "music"]) {
        const lane = mergeLane(plans.filter((p) => p.childId === child && S.assignments.find((a) => a.id === p.assignmentId)!.subjectId === subject));
        const w = aggregate(lane, "weekly", "mon");
        for (const d of w) expect(Number.isFinite(d.value)).toBe(true);
      }
    }
  });

  it("dates helper sanity on the school year", () => {
    expect(fromDayNumber(toDayNumber("2027-05-21"))).toBe("2027-05-21");
  });
});
