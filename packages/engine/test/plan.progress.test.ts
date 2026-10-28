import { describe, expect, it } from "vitest";
import { planChild, type ProgressEntry } from "../src";
import { book, expectConserved, expectSane, MON_FRI, unitsBetween, unitsOn } from "./helpers";

// 100 pages, Mon Sep 7 - Fri Sep 18 (10 days, 10/day)
const log = (date: string, units: number, childId = "frank"): ProgressEntry => ({ assignmentId: "a1", childId, date, units });

describe("progress partly logged", () => {
  it("behind: remaining is spread over the remaining days from asOf", () => {
    // Week 1 logged only 30 pages (plan said 50); today is Mon Sep 14
    const p = planChild(book(), "frank", { calendar: MON_FRI, asOf: "2026-09-14", progress: [log("2026-09-07", 10), log("2026-09-08", 20)] });
    expectSane(p);
    expectConserved(p);
    expect(p.doneUnits).toBe(30);
    expect(p.remainingUnits).toBe(70);
    expect(p.baseRate).toBeCloseTo(14);
    expect(unitsOn(p, "2026-09-14")).toBeCloseTo(14);
    // past days show what was actually logged
    expect(unitsOn(p, "2026-09-07")).toBe(10);
    expect(unitsOn(p, "2026-09-09")).toBe(0);
    expect(p.days.find((d) => d.date === "2026-09-07")!.kind).toBe("logged");
    expect(p.days.find((d) => d.date === "2026-09-14")!.kind).toBe("planned");
  });

  it("ahead: later days thin out", () => {
    const p = planChild(book(), "frank", { calendar: MON_FRI, asOf: "2026-09-14", progress: [log("2026-09-07", 80)] });
    expect(p.baseRate).toBeCloseTo(4);
    expectConserved(p);
  });

  it("finished early: complete, all future days zero", () => {
    const p = planChild(book(), "frank", { calendar: MON_FRI, asOf: "2026-09-14", progress: [log("2026-09-07", 60), log("2026-09-11", 40)] });
    expect(p.complete).toBe(true);
    expect(p.remainingUnits).toBe(0);
    expect(unitsBetween(p, "2026-09-14", "2026-09-18")).toBe(0);
    expectSane(p);
  });

  it("over-logged (more than the total): remaining clamps at 0", () => {
    const p = planChild(book(), "frank", { calendar: MON_FRI, asOf: "2026-09-14", progress: [log("2026-09-07", 130)] });
    expect(p.remainingUnits).toBe(0);
    expect(p.doneUnits).toBe(130);
    expectSane(p);
  });

  it("negative correction entries reduce done but never below 0", () => {
    const p = planChild(book(), "frank", { calendar: MON_FRI, asOf: "2026-09-14", progress: [log("2026-09-07", 20), log("2026-09-08", -5)] });
    expect(p.doneUnits).toBe(15);
    const q = planChild(book(), "frank", { calendar: MON_FRI, progress: [log("2026-09-07", -50)] });
    expect(q.doneUnits).toBe(0);
    // a day whose net log is negative draws 0, never a negative bar
    const r = planChild(book(), "frank", { calendar: MON_FRI, asOf: "2026-09-14", progress: [log("2026-09-07", 20), log("2026-09-08", -5)] });
    expect(unitsOn(r, "2026-09-08")).toBe(0);
    expect(r.doneUnits).toBe(15);
  });

  it("without asOf, logs still count toward done and the plan starts at the start date", () => {
    const p = planChild(book(), "frank", { calendar: MON_FRI, progress: [log("2026-09-07", 20)] });
    expect(p.remainingUnits).toBe(80);
    expect(p.baseRate).toBeCloseTo(8);
  });

  it("asOf before the start behaves like the start", () => {
    const p = planChild(book(), "frank", { calendar: MON_FRI, asOf: "2026-08-01" });
    expect(p.baseRate).toBeCloseTo(10);
  });

  it("asOf after the end with work left: past-end, no capacity, unplaced, no NaN", () => {
    const p = planChild(book(), "frank", { calendar: MON_FRI, asOf: "2026-09-21", progress: [log("2026-09-10", 50)] });
    expectSane(p);
    expect(p.warnings).toContain("past-end");
    expect(p.noCapacity).toBe(true);
    expect(p.unplacedUnits).toBe(50);
  });

  it("asOf on the last day puts everything left on that day", () => {
    const p = planChild(book(), "frank", { calendar: MON_FRI, asOf: "2026-09-18", progress: [log("2026-09-10", 50)] });
    expect(unitsOn(p, "2026-09-18")).toBeCloseTo(50);
  });

  it("logs dated before the start or after the end extend the returned range", () => {
    const p = planChild(book(), "frank", { calendar: MON_FRI, asOf: "2026-09-14", progress: [log("2026-09-04", 5)] });
    expect(p.days[0]!.date).toBe("2026-09-04");
    expect(unitsOn(p, "2026-09-04")).toBe(5);
    expect(p.days.find((d) => d.date === "2026-09-04")!.capacity).toBe(0);
  });

  it("several logs on one day sum (check-off + sessions)", () => {
    const p = planChild(book(), "frank", { calendar: MON_FRI, asOf: "2026-09-14", progress: [log("2026-09-08", 10), log("2026-09-08", 5)] });
    expect(unitsOn(p, "2026-09-08")).toBe(15);
  });

  it("other children's logs don't count for this child", () => {
    const a = book({ childIds: ["frank", "margaret"] });
    const p = planChild(a, "frank", { calendar: MON_FRI, asOf: "2026-09-14", progress: [log("2026-09-08", 50, "margaret")] });
    expect(p.doneUnits).toBe(0);
    expect(p.baseRate).toBeCloseTo(20);
  });

  it("progress + keepEndDate override this week", () => {
    const p = planChild(book(), "frank", {
      calendar: MON_FRI, asOf: "2026-09-14", progress: [log("2026-09-07", 40)],
      overrides: [{ assignmentId: "a1", weekStart: "2026-09-14", plannedUnits: 20, mode: "keepEndDate" }],
    });
    // 60 left; this week fixed at 20; but this week is the last week -> 40 unplaced? No: the override week is the only week left.
    expect(unitsBetween(p, "2026-09-14", "2026-09-18")).toBeCloseTo(20);
    expect(p.unplacedUnits).toBeCloseTo(40);
    expect(p.warnings).toContain("keep-no-free-capacity");
    expectConserved(p);
  });

  it("progress + pushEndDate override this week", () => {
    const p = planChild(book(), "frank", {
      calendar: MON_FRI, asOf: "2026-09-14", progress: [log("2026-09-07", 40)],
      overrides: [{ assignmentId: "a1", weekStart: "2026-09-14", plannedUnits: 20, mode: "pushEndDate" }],
    });
    // old pace = 60 / 5 = 12/day; 40 left after this week -> 3 days + 4 -> Mon Sep 21 .. Thu Sep 24
    expect(p.baseRate).toBeCloseTo(12);
    expect(p.end).toBe("2026-09-24");
    expect(unitsOn(p, "2026-09-24")).toBeCloseTo(4);
    expectConserved(p);
  });

  it("override earlier than asOf is ignored (past weeks are history)", () => {
    const p = planChild(book(), "frank", {
      calendar: MON_FRI, asOf: "2026-09-14", progress: [log("2026-09-07", 50)],
      overrides: [{ assignmentId: "a1", weekStart: "2026-09-07", plannedUnits: 5, mode: "keepEndDate" }],
    });
    expect(p.warnings).toContain("override-outside-range");
    expect(p.baseRate).toBeCloseTo(10);
  });
});
