/** T-07d: the demo family plans cleanly and shows the variety the timeline needs (pure; no database). */
import { describe, expect, it } from "vitest";
import { planAll, type ChildPlan } from "@hh/engine";
import { DEMO_FAMILY as F } from "../demo-family";

const TODAY = "2026-10-28";
const ctx = { calendar: F.calendar, events: F.events, blocked: F.blocked, subjectWeights: F.subjectWeights, overrides: F.overrides, asOf: TODAY };
const planned = planAll(F.assignments, ctx);
const actual = planAll(F.assignments, { ...ctx, checkIns: F.checkIns });
const plan = (plans: ChildPlan[], id: string, child?: string) => plans.find((p) => p.assignmentId === id && (!child || p.childId === child))!;
const positionAt = (p: ChildPlan, date: string) => p.days.filter((d) => d.date <= date).at(-1)?.position ?? 0;
const a = (id: string) => F.assignments.find((x) => x.id === id)!;
const days = (from: string, to: string) => (Date.parse(to) - Date.parse(from)) / 86400000;

describe("the demo family", () => {
  it("plans every assignment for every child with nothing left over", () => {
    expect(actual).toHaveLength(F.assignments.reduce((n, x) => n + x.childIds.length, 0));
    for (const p of actual) expect(p.unplacedUnits, p.assignmentId).toBe(0);
    const keys = new Set(F.subjects.map((s) => s.key));
    for (const x of F.assignments) expect(keys.has(x.subjectId), x.id).toBe(true);
  });

  it("reads Treasure Island in three weeks, then starts The Hobbit straight after", () => {
    expect(days(a("ti").start, a("ti").end)).toBe(18);
    expect(days(a("ti").end, a("hobbit").start)).toBe(3); // Friday → Monday
    expect(a("hobbit").unitType).toBe("chapters");
    expect(a("ti").unitType).toBe("pages");
  });

  it("overlaps assignments in one subject, starts one mid-year and runs math all year in lessons", () => {
    const overlap = (x: string, y: string) => a(x).start <= a(y).end && a(y).start <= a(x).end && a(x).subjectId === a(y).subjectId;
    expect(overlap("garden", "poems")).toBe(true);
    expect(overlap("math3", "tables")).toBe(true);
    expect(a("drawing").start >= "2027-01-01").toBe(true);
    for (const id of ["math5", "math3"]) {
      expect(a(id)).toMatchObject({ unitType: "lessons", start: "2026-08-31", end: "2027-05-21" });
    }
  });

  it("makes the science fair heavier for three weeks, then lighter", () => {
    const fair = plan(actual, "fair");
    const units = (from: string, to: string) => fair.days.filter((d) => d.date >= from && d.date <= to).reduce((n, d) => n + d.units, 0);
    expect(units("2026-11-02", "2026-11-22")).toBeCloseTo(18, 6);
    expect(units("2026-11-30", "2026-12-18")).toBeCloseTo(6, 6);
  });

  it("has a holiday, a break week and a couple of events", () => {
    expect(F.blocked.some((b) => b.kind === "holiday")).toBe(true);
    expect(F.blocked.some((b) => b.kind === "vacation" && days(b.start, b.end) === 4)).toBe(true);
    expect(F.events.length).toBeGreaterThanOrEqual(2);
  });

  it("checks in one past week ahead of plan and one behind", () => {
    const [ahead, behind] = F.checkIns!;
    const end = (week: string) => new Date(Date.parse(week) + 6 * 86400000).toISOString().slice(0, 10);
    expect(ahead!.position).toBeGreaterThan(positionAt(plan(planned, ahead!.assignmentId), end(ahead!.weekStart)));
    expect(behind!.position).toBeLessThan(positionAt(plan(planned, behind!.assignmentId), end(behind!.weekStart)));
    for (const c of F.checkIns!) expect(end(c.weekStart) < TODAY).toBe(true);
    // Ahead with pushEndDate finishes early; behind with keepEndDate keeps the end.
    expect(plan(actual, "hobbit").end < a("hobbit").end).toBe(true);
    expect(plan(actual, "garden").end).toBe(a("garden").end);
    expect(F.reviews!.map((r) => r.weekStart)).toEqual(F.checkIns!.map((c) => c.weekStart));
  });

  it("gives Frank more to do than Margaret", () => {
    const load = (child: string) => actual.filter((p) => p.childId === child).flatMap((p) => p.days).reduce((n, d) => n + d.thickness, 0);
    expect(load("frank")).toBeGreaterThan(load("margaret") * 1.2);
  });
});
