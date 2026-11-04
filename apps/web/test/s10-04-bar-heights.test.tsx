/** S10-04: bar heights follow effort at every zoom, between BAR_H_MIN and BAR_H_MAX, scaled to the view's 95th percentile. */
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it } from "vitest";
import { forChild } from "../src/features/timeline/childView";
import { buildDayGrid } from "../src/features/timeline/grid";
import {
  BAR_CURVE, BAR_H_MAX, BAR_H_MIN, DESKTOP_METRICS, EXTRA_ROW_FACTOR, PHONE_METRICS, RIBBON_H_MAX, RIBBON_H_MIN, SMOOTH_TERM_DAYS,
  SMOOTH_YEAR_DAYS, VIEW_MAX_PERCENTILE, YEAR_SMOOTH_FROM_WEEKS, effortHeight, layoutTimeline, metricsFor, parseBarsOverride, percentile,
  smoothingWindowDays,
} from "../src/features/timeline/layout";
import { buildTimelineModel, type TimelineAssignment, type TimelineModel } from "../src/features/timeline/model";
import { useBarsOverride } from "../src/features/timeline/useBarsOverride";
import { SAMPLE_CHILDREN, sampleInput } from "./helpers/timeline-fixtures";

const ys = (d: string) => [...d.matchAll(/,(-?[\d.]+)|V(-?[\d.]+)/g)].map((m) => Number(m[1] ?? m[2]));
const peakOf = (d: string, cy: number) => Math.max(...ys(d).map((y) => Math.abs(y - cy) * 2));

/** One subject, one child, one assignment per entry, each on its own non-overlapping stretch of a 6-week grid. */
function model(specs: ReadonlyArray<readonly [id: string, first: number, last: number, value: number]>): TimelineModel {
  const grid = buildDayGrid("2026-09-07", "2026-10-16", [1, 2, 3, 4, 5]);
  const n = grid.dates.length;
  const series = (f: number, l: number, v: number) => Array.from({ length: n }, (_, i) => (i >= f && i <= l && grid.schoolDay[i] ? v : 0));
  const k = SAMPLE_CHILDREN[0]!;
  const assignment = ([id, f, l, v]: readonly [string, number, number, number]): TimelineAssignment => ({
    assignmentId: id, childId: k.id, title: id, daily: series(f, l, v), weekly: series(f, l, v), first: f, last: l,
    end: grid.dates[l]!, plannedEnd: grid.dates[l]!, estimated: false, complete: false, warnings: [],
  });
  return {
    ...grid, weekStart: "mon", today: "2026-09-08", todayIndex: 1, breaks: [], events: [],
    children: [{ childId: k.id, name: k.name }],
    lanes: [{ subjectId: "math", name: "Math", paletteSlot: 2, children: [{ key: `math:${k.id}`, subjectId: "math", childId: k.id, childName: k.name, step: "base", assignments: specs.map(assignment), daily: [], weekly: [] }] }],
    totals: { daily: Array(n).fill(0), weekly: Array(n).fill(0) },
  };
}

describe("the height formula", () => {
  it("is named and tunable in one place", () => {
    expect(BAR_H_MIN).toEqual({ phone: 8, desktop: 8 });
    expect(BAR_H_MAX).toEqual({ phone: 28, desktop: 32 });
    expect(BAR_CURVE).toBe(1.5);
    expect(VIEW_MAX_PERCENTILE).toBe(0.95);
    expect([PHONE_METRICS.barMin, PHONE_METRICS.barMax, DESKTOP_METRICS.barMin, DESKTOP_METRICS.barMax]).toEqual([8, 28, 8, 32]);
    expect([PHONE_METRICS.ribbonMin, PHONE_METRICS.ribbonMax, DESKTOP_METRICS.ribbonMin, DESKTOP_METRICS.ribbonMax]).toEqual([RIBBON_H_MIN.phone, RIBBON_H_MAX.phone, RIBBON_H_MIN.desktop, RIBBON_H_MAX.desktop]);
  });

  it("0 draws nothing, any load at least the minimum, the view maximum (and above) exactly the maximum, rising smoothly between", () => {
    expect(effortHeight(0, 10, 8, 32)).toBe(0);
    expect(effortHeight(Number.NaN, 10, 8, 32)).toBe(0);
    expect(effortHeight(1e-6, 10, 8, 32)).toBeCloseTo(8, 3);
    expect(effortHeight(10, 10, 8, 32)).toBeCloseTo(32, 9);
    expect(effortHeight(500, 10, 8, 32)).toBeCloseTo(32, 9); // clamped
    let last = 0;
    for (let load = 0.5; load <= 10; load += 0.5) {
      const h = effortHeight(load, 10, 8, 32);
      expect(h).toBeGreaterThan(last);
      expect(h).toBeGreaterThanOrEqual(8);
      expect(h).toBeLessThanOrEqual(32);
      last = h;
    }
    // The curve lifts light loads above a straight line, and curve 0 is the straight line.
    expect(effortHeight(5, 10, 8, 32)).toBeGreaterThan(20);
    expect(effortHeight(5, 10, 8, 32, 0)).toBeCloseTo(20, 6);
  });

  it("percentile interpolates and is 0 for nothing", () => {
    expect(percentile([], 0.95)).toBe(0);
    expect(percentile([7], 0.95)).toBe(7);
    expect(percentile([1, 2, 3, 4, 5], 0.5)).toBe(3);
    expect(percentile([0, 10], 0.95)).toBeCloseTo(9.5, 9);
  });
});

describe("scaled to the current view", () => {
  it("the view maximum is the 95th percentile of loads, so one outlier clamps instead of flattening everything else", () => {
    // 29 school days at 4, one at 100.
    const m = model([["steady", 0, 40, 4]]);
    const a = m.lanes[0]!.children[0]!.assignments[0]!;
    const spike = a.daily.findIndex((v) => v > 0) + 5;
    a.daily[spike] = 100;
    a.weekly[spike] = 100;
    const l = layoutTimeline(m, { zoom: "month", width: 1280, month: "2026-09" });
    expect(l.detail).toBe("daily");
    expect(l.viewMax).toBeLessThan(100);
    const band = l.bands[0]!;
    // Ordinary days are near the top of the range, not squashed to the minimum by the spike.
    expect(Math.min(...ys(band.d).map((y) => Math.abs(y - band.cy) * 2))).toBeGreaterThan(DESKTOP_METRICS.barMax * 0.6);
    expect(peakOf(band.d, band.cy)).toBeLessThanOrEqual(DESKTOP_METRICS.barMax + 1e-9);
  });

  it("a uniformly light plan still uses the range (heights are relative to the view, not absolute)", () => {
    const heavy = layoutTimeline(model([["a", 0, 9, 1], ["b", 10, 19, 2]]), { zoom: "year", width: 1280 });
    const light = layoutTimeline(model([["a", 0, 9, 10], ["b", 10, 19, 20]]), { zoom: "year", width: 1280 });
    expect(heavy.rows.map((r) => r.height)).toEqual(light.rows.map((r) => r.height));
  });

  it("All children counts shared work once; one child is scaled to that child alone (rescaling is expected)", () => {
    const family = buildTimelineModel(sampleInput());
    const all = layoutTimeline(family, { zoom: "year", width: 1280 });
    expect(all.viewMax).toBeGreaterThan(0);
    for (const child of family.children) {
      const one = layoutTimeline(forChild(family, child.childId), { zoom: "year", width: 1280 });
      expect(one.viewMax).toBeGreaterThan(0);
      for (const b of one.bands) expect(peakOf(b.d, b.cy)).toBeLessThanOrEqual(one.metrics.barMax + 1e-6);
    }
  });

  it("extra rows top out at 80 % of the maximum, with the same minimum", () => {
    const l = layoutTimeline(model([["a", 0, 19, 5], ["b", 5, 14, 5]]), { zoom: "month", width: 1280, month: "2026-09" });
    const rows = l.rows.filter((r) => r.laneKey === "math:frank");
    expect(rows).toHaveLength(2);
    expect(rows[0]!.height).toBeCloseTo(DESKTOP_METRICS.barMax, 6);
    expect(rows[1]!.height).toBeCloseTo(DESKTOP_METRICS.barMax * EXTRA_ROW_FACTOR, 6);
  });
});

describe("smoothing per zoom", () => {
  it("Year smooths over about three weeks, a term over about one, daily detail not at all", () => {
    expect(smoothingWindowDays("smooth", YEAR_SMOOTH_FROM_WEEKS + 1)).toBe(SMOOTH_YEAR_DAYS);
    expect(smoothingWindowDays("smooth", 18)).toBe(SMOOTH_TERM_DAYS);
    expect(smoothingWindowDays("daily", 4)).toBe(0);
    expect(smoothingWindowDays("weekly", 12)).toBe(0);
    expect(SMOOTH_YEAR_DAYS).toBeGreaterThan(SMOOTH_TERM_DAYS);
  });

  it("at Year zoom a change in load eases over the smoothing window (no step)", () => {
    const year = buildDayGrid("2026-09-07", "2027-06-04", [1, 2, 3, 4, 5]);
    const m = model([["a", 0, 0, 1]]);
    const a = m.lanes[0]!.children[0]!.assignments[0]!;
    const school = year.dates.map((_, i) => i).filter((i) => year.schoolDay[i]);
    const daily = year.dates.map((_, i) => (year.schoolDay[i] ? (school.indexOf(i) < school.length / 2 ? 1 : 8) : 0));
    const last = school[school.length - 1]!;
    const wide: TimelineModel = {
      ...m, ...year, totals: { daily: Array(year.dates.length).fill(0), weekly: Array(year.dates.length).fill(0) },
      lanes: [{ ...m.lanes[0]!, children: [{ ...m.lanes[0]!.children[0]!, assignments: [{ ...a, daily, weekly: daily, first: school[0]!, last, end: year.dates[last]!, plannedEnd: year.dates[last]! }] }] }],
    };
    const l = layoutTimeline(wide, { zoom: "year", width: 1280 });
    expect(l.detail).toBe("smooth");
    const band = l.bands[0]!;
    expect(band.d).toMatch(/C/);
    const heights = [...new Set(ys(band.d).map((y) => Math.round(Math.abs(y - band.cy) * 20) / 10))];
    // More than a low and a high: the bar passes through heights in between.
    expect(heights.length).toBeGreaterThan(3);
  });
});

describe("the children's ribbons follow the same curve", () => {
  it("every ribbon sits within the ribbon range", () => {
    const family = buildTimelineModel(sampleInput());
    for (const width of [360, 1280]) {
      const l = layoutTimeline(family, { zoom: "month", width });
      const ribbons = l.groups.map((g) => g.header.ribbon).filter(Boolean);
      expect(ribbons.length).toBeGreaterThan(0);
      for (const d of ribbons) {
        const v = ys(d);
        expect(Math.max(...v) - Math.min(...v)).toBeLessThanOrEqual(l.metrics.ribbonMax + 1e-6);
      }
    }
  });
});

describe("the dev-only override (?debug=1&bars=min,max,curve)", () => {
  it("parses min,max,curve, ignoring bad parts", () => {
    expect(parseBarsOverride("6,36,2")).toEqual({ min: 6, max: 36, curve: 2 });
    expect(parseBarsOverride(",40,")).toEqual({ min: undefined, max: 40, curve: undefined });
    expect(parseBarsOverride("x,y,z")).toBeNull();
    expect(parseBarsOverride(null)).toBeNull();
  });

  it("changes the metrics and the drawn heights; the pitch grows with the maximum", () => {
    const m = metricsFor(1280, { min: 6, max: 40, curve: 2 });
    expect([m.barMin, m.barMax, m.curve, m.pitch]).toEqual([6, 40, 2, 48]);
    expect(m.sub).toBeGreaterThanOrEqual(Math.ceil(40 * EXTRA_ROW_FACTOR) + 4);
    const l = layoutTimeline(model([["a", 0, 19, 5]]), { zoom: "month", width: 1280, month: "2026-09", bars: { max: 40 } });
    expect(l.rows[0]!.height).toBeCloseTo(40, 6);
  });

  it("only applies with ?debug=1 (a dev build)", () => {
    const at = (url: string) => renderHook(() => useBarsOverride(), { wrapper: ({ children }: { children: ReactNode }) => <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter> }).result.current;
    expect(at("/schedule?debug=1&bars=6,36,2")).toEqual({ min: 6, max: 36, curve: 2 });
    expect(at("/schedule?bars=6,36,2")).toBeNull();
    expect(at("/schedule?debug=1")).toBeNull();
  });
});
