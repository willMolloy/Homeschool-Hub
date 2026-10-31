/** S4-00: a missed past day carries its work forward; nothing before it changes. */
import { describe, expect, it } from "vitest";
import { planAssignment, planChild, type BlockedPeriod, type ChildPlan, type PlanContext, type ProgressCheckIn } from "../src";
import { book, expectConserved, expectSane, MON_FRI, unitsOn } from "./helpers";

// The README case: 100 pages, Mon 5 Oct to Fri 27 Nov (40 school days, 2.5 a day), today Thu 29 Oct.
const a = book({ totalUnits: 100, start: "2026-10-05", end: "2026-11-27", childIds: ["frank", "margaret"] });
const missed = (day: string, childIds: string[] | null = ["frank"], end = day): BlockedPeriod => ({ id: `m-${day}`, start: day, end, childIds, kind: "missed" });
const ctx = (blocked: BlockedPeriod[] = [], over: Partial<PlanContext> = {}): PlanContext => ({ calendar: MON_FRI, asOf: "2026-10-29", blocked, ...over });
const plan = (blocked: BlockedPeriod[], over: Partial<PlanContext> = {}, child = "frank", asg = a): ChildPlan => planChild(asg, child, ctx(blocked, over));
const positionAt = (p: ChildPlan, date: string) => p.days.find((d) => d.date === date)!.position;
const beforeDay = (p: ChildPlan, date: string) => p.days.filter((d) => d.date < date).map((d) => [d.date, d.units, d.position]);

describe("a missed past day (S4-00)", () => {
  it("README case: the position at the end of Oct 27 stays 42.5, Oct 28 has 0, the rest spreads from Oct 29", () => {
    const p = plan([missed("2026-10-28")]);
    const none = plan([]);
    expect(positionAt(p, "2026-10-27")).toBeCloseTo(42.5, 9);
    expect(unitsOn(p, "2026-10-28")).toBe(0);
    expect(beforeDay(p, "2026-10-28")).toEqual(beforeDay(none, "2026-10-28"));
    // 57.5 left over Oct 29, 30 and the 20 days of November: 22 days.
    expect(unitsOn(p, "2026-10-29")).toBeCloseTo(57.5 / 22, 9);
    expect(unitsOn(p, "2026-11-27")).toBeCloseTo(57.5 / 22, 9);
    expect(p.days.at(-1)!.position).toBeCloseTo(100, 9);
    expect(p.end).toBe("2026-11-27");
    expect(p.days.find((d) => d.date === "2026-10-28")).toMatchObject({ capacity: 0, schoolDay: false });
    expectSane(p);
    expectConserved(p);
  });

  it("two missed days in one week apply in date order", () => {
    const p = plan([missed("2026-10-27"), missed("2026-10-28")]);
    expect(positionAt(p, "2026-10-26")).toBeCloseTo(40, 9);
    expect(unitsOn(p, "2026-10-27")).toBe(0);
    expect(unitsOn(p, "2026-10-28")).toBe(0);
    expect(unitsOn(p, "2026-10-29")).toBeCloseTo(60 / 22, 9);
    expectConserved(p);
    // The same days as one range, and given the other way round, plan the same.
    const range = plan([missed("2026-10-27", ["frank"], "2026-10-28")]);
    const swapped = plan([missed("2026-10-28"), missed("2026-10-27")]);
    expect(range.days.map((d) => d.units)).toEqual(p.days.map((d) => d.units));
    expect(swapped.days.map((d) => d.units)).toEqual(p.days.map((d) => d.units));
  });

  it("a missed day with no work for the assignment changes nothing", () => {
    const none = plan([]);
    expect(plan([missed("2026-10-24")]).days.map((d) => d.units)).toEqual(none.days.map((d) => d.units)); // a Saturday
    const done = planChild(book({ totalUnits: 10, start: "2026-10-05", end: "2026-10-06" }), "frank", ctx([missed("2026-10-28")]));
    expect(done.days.map((d) => d.units)).toEqual([5, 5]);
  });

  it("only the child it names is affected on a shared assignment", () => {
    const blocked = [missed("2026-10-28", ["frank"])];
    const [frank, margaret] = planAssignment(a, ctx(blocked));
    expect(unitsOn(frank!, "2026-10-28")).toBe(0);
    expect(margaret!.days.map((d) => d.units)).toEqual(plan([]).days.map((d) => d.units));
    // No children listed = the whole family.
    const all = planAssignment(a, ctx([missed("2026-10-28", null)]));
    expect(all.map((p) => unitsOn(p, "2026-10-28"))).toEqual([0, 0]);
    expect(all.map((p) => positionAt(p, "2026-10-27"))).toEqual([expect.closeTo(42.5, 9), expect.closeTo(42.5, 9)]);
  });

  it("a check-in in the missed day's week wins; one in an earlier week is applied first", () => {
    const ci = (weekStart: string, position: number): ProgressCheckIn => ({ assignmentId: "a1", childId: "frank", weekStart, position, mode: "keepEndDate" });
    // Oct 26 week check-in at 45: the position at its end is 45, whatever the missed day.
    const same = plan([missed("2026-10-28")], { checkIns: [ci("2026-10-26", 45)] });
    expect(positionAt(same, "2026-11-01")).toBeCloseTo(45, 9);
    expect(unitsOn(same, "2026-10-28")).toBe(0);
    const without = plan([], { checkIns: [ci("2026-10-26", 45)] });
    expect(same.days.filter((d) => d.date >= "2026-11-02").map((d) => d.units)).toEqual(without.days.filter((d) => d.date >= "2026-11-02").map((d) => d.units));
    expect(same.doneUnits).toBe(45);
    // A check-in for the week before the missed day: its position and what follows, then the missed day carries forward.
    const earlier = plan([missed("2026-10-28")], { checkIns: [ci("2026-10-19", 30)] });
    const base = plan([], { checkIns: [ci("2026-10-19", 30)] });
    expect(positionAt(earlier, "2026-10-25")).toBeCloseTo(30, 9);
    expect(positionAt(earlier, "2026-10-27")).toBeCloseTo(positionAt(base, "2026-10-27"), 9);
    expect(unitsOn(earlier, "2026-10-28")).toBe(0);
    expect(earlier.days.at(-1)!.position).toBeCloseTo(100, 9);
    expectConserved(earlier);
  });

  it("a missed day before the assignment's start is ignored", () => {
    const p = plan([missed("2026-10-02")]);
    expect(p.days.map((d) => d.units)).toEqual(plan([]).days.map((d) => d.units));
  });

  it("a missed day later than asOf is an ordinary day off", () => {
    const future = plan([missed("2026-11-03")]);
    const sick = plan([{ id: "s", start: "2026-11-03", end: "2026-11-03", childIds: ["frank"], kind: "sick" }]);
    expect(future.days.map((d) => d.units)).toEqual(sick.days.map((d) => d.units));
    expect(positionAt(future, "2026-10-29")).toBeGreaterThan(positionAt(plan([]), "2026-10-29") - 1e-9);
  });

  it("sick and vacation days keep spreading over the whole range", () => {
    const p = plan([{ id: "s", start: "2026-10-28", end: "2026-10-28", childIds: ["frank"], kind: "sick" }]);
    expect(positionAt(p, "2026-10-27")).toBeCloseTo(100 * 17 / 39, 9); // 43.6: the old behaviour
  });

  it("a missed day inside an override week keeps what the week already placed", () => {
    const over = { overrides: [{ assignmentId: "a1", weekStart: "2026-10-26", plannedUnits: 20, mode: "keepEndDate" as const }] };
    const p = plan([missed("2026-10-28")], over);
    expect(positionAt(p, "2026-10-25")).toBeCloseTo(plan([], over).days.find((d) => d.date === "2026-10-25")!.position, 9);
    expect(p.days.filter((d) => d.date >= "2026-10-26" && d.date <= "2026-10-30").reduce((s, d) => s + d.units, 0)).toBeCloseTo(20, 9);
    expect(unitsOn(p, "2026-10-28")).toBe(0);
    expectConserved(p);
  });

  it("a missed last day leaves its work unplaced rather than inventing days", () => {
    const p = planChild(a, "frank", ctx([missed("2026-11-27")], { asOf: "2026-11-30" }));
    expect(p.noCapacity).toBe(true);
    expect(p.unplacedUnits).toBeCloseTo(2.5, 9);
    expect(p.warnings).toContain("no-capacity");
    expectSane(p);
    expectConserved(p);
  });
});
