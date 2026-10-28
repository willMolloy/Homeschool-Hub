/**
 * Bugs found in the prototype engine (proto-0.1 engine.ts, used by the proto-0.6 Page),
 * each shown against a frozen copy of the prototype and then checked as fixed in @hh/engine.
 */
import { describe, expect, it } from "vitest";
import * as proto from "./fixtures/proto-engine";
import { aggregate, mergeLane, planAssignment, planChild, type RecurringEvent } from "../src";
import { book, expectConserved, MON_FRI, sumUnits, unitsOn } from "./helpers";

const P = (over: Partial<proto.Assignment>): proto.Assignment => ({ id: "x", title: "x", subject: "lit", kids: ["frank"], unit: "pages", total: 100, start: "2026-09-07", end: "2026-09-18", ...over });

describe("prototype bugs (fixed in @hh/engine)", () => {
  it("BUG 1: weekly view double-counts a mid-week hand-off between two books in one lane", () => {
    // Book A Mon-Wed 30 pages, Book B Thu-Fri 20 pages: 10 pages (20 min) every day.
    const a = P({ id: "A", total: 30, start: "2026-09-07", end: "2026-09-09" });
    const b = P({ id: "B", total: 20, start: "2026-09-10", end: "2026-09-11" });
    const cols = proto.colsFor(proto.dayOf("2026-09-07"), proto.dayOf("2026-09-11"));
    const pa = proto.plan(a, []);
    const pb = proto.plan(b, []);
    const wa = proto.aggregate(pa.daily, cols, "weekly", pa.capDay);
    const wb = proto.aggregate(pb.daily, cols, "weekly", pb.capDay);
    const protoMonday = (wa[0]! + wb[0]!) * 2; // minutes
    expect(protoMonday).toBeCloseTo(40); // wrong: a typical day is 20 min

    const na = planChild(book({ id: "A", totalUnits: 30, start: "2026-09-07", end: "2026-09-09" }), "frank", { calendar: MON_FRI });
    const nb = planChild(book({ id: "B", totalUnits: 20, start: "2026-09-10", end: "2026-09-11" }), "frank", { calendar: MON_FRI });
    const w = aggregate(mergeLane([na, nb]), "weekly", "mon");
    expect(w[0]!.value).toBeCloseTo(20);
  });

  it("BUG 2: weekly view draws an assignment before it starts (Tue start shows on Monday)", () => {
    const a = P({ start: "2026-09-08", end: "2026-09-11" });
    const cols = proto.colsFor(proto.dayOf("2026-09-07"), proto.dayOf("2026-09-11"));
    const p = proto.plan(a, []);
    expect(proto.aggregate(p.daily, cols, "weekly", p.capDay)[0]).toBeGreaterThan(0); // Monday Sep 7, before the start

    const n = planChild(book({ start: "2026-09-08", end: "2026-09-11" }), "frank", { calendar: MON_FRI });
    expect(aggregate(n.days, "weekly", "mon").find((d) => d.date === "2026-09-07")).toBeUndefined();
  });

  it("BUG 3: keepEndDate silently turns into pushEndDate when the override week is the last week", () => {
    const a = P({});
    const p = proto.plan(a, [], { aid: "x", week: proto.dayOf("2026-09-14"), units: 10, mode: "keep" });
    expect(p.end).toBeGreaterThan(proto.dayOf("2026-09-18")); // end moved although the parent chose keep

    const n = planChild(book(), "frank", { calendar: MON_FRI, overrides: [{ assignmentId: "a1", weekStart: "2026-09-14", plannedUnits: 10, mode: "keepEndDate" }] });
    // New engine follows the spec formula: the rest goes on the other (non-override) days, end holds.
    expect(n.end).toBe("2026-09-18");
    expect(n.unplacedUnits).toBe(0);
    expect(unitsOn(n, "2026-09-07")).toBeCloseTo(18);
    expectConserved(n);
    // And when there truly is no free day left, it says so instead of moving the end.
    const m = planChild(book(), "frank", { calendar: MON_FRI, asOf: "2026-09-14", overrides: [{ assignmentId: "a1", weekStart: "2026-09-14", plannedUnits: 10, mode: "keepEndDate" }] });
    expect(m.end).toBe("2026-09-18");
    expect(m.unplacedUnits).toBeCloseTo(90);
    expect(m.warnings).toContain("keep-no-free-capacity");
  });

  it("BUG 4: an assignment running past the fixed 336-day horizon (after Aug 1 2027) produces NaN", () => {
    const a = P({ start: "2027-07-05", end: "2027-09-24" });
    const p = proto.plan(a, []);
    const total = p.daily.reduce((s, v) => s + v, 0);
    expect(Number.isNaN(total)).toBe(true); // days past the horizon read undefined capacity -> NaN

    const n = planChild(book({ start: "2027-07-05", end: "2027-09-24" }), "frank", { calendar: MON_FRI });
    expect(sumUnits(n)).toBeCloseTo(100);
  });

  it("BUG 5: one child's event thins a shared assignment for every child", () => {
    const piano = { id: "piano", name: "Piano", kids: ["frank"], weekday: 4, portion: 0.5, rules: { lit: "normal", math: "normal", hist: "skip", sci: "normal", music: "normal" } as Record<proto.SubjectId, proto.Rule> };
    const shared = P({ subject: "hist", kids: ["frank", "margaret"] });
    const p = proto.plan(shared, [piano]);
    expect(p.daily[proto.dayOf("2026-09-11")]).toBe(0); // Margaret has no piano but loses Friday too

    const ev: RecurringEvent = { id: "piano", childIds: ["frank"], weekdays: [5], capacityFraction: 0.5, subjectRules: { hist: "skip" } };
    const [f, m] = planAssignment(book({ subjectId: "hist", childIds: ["frank", "margaret"] }), { calendar: MON_FRI, events: [ev] });
    expect(unitsOn(f!, "2026-09-11")).toBe(0);
    expect(unitsOn(m!, "2026-09-11")).toBeCloseTo(10);
  });

  it("BUG 6: days before the fixed Aug 31 2026 base date are ignored, cramming the work into later days", () => {
    const a = P({ start: "2026-08-24", end: "2026-09-04" }); // 10 school days -> should be 10 pages/day
    const p = proto.plan(a, []);
    expect(p.daily[0]).toBeCloseTo(20); // Aug 31 gets double
    const n = planChild(book({ start: "2026-08-24", end: "2026-09-04" }), "frank", { calendar: MON_FRI });
    expect(unitsOn(n, "2026-08-24")).toBeCloseTo(10);
    expect(unitsOn(n, "2026-08-31")).toBeCloseTo(10);
    expectConserved(n);
  });
});
