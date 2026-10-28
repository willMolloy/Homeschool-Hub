/** Seeded randomized checks: whatever the inputs, the engine never returns NaN and never loses or invents units. */
import { describe, expect, it } from "vitest";
import { addDays, aggregate, planChild, weeklySummary, type PlanContext, type Weekday, type WeekOverride } from "../src";
import { book, expectConserved, expectSane } from "./helpers";

function rng(seed: number) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32; };
}

describe("randomized invariants (seeded, 400 cases)", () => {
  it("sane, conserved, keep holds its end, weekly invariant", () => {
    const r = rng(20261028);
    const pick = <T,>(xs: T[]) => xs[Math.floor(r() * xs.length)]!;
    for (let i = 0; i < 400; i += 1) {
      const start = addDays("2026-08-01", Math.floor(r() * 500));
      const end = addDays(start, Math.floor(r() * 120) - 5); // sometimes end < start
      const weekStart = pick(["mon", "sun"] as const);
      const schoolDays = ([0, 1, 2, 3, 4, 5, 6] as Weekday[]).filter(() => r() < 0.7);
      const ctx: PlanContext = {
        calendar: { weekStart, schoolDays },
        events: r() < 0.6 ? [{ id: "e", childIds: r() < 0.5 ? [] : ["frank"], weekdays: [pick([0, 1, 2, 3, 4, 5, 6] as Weekday[])], capacityFraction: r(), subjectRules: { lit: pick(["skip", "lighter", "normal"] as const) } }] : [],
        blocked: r() < 0.5 ? [{ id: "b", start: addDays(start, Math.floor(r() * 60)), end: addDays(start, Math.floor(r() * 90)) }] : [],
        asOf: r() < 0.4 ? addDays(start, Math.floor(r() * 140) - 10) : undefined,
        progress: r() < 0.4 ? [{ assignmentId: "a1", childId: "frank", date: addDays(start, Math.floor(r() * 30)), units: Math.floor(r() * 150) - 20 }] : [],
      };
      const overrides: WeekOverride[] = [];
      const n = Math.floor(r() * 3);
      for (let k = 0; k < n; k += 1) overrides.push({ assignmentId: "a1", weekStart: addDays(start, Math.floor(r() * 120)), plannedUnits: Math.floor(r() * 80), mode: pick(["keepEndDate", "pushEndDate"] as const) });
      ctx.overrides = overrides;
      const a = book({ totalUnits: Math.floor(r() * 500), start, end, minutesPerUnit: r() < 0.5 ? null : r() * 5 });
      let p;
      try {
        p = planChild(a, "frank", ctx);
      } catch (e) {
        throw new Error(`case ${i} threw: ${String(e)} ${JSON.stringify({ a, ctx })}`);
      }
      expectSane(p);
      expectConserved(p);
      if (p.mode === "keepEndDate" && end >= start) expect(p.end <= end || p.days.length === 0 || p.end === end).toBe(true);
      for (const w of weeklySummary(p.days, weekStart)) expect(w.average * w.capacityDays).toBeCloseTo(w.totalMinutes, 6);
      for (const d of aggregate(p.days, "weekly", weekStart)) expect(Number.isFinite(d.value)).toBe(true);
    }
  });
});
