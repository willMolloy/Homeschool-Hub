/** S10-04c: every bar has a tap zone of at least 44 × 44 px, however thin it is drawn. */
import { describe, expect, it } from "vitest";
import { MIN_TAP_PX, headerFeet, hitTest, tapBox } from "../src/features/timeline/hit";
import { layoutTimeline, type LaneBand } from "../src/features/timeline/layout";
import { buildTimelineModel } from "../src/features/timeline/model";
import { forChild } from "../src/features/timeline/childView";
import { sampleInput } from "./helpers/timeline-fixtures";

const sample = buildTimelineModel(sampleInput({ events: [] }));
/** Very light work, so bars draw at BAR_H_MIN (8 px). */
const thin = {
  ...sample,
  lanes: sample.lanes.map((lane) => ({
    ...lane,
    children: lane.children.map((c) => ({ ...c, assignments: c.assignments.map((a, i) => i % 2 ? a : { ...a, daily: a.daily.map((v) => v * 0.02), weekly: a.weekly.map((v) => v * 0.02) }) })),
  })),
};

describe("the hit-zone size (S10-04c)", () => {
  for (const width of [320, 360, 1280]) for (const [name, model] of [["sample", sample], ["thin bars", thin], ["one child", forChild(sample, sample.children[0]!.childId)]] as const) {
    it(`every Year bar's zone is at least ${MIN_TAP_PX} × ${MIN_TAP_PX} px, clear of its group header, at ${width} px (${name})`, () => {
      const l = layoutTimeline(model, { zoom: "year", width });
      const feet = headerFeet(l);
      expect(l.bands.length).toBeGreaterThan(0);
      for (const b of l.bands) for (const run of b.runs) {
        const box = tapBox(run, b.cy, feet.get(b.rowKey));
        expect(box.x1 - box.x0).toBeGreaterThanOrEqual(MIN_TAP_PX);
        expect(box.y1 - box.y0).toBeGreaterThanOrEqual(MIN_TAP_PX);
        expect(box.y0).toBeGreaterThanOrEqual((feet.get(b.rowKey) ?? 0) - 1e-9);
        expect(box.y1).toBeLessThanOrEqual(l.height + 1e-9);
        expect(box.x0).toBeGreaterThanOrEqual(0);
        expect(box.x1).toBeLessThanOrEqual(l.width);
        // A tap on the bar's own centreline picks it.
        expect(hitTest(l, (run.x0 + run.x1) / 2, b.cy)?.assignmentId).toBe(b.assignmentId);
      }
    });
  }

  it("a box that would reach under the group header moves down to start at its foot, keeping 44 px", () => {
    expect(tapBox({ x0: 10, x1: 12 }, 59, 76)).toEqual({ x0: -11, x1: 33, y0: 76, y1: 120 });
    expect(tapBox({ x0: 10, x1: 100 }, 100, 76)).toEqual({ x0: 10, x1: 100, y0: 78, y1: 122 });
  });
});

describe("which bar wins an overlapping tap (S10-04c)", () => {
  const band = (id: string, rowKey: string, cy: number, x0: number, x1: number): LaneBand =>
    ({ rowKey, laneKey: rowKey, assignmentId: id, childId: "c", title: id, paletteSlot: 0, step: "base", d: "", runs: [{ x0, x1 }], cy, connectors: [] });
  const bands = [band("upper", "r0", 100, 0, 200), band("lower", "r1", 128, 0, 200)];
  it("the nearer centreline wins", () => {
    expect(hitTest({ bands }, 50, 113)?.assignmentId).toBe("upper");
    expect(hitTest({ bands }, 50, 115)?.assignmentId).toBe("lower");
    // Only the upper zone reaches here (128 − 22 = 106 > 104).
    expect(hitTest({ bands }, 50, 80)?.assignmentId).toBe("upper");
    expect(hitTest({ bands }, 50, 150)?.assignmentId).toBe("lower");
    expect(hitTest({ bands }, 50, 150.5)).toBeNull();
  });
  it("on the same centreline, the nearer bar end wins", () => {
    const row = [band("left", "r0", 100, 0, 10), band("right", "r0", 100, 30, 40)];
    expect(hitTest({ bands: row }, 18, 100)?.assignmentId).toBe("left");
    expect(hitTest({ bands: row }, 22, 100)?.assignmentId).toBe("right");
  });
});
