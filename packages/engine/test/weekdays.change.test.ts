/** S4-01b: changing weekdays mid-assignment keeps progress to date and replans only what is left on the new days. */
import { describe, expect, it } from "vitest";
import { planChild, type Assignment, type ChildPlan, type PlanContext, type ProgressCheckIn, type Weekday } from "../src";
import { book, expectConserved, expectSane, MON_FRI, unitsBetween, unitsOn } from "./helpers";

// 100 pages, Mon 5 Oct to Fri 27 Nov: 40 school days (2.5 a day). The days change on Mon 26 Oct.
const a = (over: Partial<Assignment> = {}) => book({ start: "2026-10-05", end: "2026-11-27", ...over });
const FROM = "2026-10-26";
const plan = (asg: Assignment, over: Partial<PlanContext> = {}): ChildPlan => planChild(asg, "frank", { calendar: MON_FRI, asOf: "2026-10-29", ...over });
const before = (p: ChildPlan, date = FROM) => p.days.filter((d) => d.date < date).map((d) => [d.date, d.units]);
const working = (p: ChildPlan, from: string) => p.days.filter((d) => d.date >= from && d.units > 1e-9).map((d) => d.date);
const FRIDAYS = ["2026-10-30", "2026-11-06", "2026-11-13", "2026-11-20", "2026-11-27"];

describe("a weekday change after the start (S4-01b)", () => {
  it("Mon-Fri to Fridays only: every past day stays, the rest goes on Fridays from this week", () => {
    const none = plan(a());
    const p = plan(a({ weekdays: [5], weekdaysFrom: FROM, previousWeekdays: null }));
    expect(before(p)).toEqual(before(none));
    expect(p.days.find((d) => d.date === "2026-10-25")!.position).toBeCloseTo(37.5, 9);
    expect(working(p, FROM)).toEqual(FRIDAYS);
    for (const d of FRIDAYS) expect(unitsOn(p, d)).toBeCloseTo(62.5 / 5, 9);
    expect(unitsBetween(p, FROM, "2026-10-29")).toBe(0);
    expect(p.end).toBe("2026-11-27");
    expect(p.weekdays).toEqual([5]);
    expectSane(p);
    expectConserved(p);
  });

  it("without the change date the new days would re-spread the past (S4-01 alone)", () => {
    const whole = plan(a({ weekdays: [5] }));
    expect(unitsOn(whole, "2026-10-09")).toBeCloseTo(12.5, 9);
  });

  it("a switch back: Fridays only before, every school day from this week", () => {
    const p = plan(a({ weekdays: null, weekdaysFrom: FROM, previousWeekdays: [5] }));
    // Before: Fridays only, 100 / 8 = 12.5 each; Oct 9, 16 and 23 are 37.5.
    expect(working(p, "2026-10-05")).toEqual(["2026-10-09", "2026-10-16", "2026-10-23", ...working(p, FROM)]);
    expect(p.days.find((d) => d.date === "2026-10-25")!.position).toBeCloseTo(37.5, 9);
    // Then 62.5 over the 25 school days from Oct 26.
    expect(unitsOn(p, "2026-10-26")).toBeCloseTo(2.5, 9);
    expect(unitsOn(p, "2026-11-27")).toBeCloseTo(2.5, 9);
    expectConserved(p);
  });

  it("a subject-default change on an uncustomised assignment behaves the same", () => {
    const viaSubject = plan(a({ weekdaysFrom: FROM, previousWeekdays: null }), { subjectWeekdays: [{ subjectId: "lit", weekdays: [5] }] });
    const own = plan(a({ weekdays: [5], weekdaysFrom: FROM, previousWeekdays: null }));
    expect(viaSubject.days.map((d) => d.units)).toEqual(own.days.map((d) => d.units));
    expect(viaSubject.weekdaysSource).toBe("subject");
  });

  it("a change on or before the start behaves exactly as S4-01, and so does one that changes nothing", () => {
    const plain = plan(a({ weekdays: [5] }));
    expect(plan(a({ weekdays: [5], weekdaysFrom: "2026-10-05", previousWeekdays: null })).days).toEqual(plain.days);
    expect(plan(a({ weekdays: [5], weekdaysFrom: "2026-09-28", previousWeekdays: [1, 2] })).days).toEqual(plain.days);
    expect(plan(a({ weekdays: [5], weekdaysFrom: FROM, previousWeekdays: [5] })).days).toEqual(plain.days);
    expect(plan(a({ weekdays: [5], weekdaysFrom: "nonsense", previousWeekdays: null })).days).toEqual(plain.days);
    expect(plan(a({ weekdays: [5], previousWeekdays: null })).days).toEqual(plain.days);
  });

  it("a change with an earlier week check-in keeps the check-in's position", () => {
    const ci: ProgressCheckIn = { assignmentId: "a1", childId: "frank", weekStart: "2026-10-19", position: 30, mode: "keepEndDate" };
    const p = plan(a({ weekdays: [5], weekdaysFrom: FROM, previousWeekdays: null }), { checkIns: [ci] });
    expect(p.days.find((d) => d.date === "2026-10-25")!.position).toBeCloseTo(30, 9);
    expect(working(p, FROM)).toEqual(FRIDAYS);
    expect(unitsOn(p, "2026-10-30")).toBeCloseTo(70 / 5, 9);
    expectConserved(p);
  });

  it("a check-in in the change week or later wins", () => {
    const ci: ProgressCheckIn = { assignmentId: "a1", childId: "frank", weekStart: FROM, position: 50, mode: "keepEndDate" };
    const p = plan(a({ weekdays: [5], weekdaysFrom: FROM, previousWeekdays: null }), { checkIns: [ci] });
    expect(p.days.find((d) => d.date === "2026-11-01")!.position).toBeCloseTo(50, 9);
    expect(working(p, "2026-11-02")).toEqual(["2026-11-06", "2026-11-13", "2026-11-20", "2026-11-27"]);
    expect(unitsOn(p, "2026-11-06")).toBeCloseTo(50 / 4, 9);
    expectConserved(p);
  });

  it("works together with a missed day", () => {
    const blocked = [{ id: "m", start: "2026-10-22", end: "2026-10-22", kind: "missed" }];
    const p = plan(a({ weekdays: [5], weekdaysFrom: FROM, previousWeekdays: null }), { blocked });
    expect(unitsOn(p, "2026-10-22")).toBe(0);
    expect(working(p, FROM)).toEqual(FRIDAYS);
    expectConserved(p);
    expect(p.days.at(-1)!.position).toBeCloseTo(100, 9);
  });

  it("every day of the week list is fine: Weekday type and sorted output", () => {
    const days: Weekday[] = [4, 2];
    expect(plan(a({ weekdays: days, weekdaysFrom: FROM, previousWeekdays: null })).weekdays).toEqual([2, 4]);
  });
});
