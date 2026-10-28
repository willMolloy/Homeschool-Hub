/** T-03: the timeline layout (features/timeline/layout.ts, rows.ts, hit.ts, xscale.ts, zoom.ts, paths.ts). */
import { describe, expect, it } from "vitest";
import { PX_PER_THICKNESS } from "../src/features/plan/scale";
import { buildDayGrid } from "../src/features/timeline/grid";
import { MIN_TAP_PX, hitTest, tapBox } from "../src/features/timeline/hit";
import {
  LABEL_ROW_PX, LANE_GAP_PX, MIN_BAND_PX, SIDE_PAD_PX, bandHeight, layoutTimeline, type TimelineLayout,
} from "../src/features/timeline/layout";
import { buildTimelineModel, type TimelineAssignment, type TimelineModel } from "../src/features/timeline/model";
import { drawnExtent, packRows } from "../src/features/timeline/rows";
import { ZOOMS, zoomRange } from "../src/features/timeline/zoom";
import { SAMPLE_CHILDREN, sampleInput } from "./helpers/timeline-fixtures";

const WIDTHS = [360, 1280] as const;
const sample = buildTimelineModel(sampleInput());

/** Every y coordinate in a path (after a comma, or a V command). */
const ys = (d: string) => [...d.matchAll(/,(-?[\d.]+)|V(-?[\d.]+)/g)].map((m) => Number(m[1] ?? m[2]));

/** A hand-built model: one subject, one child, assignments as [id, first, last, value] on a 30-weekday grid. */
function synth(specs: ReadonlyArray<readonly [id: string, first: number, last: number, value: number]>, children = 1): TimelineModel {
  const grid = buildDayGrid("2026-09-07", "2026-10-16", [1, 2, 3, 4, 5]);
  const n = grid.dates.length;
  const series = (first: number, last: number, value: number) => Array.from({ length: n }, (_, i) => (i >= first && i <= last && grid.schoolDay[i] ? value : 0));
  const assignment = (id: string, first: number, last: number, value: number, childId: string): TimelineAssignment => ({
    assignmentId: id, childId, title: id, daily: series(first, last, value), weekly: series(first, last, value), first, last,
    end: grid.dates[last]!, plannedEnd: grid.dates[last]!, estimated: false, complete: false, warnings: [],
  });
  const kids = SAMPLE_CHILDREN.slice(0, children);
  return {
    ...grid, weekStart: "mon", today: "2026-09-08", todayIndex: 1, breaks: [], events: [],
    lanes: [{
      subjectId: "math", name: "Math", paletteSlot: 2,
      children: kids.map((k, c) => ({
        key: `math:${k.id}`, subjectId: "math", childId: k.id, childName: k.name, step: c === 0 ? "base" : "light",
        assignments: specs.map(([id, f, l, v]) => assignment(`${id}${c ? `-${k.id}` : ""}`, f, l, v, k.id)), daily: [], weekly: [],
      })),
    }],
    totals: { daily: Array(n).fill(0), weekly: Array(n).fill(0) },
  };
}

const rowsOf = (l: TimelineLayout, laneKey: string) => l.rows.filter((r) => r.laneKey === laneKey);

describe("no-overlap rows", () => {
  it("puts assignments that overlap in time on separate rows, and reuses a row once it's free", () => {
    const rows = packRows(synth([["a", 0, 9, 3], ["b", 5, 14, 3], ["c", 10, 20, 3], ["d", 15, 25, 3]]).lanes[0]!.children[0]!.assignments);
    expect(rows.map((r) => r.map((a) => a.assignmentId))).toEqual([["a", "c"], ["b", "d"]]);
  });

  it("orders by first day, then id, so the result is stable whatever the input order", () => {
    const specs = [["z", 0, 9, 3], ["y", 0, 9, 3], ["x", 12, 20, 3]] as const;
    const once = packRows(synth(specs).lanes[0]!.children[0]!.assignments).map((r) => r.map((a) => a.assignmentId));
    const reversed = packRows([...synth(specs).lanes[0]!.children[0]!.assignments].reverse()).map((r) => r.map((a) => a.assignmentId));
    expect(once).toEqual([["y", "x"], ["z"]]);
    expect(reversed).toEqual(once);
  });

  it("treats touching (not overlapping) assignments as sharing a row, and nothing-drawn ones as taking no room", () => {
    const m = synth([["a", 0, 9, 3], ["b", 10, 19, 3], ["empty", 0, -1, 0]]);
    const rows = packRows(m.lanes[0]!.children[0]!.assignments);
    expect(rows.map((r) => r.map((a) => a.assignmentId))).toEqual([["a", "b", "empty"]]);
    expect(drawnExtent(m.lanes[0]!.children[0]!.assignments[2]!)).toBeNull();
    expect(packRows([])).toEqual([[]]);
  });

  it("uses the weekly-smoothed extent too, so a row never changes between zooms", () => {
    const a = { assignmentId: "a", daily: [0, 0, 5, 0, 0], weekly: [1, 1, 1, 1, 1] };
    const b = { assignmentId: "b", daily: [5, 0, 0, 0, 0], weekly: [0, 0, 0, 0, 0] };
    expect(packRows([a, b]).length).toBe(2);
  });

  it.each(WIDTHS)("in the sample family at %i px, no two bars on a row overlap, at any zoom or detail", (width) => {
    for (const zoom of ZOOMS) {
      for (const detail of ["daily", "weekly"] as const) {
        const l = layoutTimeline(sample, { zoom, width, detail });
        for (const row of l.rows) {
          const runs = l.bands.filter((b) => b.rowKey === row.key).flatMap((b) => b.runs).sort((p, q) => p.x0 - q.x0);
          for (let i = 1; i < runs.length; i++) expect(runs[i]!.x0).toBeGreaterThanOrEqual(runs[i - 1]!.x1 - 1e-9);
        }
      }
    }
  });

  it("splits the sample family's overlapping assignments into rows (more rows than sub-lanes)", () => {
    const l = layoutTimeline(sample, { zoom: "year", width: 1280 });
    const subLanes = sample.lanes.flatMap((s) => s.children).length;
    expect(l.rows.length).toBeGreaterThan(subLanes);
    expect(new Set(l.rows.map((r) => r.laneKey)).size).toBe(subLanes);
  });
});

describe("rows, centerlines and spacing", () => {
  const m = synth([["thin", 0, 9, 1], ["thick", 5, 14, 10], ["tiny", 20, 25, 0.1]]);
  const l = layoutTimeline(m, { zoom: "year", width: 1280 });

  it("each row is as tall as its own thickest point, rows are one uniform gap apart", () => {
    const rows = rowsOf(l, "math:frank");
    expect(rows.map((r) => r.height)).toEqual([1 * PX_PER_THICKNESS, 10 * PX_PER_THICKNESS]);
    expect(rows[1]!.y - (rows[0]!.y + rows[0]!.height)).toBe(LANE_GAP_PX);
    // "tiny" starts after "thin" ends, so it shares row 0 and is drawn at the 2 px floor.
    expect(l.bands.find((b) => b.assignmentId === "tiny")!.rowKey).toBe("math:frank#0");
    expect(bandHeight(0.1, PX_PER_THICKNESS)).toBe(MIN_BAND_PX);
  });

  it("every bar thickens symmetrically about its row's fixed centerline", () => {
    for (const b of l.bands) {
      const v = ys(b.d);
      expect((Math.min(...v) + Math.max(...v)) / 2).toBeCloseTo(b.cy, 0);
    }
  });

  // T-05c: event strips only show with daily detail, so the lanes start lower there; below lanesTop nothing moves.
  it.each(WIDTHS)("centerlines don't move between zooms or detail at %i px (relative to the lanes' top)", (width) => {
    const rel = (o: ReturnType<typeof layoutTimeline>) => o.rows.map((r) => r.cy - o.lanesTop);
    const base = rel(layoutTimeline(sample, { zoom: "year", width }));
    for (const zoom of ZOOMS) for (const detail of ["daily", "weekly", "smooth"] as const) {
      expect(rel(layoutTimeline(sample, { zoom, width, detail }))).toEqual(base);
    }
  });

  it("uses the shared 2.8 px-per-point scale by default, and accepts another", () => {
    expect(PX_PER_THICKNESS).toBe(2.8);
    expect(l.pxPerPoint).toBe(2.8);
    expect(rowsOf(layoutTimeline(m, { zoom: "year", width: 1280, pxPerPoint: 2 }), "math:frank")[1]!.height).toBe(20);
  });

  it("per-child breaks cover all of that child's rows", () => {
    const withBreak = { ...m, breaks: [{ id: "x", label: null, first: 2, last: 4, childIds: ["frank"] }] } as TimelineModel;
    const out = layoutTimeline(withBreak, { zoom: "year", width: 1280 });
    const rows = rowsOf(out, "math:frank");
    expect(out.breaks).toHaveLength(1);
    expect(out.breaks[0]!.y).toBe(rows[0]!.y);
    expect(out.breaks[0]!.y + out.breaks[0]!.height).toBe(rows.at(-1)!.y + rows.at(-1)!.height);
  });
});

describe("horizontal room", () => {
  it.each(WIDTHS)("at %i px the plot spans the width less a small side padding (no label column)", (width) => {
    const l = layoutTimeline(sample, { zoom: "year", width });
    expect(l.plot.x).toBe(SIDE_PAD_PX);
    expect(l.plot.width).toBe(width - 2 * SIDE_PAD_PX);
    expect(l.plot.width / width).toBeGreaterThan(0.97);
    expect("labelWidth" in l).toBe(false);
  });

  it("labels sit on their own line above the rows, at the plot's left edge", () => {
    const l = layoutTimeline(sample, { zoom: "year", width: 360 });
    for (const label of l.labels) {
      const first = rowsOf(l, label.laneKey)[0]!;
      expect(label.x).toBe(SIDE_PAD_PX);
      expect(label.height).toBe(LABEL_ROW_PX);
      expect(label.y + label.height).toBe(first.y);
    }
  });

  it("names the subject once, and a child only when the family has more than one", () => {
    const two = layoutTimeline(sample, { zoom: "year", width: 360 });
    expect(two.labels.slice(0, 2).map((x) => x.text)).toEqual(["Literature · Frank", "Margaret"]);
    const one = layoutTimeline(synth([["a", 0, 9, 3]]), { zoom: "year", width: 360 });
    expect(one.labels.map((x) => x.text)).toEqual(["Math"]);
    const both = layoutTimeline(synth([["a", 0, 9, 3]], 2), { zoom: "year", width: 360 });
    expect(both.labels.map((x) => x.text)).toEqual(["Math · Frank", "Margaret"]);
  });

  it("shows only the essentials: one label line per child, no extra text", () => {
    const l = layoutTimeline(sample, { zoom: "year", width: 1280 });
    expect(l.labels).toHaveLength(sample.lanes.flatMap((s) => s.children).length);
    expect(Object.keys(l.labels[0]!).sort()).toEqual(["height", "laneKey", "text", "x", "y"]);
  });
});

describe("tap targets", () => {
  const l = layoutTimeline(synth([["a", 0, 0, 1], ["b", 5, 9, 1]]), { zoom: "fall", width: 1280 });
  const a = l.bands.find((b) => b.assignmentId === "a")!;

  it(`gives even a one-day, 2-3 px bar a ${MIN_TAP_PX} × ${MIN_TAP_PX} px target`, () => {
    const box = tapBox(a.runs[0]!, a.cy);
    expect(box.x1 - box.x0).toBeGreaterThanOrEqual(MIN_TAP_PX);
    expect(box.y1 - box.y0).toBe(MIN_TAP_PX);
    const cx = (a.runs[0]!.x0 + a.runs[0]!.x1) / 2;
    expect(hitTest(l, cx, a.cy - 21)?.assignmentId).toBe("a");
    expect(hitTest(l, cx + 21, a.cy + 21)?.assignmentId).toBe("a");
    expect(hitTest(l, cx, a.cy + 30)).toBeNull();
  });

  it("where targets meet, the closer bar wins", () => {
    const two = layoutTimeline(synth([["a", 0, 9, 1], ["b", 0, 9, 1]]), { zoom: "fall", width: 1280 });
    const [r0, r1] = two.rows;
    const x = two.bands[0]!.runs[0]!.x0 + 10;
    expect(hitTest(two, x, r0!.cy + 1)?.rowKey).toBe(r0!.key);
    expect(hitTest(two, x, r1!.cy - 1)?.rowKey).toBe(r1!.key);
  });
});

describe("zoom ranges and the rest of the layout", () => {
  it("Fall and Spring split at New Year; Year is the whole grid", () => {
    const [f0, f1] = zoomRange(sample, "fall")!;
    const [s0] = zoomRange(sample, "spring")!;
    expect(sample.dates[f1]).toBe("2026-12-31");
    expect(sample.dates[s0]).toBe("2027-01-01");
    expect(f0).toBe(0);
    expect(zoomRange(sample, "year")).toEqual([0, sample.dates.length - 1]);
  });

  it("has no minute keys", () => {
    expect(JSON.stringify(layoutTimeline(sample, { zoom: "fall", width: 360 }))).not.toMatch(/minute/i);
  });

  it("an empty model lays out without throwing", () => {
    const empty = buildTimelineModel(sampleInput({ from: "2026-09-10", to: "2026-09-01" }));
    const l = layoutTimeline(empty, { zoom: "year", width: 360 });
    expect(l.bands.every((b) => b.d === "")).toBe(true);
    expect(l.todayX).toBeNull();
  });
});
