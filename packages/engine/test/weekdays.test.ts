/** S4-01: an assignment is planned only on its weekdays (own, else subject's, else every school day). */
import { describe, expect, it } from "vitest";
import { planAssignment, planChild, validWeekdays, weekdaysOf, type Assignment, type ChildPlan, type PlanContext, type RecurringEvent, type Weekday } from "../src";
import { book, expectConserved, expectSane, MON_FRI, unitsBetween, unitsOn } from "./helpers";

const FRI: Weekday[] = [5];
const TUE_THU: Weekday[] = [2, 4];
// 12 school weeks: Mon 7 Sep to Fri 27 Nov, so 12 Fridays.
const lessons = (over: Partial<Assignment> = {}) => book({ unitType: "lessons", totalUnits: 12, end: "2026-11-27", ...over });
const ctx = (over: Partial<PlanContext> = {}): PlanContext => ({ calendar: MON_FRI, ...over });
const plan = (a: Assignment, c: PlanContext = ctx()): ChildPlan => planChild(a, "frank", c);
const working = (p: ChildPlan) => p.days.filter((d) => d.units > 1e-9).map((d) => d.date);
const fridays = (p: ChildPlan) => p.days.filter((d) => d.date >= "2026-09-07" && new Date(`${d.date}T00:00:00Z`).getUTCDay() === 5).map((d) => d.date);

describe("weekdaysOf (S4-01)", () => {
  it("own list, else the subject's, else none", () => {
    const c = ctx({ subjectWeekdays: [{ subjectId: "lit", weekdays: [4, 2] }] });
    expect(weekdaysOf({ subjectId: "lit", weekdays: [5] }, c)).toEqual({ weekdays: [5], source: "assignment" });
    expect(weekdaysOf({ subjectId: "lit" }, c)).toEqual({ weekdays: [2, 4], source: "subject" });
    expect(weekdaysOf({ subjectId: "lit", weekdays: null }, c)).toEqual({ weekdays: [2, 4], source: "subject" });
    expect(weekdaysOf({ subjectId: "math" }, c)).toEqual({ weekdays: null, source: "default" });
    expect(weekdaysOf({ subjectId: "math" }, {})).toEqual({ weekdays: null, source: "default" });
  });
  it("an empty or invalid list counts as no choice, and an invalid own list falls back to the subject's", () => {
    const c = ctx({ subjectWeekdays: [{ subjectId: "lit", weekdays: [3] }] });
    expect(weekdaysOf({ subjectId: "lit", weekdays: [] }, c).source).toBe("subject");
    expect(weekdaysOf({ subjectId: "lit", weekdays: [7 as Weekday] }, c).source).toBe("subject");
    expect(weekdaysOf({ subjectId: "lit", weekdays: [1.5 as Weekday] }, c).source).toBe("subject");
    expect(weekdaysOf({ subjectId: "x", weekdays: [] }, { subjectWeekdays: [{ subjectId: "x", weekdays: [] }] })).toEqual({ weekdays: null, source: "default" });
    expect(validWeekdays("5")).toBeNull();
    expect(validWeekdays([5, 1, 5])).toEqual([1, 5]);
  });
});

describe("planning on weekdays (S4-01)", () => {
  it("Fridays only: 12 lessons over 12 weeks is 1 per Friday and nothing else", () => {
    const p = plan(lessons({ weekdays: FRI }));
    expect(working(p)).toEqual(fridays(p).filter((d) => d <= "2026-11-27"));
    for (const d of p.days.filter((x) => x.units > 1e-9)) expect(d.units).toBeCloseTo(1, 9);
    expect(unitsOn(p, "2026-09-08")).toBe(0);
    expect(p.days.find((d) => d.date === "2026-09-08")).toMatchObject({ units: 0, thickness: 0, capacity: 0 });
    expect(p.weekdays).toEqual([5]);
    expect(p.weekdaysSource).toBe("assignment");
    expectSane(p);
    expectConserved(p);
  });

  it("Monday to Thursday: 100 pages over 2 weeks is 8 days of 12.5", () => {
    const p = plan(book({ weekdays: [1, 2, 3, 4] }));
    expect(p.baseRate).toBeCloseTo(12.5, 9);
    expect(unitsOn(p, "2026-09-10")).toBeCloseTo(12.5, 9);
    expect(unitsOn(p, "2026-09-11")).toBe(0);
    expect(unitsOn(p, "2026-09-18")).toBe(0);
    expectConserved(p);
  });

  it("follows the subject's default, and an assignment's own days win", () => {
    const c = ctx({ subjectWeekdays: [{ subjectId: "lit", weekdays: TUE_THU }] });
    const bySubject = plan(book(), c);
    expect(bySubject.weekdaysSource).toBe("subject");
    expect(bySubject.weekdays).toEqual(TUE_THU);
    expect(working(bySubject)).toEqual(["2026-09-08", "2026-09-10", "2026-09-15", "2026-09-17"]);
    const own = plan(book({ weekdays: FRI }), c);
    expect(working(own)).toEqual(["2026-09-11", "2026-09-18"]);
    // Another subject's default doesn't apply.
    expect(plan(book({ subjectId: "math" }), c).weekdaysSource).toBe("default");
  });

  it("with no weekdays anywhere (or an empty list) the plan is as before", () => {
    const base = plan(book());
    expect(base.weekdays).toBeNull();
    expect(base.weekdaysSource).toBe("default");
    expect(plan(book({ weekdays: [] })).days).toEqual(base.days);
    expect(plan(book({ weekdays: null }), ctx({ subjectWeekdays: [{ subjectId: "lit", weekdays: [] }] })).days).toEqual(base.days);
    expect(plan(book({ weekdays: [1, 2, 3, 4, 5] })).days.map((d) => d.units)).toEqual(base.days.map((d) => d.units));
  });

  it("weekdays with no school days report no-capacity", () => {
    const p = plan(book({ weekdays: [0, 6] }));
    expect(p.noCapacity).toBe(true);
    expect(p.warnings).toContain("no-capacity");
    expect(p.unplacedUnits).toBe(100);
    expectSane(p);
  });

  it("a Friday day off spreads that lesson over the remaining Fridays (keeps the end)", () => {
    const p = plan(lessons({ weekdays: FRI }), ctx({ blocked: [{ id: "b", start: "2026-10-09", end: "2026-10-09", kind: "sick" }] }));
    expect(unitsOn(p, "2026-10-09")).toBe(0);
    expect(unitsOn(p, "2026-09-11")).toBeCloseTo(12 / 11, 9);
    expect(unitsOn(p, "2026-11-27")).toBeCloseTo(12 / 11, 9);
    expect(p.end).toBe("2026-11-27");
    expectConserved(p);
  });

  it("a day off on a day the assignment doesn't use changes nothing", () => {
    const a = lessons({ weekdays: FRI });
    const off = plan(a, ctx({ blocked: [{ id: "b", start: "2026-10-07", end: "2026-10-07" }] }));
    expect(off.days.map((d) => d.units)).toEqual(plan(a).days.map((d) => d.units));
  });

  it("a check-in on a Tue/Thu assignment replans onto Tue/Thu only", () => {
    const a = book({ weekdays: TUE_THU, end: "2026-09-25" }); // 3 weeks, 6 days
    const p = plan(a, ctx({ checkIns: [{ assignmentId: "a1", childId: "frank", weekStart: "2026-09-07", position: 10, mode: "keepEndDate" }] }));
    expect(unitsBetween(p, "2026-09-07", "2026-09-13")).toBeCloseTo(10, 9);
    expect(working(p).filter((d) => d > "2026-09-13")).toEqual(["2026-09-15", "2026-09-17", "2026-09-22", "2026-09-24"]);
    expect(unitsOn(p, "2026-09-15")).toBeCloseTo(90 / 4, 9);
    expect(unitsOn(p, "2026-09-16")).toBe(0);
    expectConserved(p);
  });

  it("a skipped or lighter Tuesday event applies to a Tue/Thu assignment", () => {
    const ev = (over: Partial<RecurringEvent>): RecurringEvent => ({ id: "e", childIds: [], weekdays: [2], start: "2026-09-08", end: "2026-09-08", capacityFraction: 0.5, subjectRules: {}, defaultRule: "lighter", ...over });
    const a = book({ weekdays: TUE_THU }); // 4 days
    const skip = plan(a, ctx({ events: [ev({ defaultRule: "skip" })] }));
    expect(unitsOn(skip, "2026-09-08")).toBe(0);
    expect(unitsOn(skip, "2026-09-10")).toBeCloseTo(100 / 3, 9);
    const lighter = plan(a, ctx({ events: [ev({})] }));
    expect(lighter.days.find((d) => d.date === "2026-09-08")!.capacity).toBeCloseTo(0.5, 9);
    expect(unitsOn(lighter, "2026-09-08")).toBeCloseTo(100 * 0.5 / 3.5, 9);
    expectConserved(lighter);
  });

  it("a shared assignment: one child's day off moves only their work", () => {
    const a = lessons({ weekdays: FRI, childIds: ["frank", "margaret"] });
    const [frank, margaret] = planAssignment(a, ctx({ blocked: [{ id: "b", start: "2026-10-09", end: "2026-10-09", childIds: ["frank"] }] }));
    expect(unitsOn(frank!, "2026-10-09")).toBe(0);
    expect(unitsOn(margaret!, "2026-10-09")).toBeCloseTo(1, 9);
    expect(unitsOn(frank!, "2026-09-11")).toBeCloseTo(12 / 11, 9);
    expect(working(margaret!)).toEqual(working(plan(a)));
  });

  it("a week override on a Fridays-only assignment spreads over that week's Friday", () => {
    const a = lessons({ weekdays: FRI });
    const p = plan(a, ctx({ overrides: [{ assignmentId: "a1", weekStart: "2026-10-05", plannedUnits: 3, mode: "keepEndDate" }] }));
    expect(unitsOn(p, "2026-10-09")).toBeCloseTo(3, 9);
    expect(unitsBetween(p, "2026-10-05", "2026-10-11")).toBeCloseTo(3, 9);
    expect(unitsOn(p, "2026-10-06")).toBe(0);
    expect(unitsOn(p, "2026-09-11")).toBeCloseTo(9 / 11, 9);
    expectConserved(p);
  });

  it("is the same in every time zone (day numbers, no Date)", () => {
    const p = plan(lessons({ weekdays: FRI }));
    expect(p.days[0]!.date).toBe("2026-09-07");
    expect(working(p)[0]).toBe("2026-09-11");
  });
});
