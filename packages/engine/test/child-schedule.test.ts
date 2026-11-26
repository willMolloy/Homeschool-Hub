/** S22-02: a child is planned from their own end and ending. Without one, the plan is the book's. */
import { describe, expect, it } from "vitest";
import { planAssignment, planChild, type Assignment } from "../src";
import { MON_FRI, book, unitsOn } from "./helpers";

const ctx = { calendar: MON_FRI, asOf: "2026-09-07" };
const shared = book({
  childIds: ["elias", "margaret"],
  totalUnits: 100,
  start: "2026-09-07",
  end: "2026-09-18",
});

const dayUnits = (p: { days: { date: string; units: number }[] }) =>
  p.days.filter((d) => d.units > 1e-6).map((d) => [d.date, Math.round(d.units * 100) / 100]);

describe("a child end (S22-02)", () => {
  it("matches today's plan when no child has a row of their own", () => {
    const plain = planChild(shared, "elias", ctx);
    const copied = planChild({
      ...shared,
      childSchedules: [
        { childId: "elias", end: shared.end, endedAs: null, endedOn: null },
        { childId: "margaret", end: shared.end, endedAs: null, endedOn: null },
      ],
    }, "elias", ctx);
    expect(copied.days).toEqual(plain.days);
    expect(copied.plannedEnd).toBe(plain.plannedEnd);
    expect(copied).not.toHaveProperty("endedAs");
  });

  it("shortens only the child whose end moved", () => {
    const [elias, margaret] = planAssignment({
      ...shared,
      childSchedules: [
        { childId: "elias", end: "2026-09-18", endedAs: null, endedOn: null },
        { childId: "margaret", end: "2026-09-11", endedAs: null, endedOn: null },
      ],
    }, ctx);
    expect(elias!.plannedEnd).toBe("2026-09-18");
    expect(margaret!.plannedEnd).toBe("2026-09-11");
    expect(unitsOn(elias!, "2026-09-18")).toBeGreaterThan(0);
    expect(unitsOn(margaret!, "2026-09-14")).toBe(0);
    expect(unitsOn(margaret!, "2026-09-11")).toBeGreaterThan(0);
    // Pages keep one total, so the shorter span is thicker.
    expect(unitsOn(margaret!, "2026-09-07")).toBeGreaterThan(unitsOn(elias!, "2026-09-07"));
  });

  it("closes only the child who finished", () => {
    const [elias, margaret] = planAssignment({
      ...shared,
      childSchedules: [
        { childId: "elias", end: "2026-09-18", endedAs: "finished", endedOn: "2026-09-11" },
        { childId: "margaret", end: "2026-09-18", endedAs: null, endedOn: null },
      ],
    }, ctx);
    expect(elias).toMatchObject({ endedAs: "finished", endedOn: "2026-09-11", end: "2026-09-11" });
    expect(margaret).not.toHaveProperty("endedAs");
    expect(margaret!.plannedEnd).toBe("2026-09-18");
    expect(unitsOn(margaret!, "2026-09-18")).toBeGreaterThan(0);
  });

  it("keeps minutes a day when one end moves in", () => {
    const minutes: Assignment = {
      ...shared,
      unitType: "minutes",
      totalUnits: 300, // 30 a day across the ten school days of the book's span
      childSchedules: [
        { childId: "elias", end: "2026-09-18", endedAs: null, endedOn: null },
        { childId: "margaret", end: "2026-09-11", endedAs: null, endedOn: null },
      ],
    };
    const [elias, margaret] = planAssignment(minutes, ctx);
    expect(dayUnits(elias!).every(([, u]) => u === 30)).toBe(true);
    expect(dayUnits(margaret!).every(([, u]) => u === 30)).toBe(true);
    expect(dayUnits(margaret!)).toHaveLength(5);
    expect(dayUnits(elias!)).toHaveLength(10);
  });
});
