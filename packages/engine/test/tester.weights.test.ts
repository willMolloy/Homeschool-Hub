/**
 * Tester round 3 (S2b-16): weight edge cases on the engine side. Independent of the developer's weights*.test.ts.
 * The API, DB and web halves are in apps/api/test/tester3.weights.test.ts and apps/web/test/tester3.weights.test.ts.
 */
import { describe, expect, it } from "vitest";
import {
  aggregate, DEFAULT_WEIGHT_PER_UNIT, isValidWeight, planAll, planChild, suggestWeight, usualWeight, weeklySummary,
  type WeightChoice,
} from "../src";
import { book, expectSane, MON_FRI } from "./helpers";

const ctx = { calendar: MON_FRI };
let seq = 0;
const at = (day: number) => `2026-02-${String(day).padStart(2, "0")}T09:00:00Z`;
/** One choice per value, each on its own assignment, oldest first. */
const hist = (values: (number | null)[]): WeightChoice[] =>
  values.map((weight, i) => ({ assignmentId: `h${i}`, weight, chosenAt: at(i + 1), id: ++seq }));

describe("case 1: bad and extreme weights", () => {
  it.each([0, -1, -0, 0.001, 100.01, 1e308, "1.4", 1.234, 0.005, Number.MIN_VALUE, Number.MAX_VALUE])("%s is not a valid weight", (n) => {
    expect(isValidWeight(n)).toBe(false);
  });
  it.each([0.01, 0.1, 99.99, 100, 2.5])("%s is valid", (n) => expect(isValidWeight(n)).toBe(true));

  it("a bad stored weight never reaches thickness (falls back to the built-in)", () => {
    for (const bad of [0, -1, -0, 0.001, 100.01, 1e308, 1.234]) {
      const [p] = planAll([book({ weightPerUnit: bad })], ctx);
      expect(p!.weightPerUnit).toBe(1);
      expect(p!.weightSource).toBe("default");
      expectSane(p!);
    }
  });

  it("weight 100 × 100 000 units → a finite plan, thickness = units × 100", () => {
    const p = planChild(book({ totalUnits: 100_000, weightPerUnit: 100 }), "frank", ctx);
    expectSane(p);
    const work = p.days.filter((d) => d.units > 0);
    expect(work).toHaveLength(10);
    for (const d of work) expect(d.thickness).toBeCloseTo(d.units * 100, 6);
    expect(work.reduce((s, d) => s + d.thickness, 0)).toBeCloseTo(1e7, 3);
    const weeks = weeklySummary(p.days, "mon");
    expect(weeks.every((w) => Number.isFinite(w.totalThickness) && Number.isFinite(w.average))).toBe(true);
    expect(aggregate(p.days, "weekly", "mon").every((d) => Number.isFinite(d.value))).toBe(true);
  });
});

describe("case 2: scale (D1)", () => {
  it("30 min a day of piano (no weight) and 15 pages a day at weight 1 → equal thickness", () => {
    const piano = book({ id: "piano", unitType: "minutes", totalUnits: 300, weightPerUnit: null });
    const pages = book({ id: "pages", unitType: "pages", totalUnits: 150, weightPerUnit: 1 });
    const [pp, pg] = planAll([piano, pages], ctx);
    const day = (p: typeof pp) => p!.days.find((d) => d.date === "2026-09-09")!;
    expect(day(pp)).toMatchObject({ units: 30, thickness: 15 });
    expect(day(pg)).toMatchObject({ units: 15, thickness: 15 });
    expect(pp!.weightPerUnit).toBe(DEFAULT_WEIGHT_PER_UNIT.minutes);
    expect(aggregate(pp!.days, "weekly", "mon")).toEqual(aggregate(pg!.days, "weekly", "mon"));
  });
});

describe("case 5: trimmed mean", () => {
  it("five values with one outlier → the outlier is ignored", () => {
    expect(usualWeight(hist([2, 2, 2, 2, 40]))).toBe(2);
    expect(usualWeight(hist([2, 2.2, 1.8, 2, 40]))).toBe(2.07); // mean of 2, 2, 2.2 (1.8 and 40 trimmed)
    expect(usualWeight(hist([0.01, 2, 2, 2, 2]))).toBe(2);
  });
  it("exactly 4 → the middle two are averaged", () => expect(usualWeight(hist([1, 3, 5, 100]))).toBe(4));
  it("3 → the plain mean", () => expect(usualWeight(hist([1, 2, 6]))).toBe(3));
  it("6 → the oldest is ignored (window of 5)", () => {
    // oldest 50 would be the high trim if it counted; without it, [1,2,3,4,5] → 3
    expect(usualWeight(hist([50, 1, 2, 3, 4, 5]))).toBe(3);
    expect(usualWeight(hist([0.01, 10, 10, 10, 10, 10]))).toBe(10);
  });
  it("repeated edits of one assignment count once (the latest)", () => {
    const edits: WeightChoice[] = [1, 5, 9, 2].map((w, i) => ({ assignmentId: "same", weight: w, chosenAt: at(i + 1), id: ++seq }));
    expect(usualWeight(edits)).toBe(2);
    expect(usualWeight([...edits, ...hist([4])])).toBe(3);
  });
  it("a clear removes that assignment's vote; a later re-set brings it back", () => {
    const base = hist([2, 4]);
    const cleared: WeightChoice = { assignmentId: "h1", weight: null, chosenAt: at(20), id: ++seq };
    expect(usualWeight([...base, cleared])).toBe(2);
    expect(usualWeight([...base, cleared, { assignmentId: "h1", weight: 6, chosenAt: at(21), id: ++seq }])).toBe(4);
    expect(usualWeight([cleared])).toBeNull();
  });
  it("same chosenAt: the higher id is newer", () => {
    const tie: WeightChoice[] = [{ assignmentId: "t", weight: 7, chosenAt: at(3), id: 900 }, { assignmentId: "t", weight: 3, chosenAt: at(3), id: 901 }];
    expect(usualWeight(tie)).toBe(3);
  });
});

describe("case 6: learned units only (D17)", () => {
  it.each(["lessons", "minutes"] as const)("%s ignores any history, even with a subject default for another unit", (unitType) => {
    expect(suggestWeight({ unitType, perChild: [{ childId: "m", usual: 40 }], subjectDefault: { unitType: "pages", weightPerUnit: 3 } }))
      .toEqual({ weight: DEFAULT_WEIGHT_PER_UNIT[unitType], source: "builtin", childIdsWithHistory: [], childIdsWithout: ["m"] });
  });
  it("chapters learn", () => {
    expect(suggestWeight({ unitType: "chapters", perChild: [{ childId: "m", usual: 8 }], subjectDefault: null }))
      .toMatchObject({ weight: 8, source: "child" });
  });
});

describe("case 7: multi-child", () => {
  it("Margaret (history) + Frank (none) → Margaret's value; Frank listed as without", () => {
    expect(suggestWeight({ unitType: "pages", perChild: [{ childId: "margaret", usual: 1.4 }, { childId: "frank", usual: null }], subjectDefault: null }))
      .toEqual({ weight: 1.4, source: "child", childIdsWithHistory: ["margaret"], childIdsWithout: ["frank"] });
  });
  it("both with history → the median (two: their mean; three: the middle)", () => {
    expect(suggestWeight({ unitType: "pages", perChild: [{ childId: "m", usual: 1.4 }, { childId: "f", usual: 2.05 }], subjectDefault: null }))
      .toMatchObject({ weight: 1.73, source: "children" });
    expect(suggestWeight({ unitType: "pages", perChild: [{ childId: "a", usual: 9 }, { childId: "b", usual: 1 }, { childId: "c", usual: 2 }], subjectDefault: null }))
      .toMatchObject({ weight: 2, source: "children" });
  });
  it("an invalid usual value counts as no history", () => {
    expect(suggestWeight({ unitType: "pages", perChild: [{ childId: "m", usual: 0 }, { childId: "f", usual: Number.NaN }], subjectDefault: null }))
      .toMatchObject({ weight: 1, source: "builtin", childIdsWithout: ["m", "f"] });
  });
});

describe("case 10: no minutes from bars", () => {
  it("a two-child minutes plan has no key that mentions minutes", () => {
    const keys = new Set<string>();
    const walk = (v: unknown) => {
      if (Array.isArray(v)) v.forEach(walk);
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { keys.add(k); walk(x); }
    };
    walk(planAll([book({ unitType: "minutes", totalUnits: 600, childIds: ["m", "f"] })], ctx));
    expect([...keys].filter((k) => /min/i.test(k))).toEqual([]);
  });
});
