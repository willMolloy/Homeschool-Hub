/** T-03: the timeline layout (features/timeline/layout.ts, rows.ts, hit.ts, xscale.ts, zoom.ts, paths.ts). */
import { describe, expect, it } from "vitest";
import { MAX_BAR_PX, SOFT_CAP_KNEE_PX, softCapPx, thicknessToPx } from "../src/features/plan/scale";
import { buildDayGrid } from "../src/features/timeline/grid";
import { MIN_TAP_PX, hitTest, tapBox } from "../src/features/timeline/hit";
import {
  AXIS_HEIGHT_PX, DAY_LABEL_CLEAR_PX, DESKTOP_METRICS, EXTRA_ROW_FACTOR, MONTH_LABEL_CLEAR_PX, PHONE_METRICS, SIDE_PAD_PX, effortHeight, metricsFor, layoutTimeline, type TimelineLayout,
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
    children: kids.map((k) => ({ childId: k.id, name: k.name })),
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
    // S10-02: one lane per badge (each child's own work, plus Together).
    expect(l.rows.length).toBeGreaterThan(l.badges.length);
    expect(new Set(l.rows.map((r) => r.laneKey)).size).toBe(l.badges.length);
  });
});

describe("rows, centerlines and spacing", () => {
  const m = synth([["thin", 0, 9, 1], ["thick", 5, 14, 10], ["tiny", 20, 25, 0.1]]);
  const l = layoutTimeline(m, { zoom: "year", width: 1280 });

  it("S10-02/S10-04: each row is as tall as its heaviest point on the effort curve; the first row is centred in the lane's pitch and sub-rows follow at a fixed step", () => {
    // S15-07: this short sample would draw daily detail, where every assignment has its own row; the shared-row packing is Term and Year's.
    const l = layoutTimeline(m, { zoom: "year", width: 1280, detail: "smooth" });
    const rows = rowsOf(l, "math:frank");
    const d = DESKTOP_METRICS;
    // Loads 0.1 (6 days), 1 (10) and 10 (10): the 95th percentile is 10, so "thick" is at the maximum (an extra row: 80 %).
    expect(l.viewMax).toBe(10);
    expect(rows[0]!.height).toBeCloseTo(effortHeight(1, 10, d.barMin, d.barMax), 9);
    expect(rows[1]!.height).toBeCloseTo(d.barMax * EXTRA_ROW_FACTOR, 9);
    const laneTop = l.groups[0]!.top + d.header;
    expect(rows[0]!.cy).toBe(laneTop + d.pitch / 2);
    expect(rows[1]!.cy).toBe(laneTop + d.pitch + 0.5 * d.sub);
    // "tiny" starts after "thin" ends, so it shares row 0, and it is drawn at least BAR_H_MIN tall.
    const tiny = l.bands.find((b) => b.assignmentId === "tiny")!;
    expect(tiny.rowKey).toBe("math:frank#0");
    const half = Math.max(...ys(tiny.d).map((y) => Math.abs(y - tiny.cy)));
    expect(half * 2).toBeGreaterThanOrEqual(d.barMin - 1e-9);
    expect(half * 2).toBeLessThan(d.barMin + 1);
  });

  it("every bar thickens symmetrically about its row's fixed centerline", () => {
    for (const b of l.bands) {
      const v = ys(b.d);
      expect((Math.min(...v) + Math.max(...v)) / 2).toBeCloseTo(b.cy, 0);
    }
  });

  // T-05c: event strips only show with daily detail, so the lanes start lower there; below lanesTop nothing moves.
  it.each(WIDTHS)("centerlines don't move between zooms or detail at %i px (relative to the lanes' top)", (width) => {
    // S10-02: rows sit at a fixed pitch, so an outside name no longer moves the rows below it.
    const rel = (o: ReturnType<typeof layoutTimeline>) => o.rows.map((r) => r.cy - o.lanesTop);
    const base = rel(layoutTimeline(sample, { zoom: "year", width }));
    // S15-07: daily detail gives every assignment its own row, so only the weekly and smooth detail share the Year's rows.
    for (const zoom of ZOOMS) for (const detail of ["weekly", "smooth"] as const) {
      const got = rel(layoutTimeline(sample, { zoom, width, detail }));
      expect(got).toHaveLength(base.length);
      got.forEach((v, i) => expect(v).toBeCloseTo(base[i]!, 6));
    }
  });

  it("S15-07: at daily detail every assignment has a row of its own; Year and Term pack non-overlapping ones together", () => {
    const daily = layoutTimeline(sample, { zoom: "year", width: 1280, detail: "daily" });
    const packedYear = layoutTimeline(sample, { zoom: "year", width: 1280, detail: "smooth" });
    for (const lane of new Set(daily.bands.map((b) => b.laneKey))) {
      const mine = daily.bands.filter((b) => b.laneKey === lane && b.runs.length > 0);
      const ids = new Set(mine.map((b) => b.assignmentId));
      expect(new Set(mine.map((b) => b.rowKey)).size).toBe(ids.size);
      for (const id of ids) expect(new Set(mine.filter((b) => b.assignmentId === id).map((b) => b.rowKey)).size).toBe(1);
    }
    expect(daily.rows.length).toBeGreaterThan(packedYear.rows.length);
  });

  it("S10-04: the lane pitch is the bar maximum plus the gap, so the heaviest bar never touches its neighbour", () => {
    for (const d of [PHONE_METRICS, DESKTOP_METRICS]) expect(d.pitch - d.barMax).toBeGreaterThanOrEqual(4);
  });

  it("per-child breaks cover all of that child's rows", () => {
    const withBreak = { ...m, breaks: [{ id: "x", label: null, first: 2, last: 4, childIds: ["frank"] }] } as TimelineModel;
    const out = layoutTimeline(withBreak, { zoom: "year", width: 1280 });
    const rows = rowsOf(out, "math:frank");
    expect(out.breaks).toHaveLength(1);
    // S10-02: the child's whole group, header row included.
    const g = out.groups.find((x) => x.key === "frank")!;
    expect(out.breaks[0]!.y).toBe(g.top);
    expect(out.breaks[0]!.y + out.breaks[0]!.height).toBe(g.bottom);
    expect(g.top).toBeLessThanOrEqual(rows[0]!.y - rows[0]!.labelLane);
    expect(g.bottom).toBeGreaterThanOrEqual(rows.at(-1)!.y + rows.at(-1)!.height);
  });
});

describe("horizontal room", () => {
  it.each(WIDTHS)("at %i px the plot spans the width less the narrow badge gutter and a small side padding (no name column)", (width) => {
    const l = layoutTimeline(sample, { zoom: "year", width });
    const m = metricsFor(width);
    expect(m).toBe(width < 640 ? PHONE_METRICS : DESKTOP_METRICS);
    expect(l.metrics).toBe(m);
    expect(l.plot.x).toBe(m.gutter + SIDE_PAD_PX);
    expect(l.plot.width).toBe(width - m.gutter - SIDE_PAD_PX - m.pad);
    expect(l.plot.width / width).toBeGreaterThan(0.85);
    expect("labelWidth" in l).toBe(false);
  });

  it("S10-02: one round badge per lane sits in the gutter, at the centre of the lane's first row, and no lane is shorter than its pitch", () => {
    const l = layoutTimeline(sample, { zoom: "year", width: 360 });
    const m = PHONE_METRICS;
    for (const b of l.badges) {
      expect(b.cx).toBe(m.gutter / 2);
      expect(b.bottom - b.top).toBeGreaterThanOrEqual(m.pitch); // S8b-02: room for a 32 px tap area
      expect(b.cy).toBeCloseTo(b.top + m.pitch / 2, 5);
      expect(rowsOf(l, b.laneKey)[0]!.cy).toBeCloseTo(b.cy, 5);
      const rows = rowsOf(l, b.laneKey);
      expect(rows[0]!.y - rows[0]!.labelLane).toBeGreaterThanOrEqual(b.top);
      expect(rows.at(-1)!.y + rows.at(-1)!.height).toBeLessThanOrEqual(b.bottom);
    }
    for (let i = 1; i < l.badges.length; i++) expect(l.badges[i]!.top).toBeGreaterThanOrEqual(l.badges[i - 1]!.bottom);
  });

  it("S10-02: a badge's text is the subject; its accessible name adds the group only when the family has more than one child", () => {
    const two = layoutTimeline(sample, { zoom: "year", width: 360 });
    for (const b of two.badges) expect([b.text, b.label]).toEqual([b.subjectName, `${b.subjectName} · ${b.childName}`]);
    expect(two.badges[0]!.label).toBe("History · Together");
    const one = layoutTimeline(synth([["a", 0, 9, 3]]), { zoom: "year", width: 360 });
    expect(one.badges.map((x) => x.label)).toEqual(["Math"]);
    const both = layoutTimeline(synth([["a", 0, 9, 3]], 2), { zoom: "year", width: 360 });
    expect(both.badges.map((x) => x.label)).toEqual(["Math · Frank", "Math · Margaret"]);
  });

  it("S10-02: there are no name rows: a lane is one pitch tall plus a sub-row step for each extra row", () => {
    const l = layoutTimeline(sample, { zoom: "year", width: 1280 });
    const m = DESKTOP_METRICS;
    expect("labels" in l).toBe(false);
    for (const b of l.badges) expect(b.bottom - b.top).toBe(m.pitch + (rowsOf(l, b.laneKey).length - 1) * m.sub);
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
    // S10-04c: this bar sits right under its group header, so its box starts at the header's foot (still 44 px tall).
    const foot = l.groups[0]!.header.y + l.groups[0]!.header.height;
    expect(hitTest(l, cx, foot)?.assignmentId).toBe("a");
    expect(hitTest(l, cx, foot - 1)).toBeNull();
    expect(hitTest(l, cx + 21, foot + MIN_TAP_PX)?.assignmentId).toBe("a");
    expect(hitTest(l, cx, foot + MIN_TAP_PX + 1)).toBeNull();
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

/** S7-21: one assignment over 40 school weeks at 4 points a day, with a two-week sprint of 20 a day in the middle. */
function sprintModel() {
  const grid = buildDayGrid("2026-09-07", "2027-06-04", [1, 2, 3, 4, 5]);
  const school = grid.dates.map((_, i) => i).filter((i) => grid.schoolDay[i]);
  const daily = Array.from({ length: grid.dates.length }, () => 0);
  school.forEach((gi, k) => { daily[gi] = k >= 100 && k < 110 ? 20 : 4; });
  const base = synth([["a", 0, 0, 1]]);
  const a: TimelineAssignment = {
    assignmentId: "sprint", childId: "frank", title: "Sprint", daily, weekly: daily, first: school[0]!, last: school.at(-1)!,
    end: grid.dates[school.at(-1)!]!, plannedEnd: grid.dates[school.at(-1)!]!, estimated: false, complete: false, warnings: [],
  };
  const model: TimelineModel = {
    ...base, ...grid, today: "2026-09-08", todayIndex: 1,
    lanes: [{ ...base.lanes[0]!, children: [{ ...base.lanes[0]!.children[0]!, assignments: [a] }] }],
    totals: { daily, weekly: daily },
  };
  return { model, grid, school, daily };
}

describe("zoom smoothing and effort heights (S10-04)", () => {
  it("at Year zoom a two-week sprint is spread by the 3-week smoothing: one bar, within the bar bounds", () => {
    const { model } = sprintModel();
    const l = layoutTimeline(model, { zoom: "year", width: 1280 });
    expect(l.detail).toBe("smooth");
    const band = l.bands[0]!;
    const h = ys(band.d).map((y) => Math.abs(y - band.cy) * 2);
    expect(Math.max(...h)).toBeLessThanOrEqual(l.metrics.barMax + 1e-6);
    expect(band.runs.length).toBe(1); // one bar, start to end
  });

  it("a heavier assignment is still a thicker band in the same view", () => {
    const light = sprintModel();
    const lane = light.model.lanes[0]!;
    const a = lane.children[0]!.assignments[0]!;
    const heavyDaily = light.daily.map((v) => v * 2);
    const both = { ...light.model, lanes: [{ ...lane, children: [{ ...lane.children[0]!, assignments: [a, { ...a, assignmentId: "heavy", daily: heavyDaily, weekly: heavyDaily }] }] }] };
    const l = layoutTimeline(both, { zoom: "month", width: 1280, month: "2026-10" });
    const top = (id: string) => { const b = l.bands.find((x) => x.assignmentId === id)!; return Math.max(...ys(b.d).map((y) => Math.abs(y - b.cy))); };
    // The heavy one sits on an extra row (80 %), so compare against that row's own curve.
    expect(top("heavy")).toBeGreaterThan(top("sprint") * EXTRA_ROW_FACTOR);
  });

  it("daily detail: at This month the sprint's real steps show, the sprint at the maximum", () => {
    const { model } = sprintModel();
    const l = layoutTimeline(model, { zoom: "month", width: 1280, month: "2027-01" });
    expect(l.detail).toBe("daily");
    // 4 a day most of the year and 20 for 10 of ~190 school days: the 95th percentile falls below 20, so the sprint clamps.
    expect(l.viewMax).toBeLessThan(20);
    const band = l.bands[0]!;
    const peak = Math.max(...ys(band.d).map((y) => Math.abs(y - band.cy)));
    expect(peak * 2).toBeCloseTo(l.metrics.barMax, 3);
  });
});

describe("axis labels and the Today line (S7-19)", () => {
  const cases = (["2026-09", "2026-10", "2026-11", "2026-12", "2027-01", "2027-02"] as const).flatMap((m) =>
    (["month", "fall", "spring", "year"] as const).flatMap((zoom) => WIDTHS.map((width) => ({ m, zoom, width }))));

  it("a day label never touches a month label, on any range or width", () => {
    for (const c of cases) {
      const l = layoutTimeline(sample, { zoom: c.zoom, width: c.width, month: c.m });
      const months = l.ticks.filter((t) => t.kind === "month" && t.label);
      for (const w of l.ticks.filter((t) => t.kind === "week" && t.label)) {
        for (const mo of months) {
          const gap = w.x >= mo.x ? w.x - mo.x : mo.x - w.x;
          expect(gap, `${c.zoom} ${c.m} ${c.width}: ${w.label} vs ${mo.label}`).toBeGreaterThanOrEqual(w.x >= mo.x ? MONTH_LABEL_CLEAR_PX : DAY_LABEL_CLEAR_PX);
        }
      }
    }
  });

  it("a day label is dropped (its tick stays) when it would touch a month label", () => {
    // A week line within a month label's width of a labelled month start loses its number but keeps its line.
    const dropped = cases.flatMap((c) => {
      const l = layoutTimeline(sample, { zoom: c.zoom, width: c.width, month: c.m });
      const months = l.ticks.filter((t) => t.kind === "month" && t.label);
      return l.ticks.filter((t) => t.kind === "week" && !t.label && months.some((mo) => Math.abs(t.x - mo.x) < MONTH_LABEL_CLEAR_PX));
    });
    expect(dropped.length).toBeGreaterThan(0);
  });

  it("the dashed Today line starts at the foot of the two-line axis (S10-03: 42 px phone, 44 px desktop)", () => {
    const l = layoutTimeline(sample, { zoom: "year", width: 1280 });
    expect(l.todayX).not.toBeNull();
    expect(l.todayTop).toBe(DESKTOP_METRICS.axis);
    expect(layoutTimeline(sample, { zoom: "year", width: 360 }).todayTop).toBe(PHONE_METRICS.axis);
    expect(PHONE_METRICS.axis).toBe(AXIS_HEIGHT_PX);
    const empty = layoutTimeline({ ...sample, lanes: [] }, { zoom: "year", width: 1280 });
    expect(empty.badges).toHaveLength(0);
    expect(empty.todayTop).toBe(DESKTOP_METRICS.axis);
  });
});

describe("the soft cap on bar height (S6b-06)", () => {
  it("is unchanged up to the knee, strictly increasing above it, and never above the maximum", () => {
    for (const px of [1, 10, 28, SOFT_CAP_KNEE_PX]) expect(softCapPx(px)).toBe(px);
    let last = SOFT_CAP_KNEE_PX;
    for (const px of [57, 70, 100, 150, 280, 500, 840, 2000]) {
      const v = softCapPx(px);
      expect(v).toBeGreaterThan(last);
      expect(v).toBeLessThanOrEqual(MAX_BAR_PX);
      last = v;
    }
    expect(softCapPx(1e9)).toBe(MAX_BAR_PX);
    expect(softCapPx(Number.POSITIVE_INFINITY)).toBe(0);
  });

  it("S7-18: at normal effort 20 pages a day is 56 px; 60 < 100 < 300 pages a day by at least 6 px each; a 1,000-page typo stops at the maximum", () => {
    const pagesADay = (n: number) => thicknessToPx(n); // pages weigh 1 point each
    expect(pagesADay(20)).toBe(56);
    expect(pagesADay(100) - pagesADay(60)).toBeGreaterThanOrEqual(6);
    expect(pagesADay(300) - pagesADay(100)).toBeGreaterThanOrEqual(6);
    expect(pagesADay(300)).toBeLessThan(MAX_BAR_PX);
    expect(pagesADay(1000)).toBeLessThanOrEqual(MAX_BAR_PX);
    expect(MAX_BAR_PX).toBe(112);
    // Monotonic over a fine sweep, and never above the maximum.
    let last = 0;
    for (let px = 1; px <= 5000; px += 1) {
      const v = softCapPx(px);
      expect(v).toBeGreaterThanOrEqual(last);
      expect(v).toBeLessThanOrEqual(MAX_BAR_PX);
      last = v;
    }
  });

  it("draws nothing for non-finite, zero or negative input", () => {
    for (const bad of [Number.NaN, -3, 0, Number.NEGATIVE_INFINITY]) {
      expect(softCapPx(bad)).toBe(0);
      expect(thicknessToPx(bad)).toBe(0);
    }
  });

  it("S10-04: no bar is taller than BAR_H_MAX or shorter than BAR_H_MIN, at every zoom, however huge a load is", () => {
    const m = synth([["huge", 0, 20, 300], ["normal", 22, 25, 10]]);
    for (const width of WIDTHS) for (const zoom of ZOOMS) {
      const l = layoutTimeline(m, { zoom, width });
      const rows = rowsOf(l, "math:frank");
      expect(rows.length).toBeGreaterThan(0);
      for (const r of rows) expect(r.height).toBeLessThanOrEqual(l.metrics.barMax + 1e-9);
      for (const b of l.bands) {
        const v = ys(b.d).map((y) => Math.abs(y - b.cy) * 2);
        if (v.length === 0) continue;
        expect(Math.max(...v)).toBeLessThanOrEqual(l.metrics.barMax + 1e-3);
        expect(Math.max(...v)).toBeGreaterThanOrEqual(l.metrics.barMin - 1e-3);
      }
    }
  });
});

describe("spacing between bars (S6b-10)", () => {
  it("S10-02: uses the mockup's spacing: lane pitch, sub-row step and group gap", () => {
    expect([PHONE_METRICS.pitch, PHONE_METRICS.sub, PHONE_METRICS.groupGap]).toEqual([36, 28, 10]);
    expect([DESKTOP_METRICS.pitch, DESKTOP_METRICS.sub, DESKTOP_METRICS.groupGap]).toEqual([40, 30, 12]);
  });

  it.each(WIDTHS)("in the sample family at %i px, every row starts at least 2 px under the one above, at any zoom", (width) => {
    for (const zoom of ZOOMS) {
      const l = layoutTimeline(sample, { zoom, width });
      for (let i = 1; i < l.rows.length; i++) {
        const prev = l.rows[i - 1]!;
        expect(l.rows[i]!.y).toBeGreaterThanOrEqual(prev.y + prev.height + 2);
      }
      // S10-02: the first row clears its group's header row.
      expect(l.rows[0]!.y).toBeGreaterThanOrEqual(l.groups[0]!.top + l.metrics.header);
    }
  });

  it("a name outside a thin bar still sits clear of the bar above it", () => {
    const m = synth([["thick", 0, 9, 10], ["thin", 12, 25, 0.5]]);
    const l = layoutTimeline(m, { zoom: "year", width: 360 });
    for (const r of l.rows) expect(r.labelLane).toBeGreaterThanOrEqual(0);
    const rows = rowsOf(l, "math:frank");
    for (let i = 1; i < rows.length; i++) expect(rows[i]!.y - rows[i]!.labelLane).toBeGreaterThanOrEqual(rows[i - 1]!.y + rows[i - 1]!.height + 2);
  });
});

describe("an empty calendar (S6b-09)", () => {
  it.each(WIDTHS)("zero lanes still give month ticks, today, days off and events, at %i px, at every zoom", (width) => {
    const empty: TimelineModel = { ...sample, lanes: [], totals: { daily: sample.totals.daily.map(() => 0), weekly: sample.totals.weekly.map(() => 0) } };
    for (const zoom of ZOOMS) {
      const l = layoutTimeline(empty, { zoom, width });
      expect(l.rows).toEqual([]);
      expect(l.bands).toEqual([]);
      expect(l.ticks.filter((t) => t.kind === "month").length).toBeGreaterThan(0);
      expect(l.height).toBeGreaterThan(0);
    }
    expect(layoutTimeline(empty, { zoom: "year", width }).breaks.length).toBeGreaterThan(0);
    expect(layoutTimeline(empty, { zoom: "year", width: 1280 }).todayX).not.toBeNull();
    expect(layoutTimeline(empty, { zoom: "year", width: 1280, detail: "daily" }).events.length).toBe(empty.events.length);
  });
});
