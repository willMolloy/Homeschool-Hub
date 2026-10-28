import { expect } from "vitest";
import type { Assignment, ChildPlan, FamilyCalendar } from "../src";

export const MON_FRI: FamilyCalendar = { weekStart: "mon", schoolDays: [1, 2, 3, 4, 5] };
export const SUN_START: FamilyCalendar = { weekStart: "sun", schoolDays: [1, 2, 3, 4, 5] };

export function book(over: Partial<Assignment> = {}): Assignment {
  return {
    id: "a1",
    childIds: ["frank"],
    subjectId: "lit",
    title: "Book",
    unitType: "pages",
    totalUnits: 100,
    start: "2026-09-07", // Monday
    end: "2026-09-18", // Friday, two school weeks
    ...over,
  };
}

export const sumUnits = (p: ChildPlan): number => p.days.reduce((s, d) => s + d.units, 0);
/** Every day's units, assumed days included (S2b-18: the plan runs from the start). */
export const sumPlanned = (p: ChildPlan): number => p.days.reduce((s, d) => s + d.units, 0);
export const unitsOn = (p: ChildPlan, date: string): number => p.days.find((d) => d.date === date)?.units ?? 0;
export const unitsBetween = (p: ChildPlan, from: string, to: string): number =>
  p.days.filter((d) => d.date >= from && d.date <= to).reduce((s, d) => s + d.units, 0);

/** Every number in the plan is finite and non-negative. */
export function expectSane(p: ChildPlan): void {
  for (const k of ["baseRate", "rate", "unplacedUnits", "doneUnits", "remainingUnits", "weightPerUnit"] as const) {
    expect(Number.isFinite(p[k]), `${k}=${p[k]}`).toBe(true);
    expect(p[k]).toBeGreaterThanOrEqual(0);
  }
  for (const d of p.days) {
    expect(Number.isFinite(d.units) && Number.isFinite(d.thickness) && Number.isFinite(d.capacity), `${d.date}`).toBe(true);
    expect(d.thickness).toBeGreaterThanOrEqual(0);
    expect(d.units).toBeGreaterThanOrEqual(0);
    expect(d.capacity).toBeGreaterThanOrEqual(0);
    expect(d.capacity).toBeLessThanOrEqual(1);
  }
}

/** Placed + unplaced work = the total (assumed and checked-in days are placed days too). */
export function expectConserved(p: ChildPlan): void {
  expect(sumPlanned(p) + p.unplacedUnits).toBeCloseTo(p.totalUnits, 6);
}
