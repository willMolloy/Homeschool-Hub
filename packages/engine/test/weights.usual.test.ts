/** S2b-08: a child's usual weight (D5, D18) and the default for a new assignment (D6, D19). */
import { describe, expect, it } from "vitest";
import {
  DEFAULT_WEIGHT_PER_UNIT, TRIM_MIN_COUNT, USUAL_WEIGHT_WINDOW, roundWeight, suggestWeight, usualWeight, type WeightChoice,
} from "../src";

let seq = 0;
/** One choice per value on its own assignment, each a day newer than the last. */
function history(values: (number | null)[]): WeightChoice[] {
  return values.map((weight, i) => ({ assignmentId: `a${i}`, weight, chosenAt: `2026-01-${String(i + 1).padStart(2, "0")}T12:00:00Z`, id: ++seq }));
}

describe("usualWeight", () => {
  it("exports the window and trim threshold", () => {
    expect(USUAL_WEIGHT_WINDOW).toBe(5);
    expect(TRIM_MIN_COUNT).toBe(4);
  });

  it.each([
    [[1, 1.2, 1.4, 1.6, 9], 1.4],
    [[1, 2, 3, 10], 2.5],
    [[1, 2, 3], 2],
    [[1.4], 1.4],
    [[2, 2, 2, 2, 5], 2],
    [[1.005, 1.006, 1.007], 1.01],
  ])("%j → %s", (values, expected) => {
    expect(usualWeight(history(values))).toBe(expected);
  });

  it("is null with no history or only clears", () => {
    expect(usualWeight([])).toBeNull();
    expect(usualWeight(history([null, null]))).toBeNull();
  });

  it("ignores input order", () => {
    const h = history([1, 1.2, 1.4, 1.6, 9]);
    expect(usualWeight([...h].reverse())).toBe(1.4);
    expect(usualWeight([h[2]!, h[4]!, h[0]!, h[3]!, h[1]!])).toBe(1.4);
  });

  it("counts only the newest 5 assignments", () => {
    // The oldest (100) falls out of the window; [1, 2, 3, 4, 5] trims to 2, 3, 4.
    expect(usualWeight(history([100, 1, 2, 3, 4, 5]))).toBe(3);
  });

  it("counts an assignment edited 3 times once, at its last value", () => {
    const edits: WeightChoice[] = [
      { assignmentId: "x", weight: 9, chosenAt: "2026-02-01T00:00:00Z", id: 1 },
      { assignmentId: "x", weight: 8, chosenAt: "2026-02-02T00:00:00Z", id: 2 },
      { assignmentId: "x", weight: 2, chosenAt: "2026-02-03T00:00:00Z", id: 3 },
    ];
    expect(usualWeight(edits)).toBe(2);
    expect(usualWeight([...edits, ...history([4])])).toBe(3);
  });

  it("breaks a chosenAt tie by id", () => {
    const at = "2026-02-01T00:00:00Z";
    expect(usualWeight([
      { assignmentId: "x", weight: 5, chosenAt: at, id: 2 },
      { assignmentId: "x", weight: 1, chosenAt: at, id: 1 },
    ])).toBe(5);
  });

  it("drops an assignment whose latest choice is a clear, and its earlier values", () => {
    const h: WeightChoice[] = [
      ...history([2]),
      { assignmentId: "y", weight: 9, chosenAt: "2026-03-01T00:00:00Z", id: 900 },
      { assignmentId: "y", weight: null, chosenAt: "2026-03-02T00:00:00Z", id: 901 },
    ];
    expect(usualWeight(h)).toBe(2);
  });

  it("a cleared assignment doesn't take a slot in the window", () => {
    // Five valued assignments plus a newer clear: all five still count.
    expect(usualWeight(history([1, 2, 3, 4, 5, null]))).toBe(3);
  });

  it("rounds half away from zero", () => {
    expect(roundWeight(1.005)).toBe(1.01);
    expect(roundWeight(2.675)).toBe(2.68);
    expect(roundWeight(1.004)).toBe(1);
  });
});

describe("suggestWeight", () => {
  const none = null;
  it("one child with history → child", () => {
    expect(suggestWeight({ unitType: "pages", perChild: [{ childId: "c1", usual: 1.4 }], subjectDefault: none }))
      .toEqual({ weight: 1.4, source: "child", childIdsWithHistory: ["c1"], childIdsWithout: [] });
  });

  it("two children 1.4 and 2.0 → the median 1.7, children", () => {
    expect(suggestWeight({ unitType: "chapters", perChild: [{ childId: "c1", usual: 1.4 }, { childId: "c2", usual: 2 }], subjectDefault: none }))
      .toEqual({ weight: 1.7, source: "children", childIdsWithHistory: ["c1", "c2"], childIdsWithout: [] });
  });

  it("three children → the middle value", () => {
    const perChild = [{ childId: "a", usual: 9 }, { childId: "b", usual: 1 }, { childId: "c", usual: 2 }];
    expect(suggestWeight({ unitType: "pages", perChild, subjectDefault: none }).weight).toBe(2);
  });

  it("one with history and one without → the first child's value, listing the other", () => {
    expect(suggestWeight({ unitType: "pages", perChild: [{ childId: "c1", usual: 1.4 }, { childId: "c2", usual: null }], subjectDefault: { unitType: "pages", weightPerUnit: 3 } }))
      .toEqual({ weight: 1.4, source: "child", childIdsWithHistory: ["c1"], childIdsWithout: ["c2"] });
  });

  it("no history + a subject default 3 → subject", () => {
    expect(suggestWeight({ unitType: "pages", perChild: [{ childId: "c1", usual: null }], subjectDefault: { unitType: "pages", weightPerUnit: 3 } }))
      .toEqual({ weight: 3, source: "subject", childIdsWithHistory: [], childIdsWithout: ["c1"] });
  });

  it("no history, no subject default → built-in", () => {
    expect(suggestWeight({ unitType: "chapters", perChild: [], subjectDefault: none }))
      .toEqual({ weight: DEFAULT_WEIGHT_PER_UNIT.chapters, source: "builtin", childIdsWithHistory: [], childIdsWithout: [] });
  });

  it("lessons ignore history: a subject default 20 → subject", () => {
    expect(suggestWeight({ unitType: "lessons", perChild: [{ childId: "c1", usual: 4 }], subjectDefault: { unitType: "lessons", weightPerUnit: 20 } }))
      .toEqual({ weight: 20, source: "subject", childIdsWithHistory: [], childIdsWithout: ["c1"] });
  });

  it("minutes with nothing → 0.5 builtin", () => {
    expect(suggestWeight({ unitType: "minutes", perChild: [{ childId: "c1", usual: 4 }], subjectDefault: none }))
      .toMatchObject({ weight: 0.5, source: "builtin" });
  });

  it("a subject default for a different unit is ignored", () => {
    expect(suggestWeight({ unitType: "pages", perChild: [], subjectDefault: { unitType: "lessons", weightPerUnit: 20 } }))
      .toMatchObject({ weight: 1, source: "builtin" });
  });

  it("the learned weight beats the subject default (D19)", () => {
    expect(suggestWeight({ unitType: "pages", perChild: [{ childId: "c1", usual: 2 }], subjectDefault: { unitType: "pages", weightPerUnit: 3 } }))
      .toMatchObject({ weight: 2, source: "child" });
  });
});
