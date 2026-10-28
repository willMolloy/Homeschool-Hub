import { describe, expect, it } from "vitest";
import { MAX_PUSH_DAYS, planChild, type PlanContext, type RecurringEvent, type WeekOverride } from "../src";
import { book, expectConserved, expectSane, MON_FRI, SUN_START, sumUnits, unitsBetween, unitsOn } from "./helpers";

// 300 pages, Mon Sep 7 - Fri Oct 2 2026: 4 weeks x 5 days = 20 days, 15 pages/day, 75/week.
const a = book({ totalUnits: 300, start: "2026-09-07", end: "2026-10-02" });
const W1 = "2026-09-07";
const W2 = "2026-09-14";
const W3 = "2026-09-21";
const W4 = "2026-09-28";
const ov = (weekStart: string, plannedUnits: number, mode: WeekOverride["mode"], extra: Partial<WeekOverride> = {}): WeekOverride => ({ assignmentId: "a1", weekStart, plannedUnits, mode, ...extra });
const run = (overrides: WeekOverride[], extra: Partial<PlanContext> = {}) => planChild(a, "frank", { calendar: MON_FRI, overrides, ...extra });

describe("week overrides: keepEndDate vs pushEndDate", () => {
  it("baseline: 75 units per week", () => {
    const p = run([]);
    expect(unitsBetween(p, W2, "2026-09-20")).toBeCloseTo(75);
  });

  it("keepEndDate: the override week is fixed, other weeks thicken, end holds", () => {
    const p = run([ov(W2, 15, "keepEndDate")]);
    expectSane(p);
    expectConserved(p);
    expect(unitsBetween(p, W2, "2026-09-18")).toBeCloseTo(15);
    expect(p.end).toBe("2026-10-02");
    expect(p.mode).toBe("keepEndDate");
    expect(p.rate).toBeCloseTo((300 - 15) / 15); // 19 per day on the 15 free days
    expect(p.rate).toBeGreaterThan(p.baseRate);
    expect(unitsOn(p, W1)).toBeCloseTo(19); // spec: all non-override days share one rate
    expect(unitsOn(p, W4)).toBeCloseTo(19);
    expect(p.days.find((d) => d.date === W2)!.kind).toBe("override");
  });

  it("pushEndDate: other weeks keep the old pace, end moves later by the shortfall", () => {
    const p = run([ov(W2, 15, "pushEndDate")]);
    expectSane(p);
    expectConserved(p);
    expect(p.mode).toBe("pushEndDate");
    expect(p.rate).toBeCloseTo(15);
    expect(unitsOn(p, W1)).toBeCloseTo(15);
    expect(unitsOn(p, W4)).toBeCloseTo(15);
    // shortfall 60 units at 15/day = 4 school days after Oct 2 -> Mon Oct 5 .. Thu Oct 8
    expect(p.end).toBe("2026-10-08");
    expect(p.plannedEnd).toBe("2026-10-02");
    expect(unitsOn(p, "2026-10-08")).toBeCloseTo(15);
    expect(unitsOn(p, "2026-10-09")).toBe(0);
    expect(p.days.at(-1)!.date).toBe("2026-10-08");
  });

  it("pushEndDate with a non-integer shortfall ends with a partial day", () => {
    const p = run([ov(W2, 20, "pushEndDate")]); // shortfall 55 = 3 full days + 10
    expect(p.end).toBe("2026-10-08");
    expect(unitsOn(p, "2026-10-08")).toBeCloseTo(10);
    expectConserved(p);
  });

  it("pushEndDate when the parent got ahead: the end moves earlier", () => {
    const p = run([ov(W2, 150, "pushEndDate")]); // 75 extra
    expect(p.end).toBe("2026-09-25");
    expectConserved(p);
    expect(unitsBetween(p, W4, "2026-10-02")).toBe(0);
  });

  it("keepEndDate when the parent got ahead: later weeks thin out", () => {
    const p = run([ov(W2, 150, "keepEndDate")]);
    expect(p.rate).toBeCloseTo(10);
    expect(p.end).toBe("2026-10-02");
    expectConserved(p);
  });

  it("override of 0 units: a week off for this book", () => {
    const keep = run([ov(W2, 0, "keepEndDate")]);
    expect(unitsBetween(keep, W2, "2026-09-18")).toBe(0);
    expect(keep.rate).toBeCloseTo(20);
    const push = run([ov(W2, 0, "pushEndDate")]);
    expect(push.end).toBe("2026-10-09");
    expectConserved(keep);
    expectConserved(push);
  });

  it("override bigger than what's left is clamped, with a warning", () => {
    const p = run([ov(W2, 999, "keepEndDate")]);
    expect(unitsBetween(p, W2, "2026-09-18")).toBeCloseTo(300);
    expect(p.warnings).toContain("override-clamped");
    expect(p.rate).toBe(0);
    expectConserved(p);
  });

  it("negative or NaN plannedUnits are treated as 0", () => {
    for (const v of [-5, Number.NaN]) {
      const p = run([ov(W2, v, "keepEndDate")]);
      expectSane(p);
      expect(unitsBetween(p, W2, "2026-09-18")).toBe(0);
    }
  });

  it("override in the last week with keepEndDate pulls the rest into earlier weeks", () => {
    const p = run([ov(W4, 15, "keepEndDate")]);
    expect(unitsBetween(p, W4, "2026-10-02")).toBeCloseTo(15);
    expect(p.rate).toBeCloseTo(19);
    expectConserved(p);
  });

  it("override weeks covering every day with keepEndDate and units left: unplaced, flagged, not NaN", () => {
    const p = run([ov(W1, 10, "keepEndDate"), ov(W2, 10, "keepEndDate"), ov(W3, 10, "keepEndDate"), ov(W4, 10, "keepEndDate")]);
    expectSane(p);
    expect(p.unplacedUnits).toBeCloseTo(260);
    expect(p.warnings).toContain("keep-no-free-capacity");
    expect(p.end).toBe("2026-10-02"); // keep never silently becomes push
    expectConserved(p);
  });

  it("same all-weeks override with pushEndDate extends past the end instead", () => {
    const p = run([ov(W1, 10, "pushEndDate"), ov(W2, 10, "pushEndDate"), ov(W3, 10, "pushEndDate"), ov(W4, 10, "pushEndDate")]);
    expect(p.unplacedUnits).toBe(0);
    expect(p.end > "2026-10-02").toBe(true);
    expectConserved(p);
  });

  it("several overrides: each week fixed; chronological order claims units first", () => {
    const p = run([ov(W3, 30, "keepEndDate"), ov(W2, 45, "keepEndDate")]);
    expect(unitsBetween(p, W2, "2026-09-18")).toBeCloseTo(45);
    expect(unitsBetween(p, W3, "2026-09-25")).toBeCloseTo(30);
    expect(p.rate).toBeCloseTo((300 - 75) / 10);
    expectConserved(p);
  });

  it("mixed modes: the most recent edit (last in input order) decides", () => {
    expect(run([ov(W2, 15, "keepEndDate"), ov(W3, 15, "pushEndDate")]).mode).toBe("pushEndDate");
    expect(run([ov(W3, 15, "pushEndDate"), ov(W2, 15, "keepEndDate")]).mode).toBe("keepEndDate");
  });

  it("duplicate override for the same week: the later one wins, with a warning", () => {
    const p = run([ov(W2, 15, "keepEndDate"), ov(W2, 30, "keepEndDate")]);
    expect(unitsBetween(p, W2, "2026-09-18")).toBeCloseTo(30);
    expect(p.warnings).toContain("override-duplicate-week");
  });

  it("misaligned weekStart (a Wednesday) is normalized to the family's week, with a warning", () => {
    const p = run([ov("2026-09-16", 15, "keepEndDate")]);
    expect(unitsBetween(p, W2, "2026-09-18")).toBeCloseTo(15);
    expect(p.warnings).toContain("override-misaligned");
  });

  it("override outside the assignment's dates is ignored, with a warning", () => {
    const p = run([ov("2026-10-12", 15, "keepEndDate")]);
    expect(p.warnings).toContain("override-outside-range");
    expect(p.rate).toBeCloseTo(15);
    expect(p.mode).toBeNull();
  });

  it("override week partly outside the range only fixes the in-range days", () => {
    const b = book({ totalUnits: 300, start: "2026-09-09", end: "2026-10-02" }); // starts Wed
    const p = planChild(b, "frank", { calendar: MON_FRI, overrides: [ov(W1, 9, "keepEndDate")] });
    expect(unitsBetween(p, "2026-09-09", "2026-09-11")).toBeCloseTo(9);
    expect(unitsOn(p, "2026-09-09")).toBeCloseTo(3);
    expectConserved(p);
  });

  it("override week with zero capacity (whole week vacation) is ignored, with a warning", () => {
    const p = run([ov(W2, 5, "keepEndDate")], { blocked: [{ id: "v", start: "2026-09-14", end: "2026-09-18" }] });
    expect(p.warnings).toContain("override-no-capacity");
    expect(p.rate).toBeCloseTo(20);
    expectConserved(p);
  });

  it("override units follow capacity inside the week (co-op Tuesday skip)", () => {
    const coop: RecurringEvent = { id: "coop", childIds: ["frank"], weekdays: [2], capacityFraction: 0.5, subjectRules: { lit: "skip" } };
    const p = run([ov(W2, 40, "keepEndDate")], { events: [coop] });
    expect(unitsOn(p, "2026-09-15")).toBe(0);
    expect(unitsOn(p, "2026-09-14")).toBeCloseTo(10);
    expectConserved(p);
  });

  it("weekStart Sun vs Mon decides which days an override covers", () => {
    const sun = planChild(a, "frank", { calendar: SUN_START, overrides: [ov("2026-09-13", 15, "keepEndDate")] });
    // Sunday week Sep 13-19 contains school days Sep 14-18: same school days as the Mon week here
    expect(unitsBetween(sun, "2026-09-14", "2026-09-18")).toBeCloseTo(15);
    // A Saturday-school family: Sun week Sep 13-19 includes Sat 19; Mon week Sep 14-20 also includes it.
    const satCal = { weekStart: "sun" as const, schoolDays: [1, 2, 3, 4, 5, 6] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[] };
    const satMon = { ...satCal, weekStart: "mon" as const };
    const b = book({ totalUnits: 240, start: "2026-09-07", end: "2026-10-03" });
    const ps = planChild(b, "frank", { calendar: satCal, overrides: [ov("2026-09-13", 0, "keepEndDate")] });
    const pm = planChild(b, "frank", { calendar: satMon, overrides: [ov("2026-09-14", 0, "keepEndDate")] });
    expect(unitsOn(ps, "2026-09-12")).toBeGreaterThan(0); // Sat before the Sun week: free
    expect(unitsOn(ps, "2026-09-19")).toBe(0);
    expect(unitsOn(pm, "2026-09-19")).toBe(0);
    expect(unitsOn(pm, "2026-09-12")).toBeGreaterThan(0);
    // Sun-start: a "Sep 14" weekStart is misaligned and normalizes to Sun Sep 13
    expect(planChild(a, "frank", { calendar: SUN_START, overrides: [ov("2026-09-14", 15, "keepEndDate")] }).warnings).toContain("override-misaligned");
  });

  it("push horizon: if the work can't fit within MAX_PUSH_DAYS, the rest is unplaced, not lost", () => {
    // Everything after the planned end is blocked for years, so the 75-unit shortfall has nowhere to go.
    const p = run([ov(W2, 0, "pushEndDate")], { blocked: [{ id: "long", start: "2026-10-03", end: "2030-01-01" }] });
    expectSane(p);
    expect(p.warnings).toContain("push-horizon-exceeded");
    expect(p.unplacedUnits).toBeCloseTo(75);
    expectConserved(p);
    expect(MAX_PUSH_DAYS).toBe(730);
  });

  it("push with a vacation right after the planned end skips over it", () => {
    const p = run([ov(W2, 15, "pushEndDate")], { blocked: [{ id: "fall", start: "2026-10-05", end: "2026-10-09" }] });
    expect(unitsBetween(p, "2026-10-05", "2026-10-09")).toBe(0);
    expect(p.end).toBe("2026-10-15");
    expectConserved(p);
  });

  it("per-child override only changes that child's plan", () => {
    const shared = { ...a, childIds: ["frank", "margaret"] };
    const ctx = { calendar: MON_FRI, overrides: [ov(W2, 0, "keepEndDate", { childId: "frank" })] };
    expect(unitsBetween(planChild(shared, "frank", ctx), W2, "2026-09-18")).toBe(0);
    expect(unitsBetween(planChild(shared, "margaret", ctx), W2, "2026-09-18")).toBeCloseTo(75);
  });

  it("an override with no childId applies to every child", () => {
    const shared = { ...a, childIds: ["frank", "margaret"] };
    const ctx = { calendar: MON_FRI, overrides: [ov(W2, 0, "keepEndDate")] };
    for (const k of ["frank", "margaret"]) expect(unitsBetween(planChild(shared, k, ctx), W2, "2026-09-18")).toBe(0);
  });

  it("overrides for other assignments are ignored", () => {
    const p = run([{ ...ov(W2, 0, "keepEndDate"), assignmentId: "other" }]);
    expect(p.rate).toBeCloseTo(15);
    expect(sumUnits(p)).toBeCloseTo(300);
  });
});
