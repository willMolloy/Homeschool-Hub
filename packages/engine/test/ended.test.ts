/** S12-04: an assignment the parent said had ended is closed at endedOn: finished keeps its bar, stopped ends it; no forecast, no warnings. */
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, EngineInputError, forecastOutcome, heavyWeek, noRecentProgress, planAll, planChild, plannedRangeForWeek, type Assignment, type ProgressCheckIn } from "../src";
import { book, MON_FRI, sumUnits } from "./helpers";

// 200 pages, Mon 7 Sep to Fri 30 Oct: 40 school days, 5 a day.
const open = book({ totalUnits: 200, end: "2026-10-30" });
const ctx = { calendar: MON_FRI, asOf: "2026-11-04" };
const ci = (weekStart: string, position: number): ProgressCheckIn => ({ assignmentId: "a1", childId: "frank", weekStart, position, mode: "keepEndDate" });
const plan = (a: Assignment, extra: Partial<typeof ctx & { checkIns: ProgressCheckIn[] }> = {}) => planChild(a, "frank", { ...ctx, ...extra });
const finished = (over: Partial<Assignment> = {}) => ({ ...open, endedAs: "finished" as const, endedOn: "2026-10-30", ...over });
const stopped = (over: Partial<Assignment> = {}) => ({ ...open, endedAs: "stopped" as const, endedOn: "2026-10-02", ...over });

describe("the engine version", () => {
  it("is 0.13.0 for the closed plans", () => expect(ENGINE_VERSION).toBe("0.13.0"));
});

describe("an open assignment is untouched (S12-04)", () => {
  it("has no ended fields at all, and null ones are the same as none", () => {
    const p = plan(open);
    expect(p).not.toHaveProperty("endedAs");
    expect(p).not.toHaveProperty("endedOn");
    expect(plan({ ...open, endedAs: null, endedOn: null })).toEqual(p);
  });
});

describe("finished (S12-04)", () => {
  it("keeps the bar where it was planned, and says it ended", () => {
    const open_ = plan(open);
    const p = plan(finished());
    expect(p.days).toEqual(open_.days);
    expect(sumUnits(p)).toBeCloseTo(200, 6);
    expect(p).toMatchObject({ endedAs: "finished", endedOn: "2026-10-30", end: "2026-10-30", plannedEnd: "2026-10-30" });
  });
  it("is complete with nothing left, unplaced or warned about", () => {
    const p = plan(finished());
    expect(p).toMatchObject({ complete: true, remainingUnits: 0, doneUnits: 200, unplacedUnits: 0, noCapacity: false, warnings: [] });
  });
  it("is complete even when it was running late: no forecast and no 'no recent progress' line", () => {
    const checkIns = [ci("2026-09-07", 15), ci("2026-09-14", 30)];
    const late = plan(open, { checkIns });
    expect(forecastOutcome(late, checkIns, MON_FRI)).not.toBeNull();
    const p = plan(finished(), { checkIns });
    expect(forecastOutcome(p, checkIns, MON_FRI)).toBeNull();
    expect(noRecentProgress(p, MON_FRI)).toBe(false);
    expect(p.end).toBe("2026-10-30"); // the forecast's pushed end is gone too
  });
  it("is complete even with no school days at all (no 'no school days left' problem)", () => {
    const p = plan(finished({ weekdays: [0] }));
    expect(p.warnings).toEqual([]);
    expect(p).toMatchObject({ noCapacity: false, unplacedUnits: 0, complete: true });
  });
  it("finished before the end keeps the whole bar but no week counts work after that day", () => {
    const p = plan(finished({ endedOn: "2026-10-09" }));
    expect(p.days.at(-1)!.date).toBe("2026-10-30");
    expect(plannedRangeForWeek(p, "2026-10-05").hasPlannedWork).toBe(true);
    expect(plannedRangeForWeek(p, "2026-10-12")).toMatchObject({ hasPlannedWork: false });
    expect(heavyWeek([p], "2026-10-12", MON_FRI).load).toBe(0);
  });
});

describe("stopped (S12-04)", () => {
  it("ends the bar at the day it stopped; no work is planned after it", () => {
    const p = plan(stopped());
    expect(p.days.at(-1)!.date).toBe("2026-10-02");
    expect(p.days.filter((d) => d.date > "2026-10-02")).toEqual([]);
    expect(sumUnits(p)).toBeCloseTo(5 * 20, 6); // the pace it had: 5 a day for the 20 school days to Oct 2
    expect(p).toMatchObject({ endedAs: "stopped", endedOn: "2026-10-02", end: "2026-10-02", plannedEnd: "2026-10-30" });
  });
  it("is never complete (it never counts as finished), and has nothing left, unplaced or warned about", () => {
    const p = plan(stopped());
    expect(p).toMatchObject({ complete: false, remainingUnits: 0, unplacedUnits: 0, noCapacity: false, warnings: [] });
    expect(p.finishedEarly).not.toBe(true);
  });
  it("has no forecast, even with slow check-ins", () => {
    const checkIns = [ci("2026-09-07", 15), ci("2026-09-14", 30)];
    const p = plan(stopped(), { checkIns });
    expect(forecastOutcome(p, checkIns, MON_FRI)).toBeNull();
    expect(noRecentProgress(p, MON_FRI)).toBe(false);
  });
  it("stopped after the planned end changes nothing about the days; its end is the planned one", () => {
    const p = plan(stopped({ endedOn: "2026-11-03" }));
    expect(p.days).toEqual(plan(open).days);
    expect(p.end).toBe("2026-10-30");
  });
  it("stopped before it started has no days and ends where it begins", () => {
    const p = plan(stopped({ endedOn: "2026-09-01" }));
    expect(p.days).toEqual([]);
    expect(p).toMatchObject({ end: "2026-09-07", complete: false, warnings: [] });
  });
  it("adds no week's work after the day it stopped", () => {
    const p = plan(stopped());
    expect(plannedRangeForWeek(p, "2026-10-12").hasPlannedWork).toBe(false);
    expect(plannedRangeForWeek(p, "2026-09-28")).toMatchObject({ hasPlannedWork: true });
    expect(heavyWeek([p], "2026-10-12", MON_FRI).load).toBe(0);
  });
});

describe("ended assignments in a whole plan (S12-04)", () => {
  it("planAll closes only the ended one", () => {
    const other = book({ id: "a2", totalUnits: 50, end: "2026-11-13" });
    const plans = planAll([stopped(), other], ctx);
    expect(plans.map((p) => p.endedAs)).toEqual(["stopped", undefined]);
    expect(plans[1]).toEqual(planAll([other], ctx)[0]);
  });
  it("rejects an outcome it does not know, or none with no day", () => {
    expect(() => plan({ ...open, endedAs: "done" as never, endedOn: "2026-10-30" })).toThrow(EngineInputError);
    expect(() => plan({ ...open, endedAs: "finished", endedOn: null })).toThrow(EngineInputError);
    expect(() => plan({ ...open, endedAs: "stopped", endedOn: "2026-02-30" })).toThrow(EngineInputError);
  });
});
