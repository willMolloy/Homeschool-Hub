/** T-07f: This month leaves out rows, lanes and subjects with nothing in the month (layout.ts). */
import { describe, expect, it } from "vitest";
import { layoutTimeline } from "../src/features/timeline/layout";
import { buildTimelineModel } from "../src/features/timeline/model";
import { drawnExtent } from "../src/features/timeline/rows";
import { gridMonths, zoomRange } from "../src/features/timeline/zoom";
import { DEMO_ME } from "./helpers/fake-api";
import { sampleInput } from "./helpers/timeline-fixtures";

const model = buildTimelineModel(sampleInput({ today: DEMO_ME.today }));
const all = model.lanes.flatMap((s) => s.children.flatMap((c) => c.assignments));

describe("This month shows only what is in the month", () => {
  it("draws exactly the assignments with something in the month, and labels only their lanes", () => {
    let hidden = 0;
    for (const month of gridMonths(model)) {
      const [first, last] = zoomRange(model, "month", month)!;
      const expected = all.filter((a) => { const s = drawnExtent(a); return s !== null && s[0] <= last && s[1] >= first; });
      const layout = layoutTimeline(model, { zoom: "month", width: 390, month });
      expect(new Set(layout.bands.map((b) => b.assignmentId))).toEqual(new Set(expected.map((a) => a.assignmentId)));
      const lanes = new Set(layout.bands.map((b) => b.laneKey));
      expect(new Set(layout.labels.map((l) => l.laneKey))).toEqual(lanes);
      expect(layout.rows.every((r) => layout.bands.some((b) => b.rowKey === r.key))).toBe(true);
      hidden += all.length - expected.length;
    }
    expect(hidden).toBeGreaterThan(0);
  });

  it("keeps every lane at Year, and a bar keeps its row number at This month", () => {
    const year = layoutTimeline(model, { zoom: "year", width: 390 });
    expect(year.labels).toHaveLength(model.lanes.reduce((n, s) => n + s.children.length, 0));
    const key = (b: { assignmentId: string; laneKey: string }) => `${b.laneKey}/${b.assignmentId}`;
    const rowOf = new Map(year.bands.map((b) => [key(b), b.rowKey]));
    for (const month of gridMonths(model)) {
      for (const b of layoutTimeline(model, { zoom: "month", width: 390, month }).bands) expect(b.rowKey).toBe(rowOf.get(key(b)));
    }
  });
});
