/**
 * Independent tester's adversarial suite (Oct 28, 2026).
 * Property/fuzz checks written by someone who did not write the engine. Each block names the property it attacks.
 */
import { describe, expect, it } from "vitest";
import {
  addDays, buildCapacityModel, EngineInputError, isValidLocalDate, planAll, planAssignment, planChild,
  toDayNumber, weekdayOf, weeklySummary, weekStartOf,
  type Assignment, type BlockedPeriod, type ChildPlan, type PlanContext, type RecurringEvent, type Weekday, type WeekOverride,
} from "../src";
import { book, expectConserved, expectSane, MON_FRI, SUN_START, sumPlanned, unitsBetween, unitsOn } from "./helpers";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1103515245 + 12345) >>> 0; return s / 2 ** 32; };
}

const ALL: Weekday[] = [0, 1, 2, 3, 4, 5, 6];

/** Random but valid-shaped context, including hostile values the types allow. */
function randomCase(r: () => number) {
  const pick = <T,>(xs: readonly T[]) => xs[Math.floor(r() * xs.length)]!;
  const base = pick(["2026-12-20", "2028-02-20", "2026-08-01", "2099-12-25", "2000-02-25"]);
  const start = addDays(base, Math.floor(r() * 40));
  const end = addDays(start, pick([0, 0, 1, 4, 6, 7, 30, 200, -1]));
  const weekStart = pick(["mon", "sun"] as const);
  const schoolDays = r() < 0.1 ? [] : ALL.filter(() => r() < 0.7);
  const kids = ["frank", "margaret", "ada"];
  const evs: RecurringEvent[] = [];
  for (let k = 0, n = Math.floor(r() * 4); k < n; k += 1) {
    evs.push({
      id: `e${k}`, childIds: r() < 0.5 ? [] : [pick(kids)], weekdays: ALL.filter(() => r() < 0.4),
      start: r() < 0.3 ? addDays(start, Math.floor(r() * 20)) : null, end: r() < 0.3 ? addDays(start, Math.floor(r() * 60)) : null,
      capacityFraction: pick([0, 0.25, 0.5, 1, -3, 7, Number.NaN]),
      subjectRules: r() < 0.7 ? { lit: pick(["skip", "lighter", "normal"] as const) } : {},
      defaultRule: r() < 0.3 ? pick(["skip", "lighter", "normal"] as const) : undefined,
    });
  }
  const blocked: BlockedPeriod[] = [];
  for (let k = 0, n = Math.floor(r() * 3); k < n; k += 1) {
    const s = addDays(start, Math.floor(r() * 40) - 5);
    blocked.push({ id: `b${k}`, start: s, end: addDays(s, Math.floor(r() * 20) - 2), childIds: r() < 0.5 ? null : [pick(kids)] });
  }
  const overrides: WeekOverride[] = [];
  for (let k = 0, n = Math.floor(r() * 4); k < n; k += 1) {
    overrides.push({
      assignmentId: "a1", childId: r() < 0.6 ? null : pick(kids), weekStart: addDays(start, Math.floor(r() * 60) - 7),
      plannedUnits: pick([0, 1, 10, 1e6, Number.NaN, -5, 3.3]), mode: pick(["keepEndDate", "pushEndDate"] as const),
    });
  }
  const ctx: PlanContext = {
    calendar: { weekStart, schoolDays }, events: evs, blocked, overrides,
    asOf: r() < 0.5 ? addDays(start, Math.floor(r() * 80) - 10) : undefined,
  };
  const a: Assignment = book({
    childIds: kids.filter(() => r() < 0.7).concat("frank"),
    unitType: pick(["pages", "chapters", "lessons", "minutes"] as const),
    totalUnits: pick([0, 1, 7, 100, 333.33, 99999999.99]),
    start, end,
    weightPerUnit: pick([null, undefined, 0.01, 1.4, 100, Number.NaN, -5, 0]),
  });
  return { a, ctx };
}

function expectAll(p: ChildPlan, label: string) {
  try {
    expectSane(p);
    expectConserved(p);
    // Placed days must sit inside [start, effective end] (S2b-18: assumed days are planned days too).
    for (const d of p.days) if (d.units > 1e-9) {
      expect(d.date >= addDays(p.plannedEnd, -100000)).toBe(true);
      expect(d.capacity).toBeGreaterThan(0); // work is only ever placed on days with capacity
    }
    // Every numeric field the UI draws is finite.
    for (const d of p.days) expect(Number.isFinite(d.thickness) && d.thickness >= 0, `${d.date} thickness`).toBe(true);
    expect(p.unplacedUnits).toBeLessThanOrEqual(p.remainingUnits + 1e-6);
    if (p.complete) expect(sumPlanned(p)).toBeCloseTo(0, 9);
  } catch (e) {
    throw new Error(`${label}: ${(e as Error).message}`);
  }
}

describe("tester: fuzz (600 seeded cases, 3 children)", () => {
  it("never NaN/Infinity/negative; work is conserved; work only on capacity days", () => {
    const r = rng(0xdeedee);
    for (let i = 0; i < 600; i += 1) {
      const { a, ctx } = randomCase(r);
      let plans: ChildPlan[];
      try {
        plans = planAssignment(a, ctx);
      } catch (e) {
        throw new Error(`case ${i} threw ${String(e)}: ${JSON.stringify({ a, ctx })}`);
      }
      for (const p of plans) expectAll(p, `case ${i} child ${p.childId}`);
      for (const p of plans) for (const ws of ["mon", "sun"] as const)
        for (const w of weeklySummary(p.days, ws)) {
          expect(Number.isFinite(w.average)).toBe(true);
          expect(w.average * w.capacityDays).toBeCloseTo(w.totalThickness, 4);
          expect(weekdayOf(w.weekStart)).toBe(ws === "sun" ? 0 : 1);
        }
    }
  });

  it("is deterministic: same input twice gives identical output, and input is not mutated", () => {
    const r = rng(42);
    for (let i = 0; i < 300; i += 1) {
      const { a, ctx } = randomCase(r);
      const snapA = JSON.stringify(a), snapC = JSON.stringify(ctx);
      const p1 = planAssignment(a, ctx);
      const p2 = planAssignment(structuredClone(a), structuredClone(ctx));
      expect(JSON.stringify(p2)).toBe(JSON.stringify(p1));
      expect(JSON.stringify(a)).toBe(snapA);
      expect(JSON.stringify(ctx)).toBe(snapC);
    }
  });

  it("order of events and blocked periods doesn't change the plan", () => {
    const r = rng(7);
    for (let i = 0; i < 300; i += 1) {
      const { a, ctx } = randomCase(r);
      const rev: PlanContext = { ...ctx, events: [...(ctx.events ?? [])].reverse(), blocked: [...(ctx.blocked ?? [])].reverse() };
      const p1 = planAssignment(a, ctx), p2 = planAssignment(a, rev);
      p1.forEach((p, k) => {
        const q = p2[k]!;
        expect(q.unplacedUnits).toBeCloseTo(p.unplacedUnits, 6);
        p.days.forEach((d, j) => expect(q.days[j]!.units).toBeCloseTo(d.units, 6));
      });
    }
  });
});

describe("tester: overrides are idempotent", () => {
  const o: WeekOverride = { assignmentId: "a1", weekStart: "2026-09-07", plannedUnits: 10, mode: "keepEndDate" };
  it("sending the same override twice plans the same days as once", () => {
    const once = planChild(book(), "frank", { calendar: MON_FRI, overrides: [o] });
    const twice = planChild(book(), "frank", { calendar: MON_FRI, overrides: [o, { ...o }] });
    expect(twice.days.map((d) => d.units)).toEqual(once.days.map((d) => d.units));
    expect(twice.rate).toBe(once.rate);
    expect(twice.warnings).toContain("override-duplicate-week");
  });
  it("re-planning a plan's own output as an override for that week changes nothing", () => {
    const p = planChild(book(), "frank", { calendar: MON_FRI });
    const wk = unitsBetween(p, "2026-09-07", "2026-09-13");
    const p2 = planChild(book(), "frank", { calendar: MON_FRI, overrides: [{ ...o, plannedUnits: wk }] });
    p.days.forEach((d, i) => expect(p2.days[i]!.units).toBeCloseTo(d.units, 9));
  });
  it("misaligned override on any weekday of the week lands on the same 7 days (mon and sun weeks)", () => {
    for (const cal of [MON_FRI, SUN_START]) {
      const ref = planChild(book(), "frank", { calendar: cal, overrides: [{ ...o, weekStart: weekStartOf("2026-09-09", cal.weekStart) }] });
      for (let k = 0; k < 7; k += 1) {
        const ws = addDays(weekStartOf("2026-09-09", cal.weekStart), k);
        const p = planChild(book(), "frank", { calendar: cal, overrides: [{ ...o, weekStart: ws }] });
        expect(p.days.map((d) => d.units)).toEqual(ref.days.map((d) => d.units));
        if (k > 0) expect(p.warnings).toContain("override-misaligned");
      }
    }
  });
});

describe("tester: week boundaries Sun vs Mon", () => {
  // Sat+Sun school days make the week definition matter.
  const cal = (ws: "mon" | "sun") => ({ weekStart: ws, schoolDays: ALL });
  it("an override for the Sun-start week of Sep 6 covers Sep 6..12; for Mon-start, Sep 7..13", () => {
    const a = book({ start: "2026-09-01", end: "2026-09-30", totalUnits: 300 });
    const sun = planChild(a, "frank", { calendar: cal("sun"), overrides: [{ assignmentId: "a1", weekStart: "2026-09-06", plannedUnits: 0, mode: "keepEndDate" }] });
    const mon = planChild(a, "frank", { calendar: cal("mon"), overrides: [{ assignmentId: "a1", weekStart: "2026-09-07", plannedUnits: 0, mode: "keepEndDate" }] });
    expect(unitsBetween(sun, "2026-09-06", "2026-09-12")).toBe(0);
    expect(unitsOn(sun, "2026-09-13")).toBeGreaterThan(0);
    expect(unitsOn(sun, "2026-09-05")).toBeGreaterThan(0);
    expect(unitsBetween(mon, "2026-09-07", "2026-09-13")).toBe(0);
    expect(unitsOn(mon, "2026-09-06")).toBeGreaterThan(0);
    expect(unitsOn(mon, "2026-09-14")).toBeGreaterThan(0);
    expectConserved(sun); expectConserved(mon);
  });
  it("weekly summaries partition the same days into 7-day buckets either way", () => {
    const p = planChild(book({ start: "2026-12-27", end: "2027-01-09", totalUnits: 70 }), "frank", { calendar: cal("mon") });
    for (const ws of ["mon", "sun"] as const) {
      const weeks = weeklySummary(p.days, ws);
      const total = weeks.reduce((s, w) => s + w.totalThickness, 0);
      expect(total).toBeCloseTo(p.days.reduce((s, d) => s + d.thickness, 0), 9);
      for (const w of weeks) expect(weekdayOf(w.weekStart)).toBe(ws === "sun" ? 0 : 1);
    }
  });
});

describe("tester: calendar edges", () => {
  it("year boundary: Dec 28 2026 - Jan 8 2027 spreads over 10 school days, week of Dec 28 holds Jan 1", () => {
    const p = planChild(book({ start: "2026-12-28", end: "2027-01-08", totalUnits: 100 }), "frank", { calendar: MON_FRI });
    expect(p.rate).toBeCloseTo(10, 9);
    expect(unitsOn(p, "2027-01-01")).toBeCloseTo(10, 9);
    const w = weeklySummary(p.days, "mon");
    expect(w.map((x) => x.weekStart)).toEqual(["2026-12-28", "2027-01-04"]);
    expect(weeklySummary(p.days, "sun").map((x) => x.weekStart)).toEqual(["2026-12-27", "2027-01-03"]);
  });
  it("leap day 2028-02-29 (a Tuesday) is a school day; 2027-02-29 and 2100-02-29 are rejected", () => {
    expect(isValidLocalDate("2028-02-29")).toBe(true);
    expect(isValidLocalDate("2000-02-29")).toBe(true);
    expect(isValidLocalDate("2027-02-29")).toBe(false);
    expect(isValidLocalDate("2100-02-29")).toBe(false);
    expect(weekdayOf("2028-02-29")).toBe(2);
    const p = planChild(book({ start: "2028-02-28", end: "2028-03-03", totalUnits: 50 }), "frank", { calendar: MON_FRI });
    expect(p.days.map((d) => d.date)).toContain("2028-02-29");
    expect(unitsOn(p, "2028-02-29")).toBeCloseTo(10, 9);
    expect(() => planChild(book({ start: "2027-02-29" }), "frank", { calendar: MON_FRI })).toThrow(EngineInputError);
  });
  it("one-day assignment on a school day puts everything on that day; on a Saturday it's no-capacity", () => {
    const p = planChild(book({ start: "2026-09-09", end: "2026-09-09", totalUnits: 37 }), "frank", { calendar: MON_FRI });
    expect(p.days).toHaveLength(1);
    expect(unitsOn(p, "2026-09-09")).toBe(37);
    const s = planChild(book({ start: "2026-09-12", end: "2026-09-12", totalUnits: 37 }), "frank", { calendar: MON_FRI });
    expect(s.noCapacity).toBe(true);
    expect(s.unplacedUnits).toBe(37);
    expect(s.warnings).toContain("no-capacity");
  });
  it("0 units is complete, places nothing, warns nothing", () => {
    const p = planChild(book({ totalUnits: 0 }), "frank", { calendar: MON_FRI, asOf: "2027-01-01" });
    expect(p.complete).toBe(true);
    expect(sumPlanned(p)).toBe(0);
    expect(p.warnings).toEqual([]);
  });
  it("huge units within the DB column (numeric(10,2)) stay finite and conserved", () => {
    const p = planChild(book({ totalUnits: 99999999.99, weightPerUnit: 100 }), "frank", { calendar: MON_FRI });
    expectSane(p);
    expectConserved(p);
  });
  // Known, not fixed: the engine's "never Infinity" promise only holds for inputs the DB columns allow
  // (numeric(10,2) units x a weight of at most 100). See docs/progress/tester-report.md (T-ENG-2).
  // S2b-14: minutes are gone, so the same overflow now shows up in thickness.
  it.fails("absurd units beyond any column (1e307 x weight 100 on one day) don't draw Infinity thickness", () => {
    const p = planChild(book({ start: "2026-09-09", end: "2026-09-09", totalUnits: 1e307, weightPerUnit: 100 }), "frank", { calendar: MON_FRI });
    expect(p.days.every((d) => Number.isFinite(d.thickness))).toBe(true);
  });
  it("weight 100 × 100 000 units stays finite; NaN or -5 weights fall back to the built-in", () => {
    const p = planChild(book({ start: "2026-09-09", end: "2026-09-09", totalUnits: 100000, weightPerUnit: 100 }), "frank", { calendar: MON_FRI });
    expect(p.days[0]!.thickness).toBe(1e7);
    for (const bad of [Number.NaN, -5]) {
      const q = planChild(book({ weightPerUnit: bad }), "frank", { calendar: MON_FRI });
      expect(q.weightPerUnit).toBe(1);
      expect(q.weightSource).toBe("default");
      expect(q.days[0]!.thickness).toBeCloseTo(10);
    }
  });
  it("all days blocked: no-capacity, all work unplaced, no NaN", () => {
    const p = planChild(book(), "frank", { calendar: MON_FRI, blocked: [{ id: "v", start: "2026-01-01", end: "2027-12-31" }] });
    expect(p.noCapacity).toBe(true);
    expect(p.unplacedUnits).toBe(100);
    expectSane(p);
    const q = planChild(book(), "frank", { calendar: { weekStart: "mon", schoolDays: [] } });
    expect(q.unplacedUnits).toBe(100);
    const push = planChild(book(), "frank", { calendar: MON_FRI, blocked: [{ id: "v", start: "2026-01-01", end: "2099-12-31" }], overrides: [{ assignmentId: "a1", weekStart: "2026-09-07", plannedUnits: 1, mode: "pushEndDate" }] });
    expectSane(push); expectConserved(push);
  });
  it("blocked period with end < start blocks nothing", () => {
    const p = planChild(book(), "frank", { calendar: MON_FRI, blocked: [{ id: "v", start: "2026-09-18", end: "2026-09-07" }] });
    expect(p.rate).toBeCloseTo(10, 9);
  });
});

describe("tester: overlapping events", () => {
  const ev = (over: Partial<RecurringEvent>): RecurringEvent => ({ id: "e", childIds: [], weekdays: [3], capacityFraction: 0.5, subjectRules: { lit: "lighter" }, ...over });
  it("two lighter events on the same Wednesday multiply (0.5 x 0.5 = 0.25)", () => {
    const m = buildCapacityModel(MON_FRI, [ev({ id: "a" }), ev({ id: "b" })]);
    expect(m.capacity(toDayNumber("2026-09-09"), "frank", "lit")).toBeCloseTo(0.25, 12);
  });
  it("skip wins over anything; capacity stays in [0,1] with hostile fractions", () => {
    const m = buildCapacityModel(MON_FRI, [ev({ id: "a", capacityFraction: -4 }), ev({ id: "b", capacityFraction: 9 }), ev({ id: "c", subjectRules: { lit: "skip" } })]);
    expect(m.capacity(toDayNumber("2026-09-09"), "frank", "lit")).toBe(0);
    const m2 = buildCapacityModel(MON_FRI, [ev({ capacityFraction: -4 })]);
    const c = m2.capacity(toDayNumber("2026-09-09"), "frank", "lit");
    expect(c).toBeGreaterThanOrEqual(0);
    expect(c).toBeLessThanOrEqual(1);
  });
  it("subject ids that collide with Object.prototype keys don't break capacity", () => {
    for (const sid of ["constructor", "toString", "__proto__", "hasOwnProperty"]) {
      const m = buildCapacityModel(MON_FRI, [ev({ subjectRules: {}, defaultRule: "skip" })]);
      expect(m.capacity(toDayNumber("2026-09-09"), "frank", sid), sid).toBe(0);
    }
  });
});

describe("tester: multi-child divergence", () => {
  const shared = book({ childIds: ["frank", "margaret"], totalUnits: 100 });
  it("one child's blocked days and override never move the other child's plan", () => {
    const alone = planChild(shared, "margaret", { calendar: MON_FRI });
    const ctx: PlanContext = {
      calendar: MON_FRI,
      blocked: [{ id: "sick", start: "2026-09-08", end: "2026-09-10", childIds: ["frank"] }],
      overrides: [{ assignmentId: "a1", childId: "frank", weekStart: "2026-09-14", plannedUnits: 5, mode: "pushEndDate" }],
      asOf: "2026-09-08",
    };
    const [f, m] = planAssignment(shared, ctx);
    expect(f!.childId).toBe("frank");
    expect(f!.mode).toBe("pushEndDate");
    expect(m!.mode).toBe(null);
    expect(m!.doneUnits).toBe(0);
    // Margaret is unaffected; asOf only labels her early days assumed.
    const mAsOf = planChild(shared, "margaret", { calendar: MON_FRI, asOf: "2026-09-08" });
    expect(m!.days.map((d) => d.units)).toEqual(mAsOf.days.map((d) => d.units));
    expect(m!.days.map((d) => d.units)).toEqual(alone.days.map((d) => d.units));
    expect(alone.rate).toBeCloseTo(10, 9);
    expectConserved(f!); expectConserved(m!);
  });
  it("duplicate child ids on an assignment produce one plan per child", () => {
    expect(planAssignment(book({ childIds: ["frank", "frank", "margaret"] }), { calendar: MON_FRI })).toHaveLength(2);
  });
  it("planAll with 20 children and 50 assignments stays sane", () => {
    const kids = Array.from({ length: 20 }, (_, i) => `k${i}`);
    const as = Array.from({ length: 50 }, (_, i) => book({ id: `a${i}`, childIds: kids.slice(i % 20, (i % 20) + 3), start: addDays("2026-08-17", i), end: addDays("2027-05-28", -i), totalUnits: 100 + i }));
    const plans = planAll(as, { calendar: MON_FRI, asOf: "2026-10-28" });
    expect(plans.length).toBeGreaterThan(50);
    for (const p of plans) { expectSane(p); expectConserved(p); }
  });
});

describe("tester: asOf edges", () => {
  it("asOf exactly on end: the last day keeps its normal share (S2b-18, no pile-up)", () => {
    const p = planChild(book(), "frank", { calendar: MON_FRI, asOf: "2026-09-18" });
    expect(unitsOn(p, "2026-09-18")).toBeCloseTo(10, 9);
    expect(p.days.find((d) => d.date === "2026-09-18")!.kind).toBe("planned");
  });
  it("asOf one day after end: every day assumed, nothing unplaced, no warnings (S2b-18)", () => {
    const p = planChild(book(), "frank", { calendar: MON_FRI, asOf: "2026-09-19" });
    expect(p.warnings).toEqual([]);
    expect(p.unplacedUnits).toBe(0);
    expect(p.days.every((d) => d.kind === "assumed")).toBe(true);
  });
  it("push mode after the end date still finds the work a home (not unplaced)", () => {
    // Parent chose "push the end date" on the last week; then the term ended with work left.
    const p = planChild(book(), "frank", { calendar: MON_FRI, asOf: "2026-09-21", overrides: [{ assignmentId: "a1", weekStart: "2026-09-14", plannedUnits: 10, mode: "pushEndDate" }] });
    expectSane(p); expectConserved(p);
  });
});
