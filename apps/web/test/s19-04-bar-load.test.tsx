/** S19-04: a steady 40-minute day is plainly thinner than a steady 150-minute day, and the fill is a little stronger. */
import { describe, expect, it } from "vitest";
import { forChild } from "../src/features/timeline/childView";
import { buildDayGrid } from "../src/features/timeline/grid";
import { BAR_H_MIN, effortHeight, layoutTimeline } from "../src/features/timeline/layout";
import type { TimelineAssignment, TimelineModel } from "../src/features/timeline/model";
import { BAR_STRONG_MIX } from "../src/features/timeline/Timeline";
import { CHROME, composite, contrast, mix, swatches, THEME_NAMES } from "../scripts/palette";

const ys = (d: string) => [...d.matchAll(/,(-?[\d.]+)|V(-?[\d.]+)/g)].map((m) => Number(m[1] ?? m[2]));
const peakOf = (d: string, cy: number) => Math.max(...ys(d).map((y) => Math.abs(y - cy) * 2));

/** Thickness the engine stores: minutes a day ÷ 2. */
const LIGHT = 40 / 2;
const HEAVY = 150 / 2;

function year(spike: boolean): TimelineModel {
  const grid = buildDayGrid("2026-08-17", "2027-05-28", [1, 2, 3, 4, 5]);
  const n = grid.dates.length;
  const spikeAt = grid.dates.findIndex((d) => d === "2026-11-02");
  const series = (v: number, hot: boolean) => Array.from({ length: n }, (_, i) => {
    if (!grid.schoolDay[i]) return 0;
    return hot && spike && i >= spikeAt && i < spikeAt + 5 ? 400 : v;
  });
  const child = (id: string): TimelineAssignment[] => [
    { assignmentId: `${id}-light`, childId: id, title: "Light", daily: series(LIGHT, false), weekly: series(LIGHT, false), first: 0, last: n - 1, end: "2027-05-28", plannedEnd: "2027-05-28", estimated: false, complete: false, warnings: [] },
    { assignmentId: `${id}-heavy`, childId: id, title: "Heavy", daily: series(HEAVY, true), weekly: series(HEAVY, true), first: 0, last: n - 1, end: "2027-05-28", plannedEnd: "2027-05-28", estimated: false, complete: false, warnings: [] },
  ];
  const lane = (id: string, name: string) => ({
    key: `sub:${id}`, subjectId: "sub", childId: id, childName: name, step: "base" as const,
    assignments: child(id), daily: [], weekly: [],
  });
  return {
    ...grid, weekStart: "mon", today: "2026-11-05", todayIndex: grid.dates.indexOf("2026-11-05"), breaks: [], events: [],
    children: [{ childId: "c1", name: "Frank" }, { childId: "c2", name: "Margaret" }],
    lanes: [{ subjectId: "sub", name: "Math", paletteSlot: 1, children: [lane("c1", "Frank"), lane("c2", "Margaret")] }],
    totals: { daily: Array(n).fill(0), weekly: Array(n).fill(0) },
  };
}

function ratio(model: TimelineModel, zoom: "year" | "fall" | "month", width: number) {
  const l = layoutTimeline(model, { zoom, width, ...(zoom === "month" ? { month: "2026-11" } : {}) });
  const light = l.bands.find((b) => b.assignmentId.endsWith("-light"))!;
  const heavy = l.bands.find((b) => b.assignmentId.endsWith("-heavy"))!;
  const lh = peakOf(light.d, light.cy);
  const hh = peakOf(heavy.d, heavy.cy);
  return { lh, hh, min: l.metrics.barMin };
}

describe("bar thickness (S19-04)", () => {
  it("a 40-minute bar is at least 1.5 times thinner than a 150-minute bar, and not stuck on the minimum", () => {
    const model = year(false);
    for (const width of [390, 1280]) {
      for (const zoom of ["year", "fall", "month"] as const) {
        for (const view of [model, forChild(model, "c1")]) {
          const { lh, hh, min } = ratio(view, zoom, width);
          expect(hh).toBeGreaterThanOrEqual(lh * 1.5);
          expect(lh).toBeGreaterThan(min);
          expect(lh).toBeGreaterThan(BAR_H_MIN.phone);
        }
      }
    }
  });

  it("one very heavy week does not squash the 150-minute bar down to the 40-minute one", () => {
    const { lh, hh } = ratio(year(true), "year", 1280);
    expect(hh).toBeGreaterThanOrEqual(lh * 1.5);
  });

  it("the straight-line end of the curve still separates 40 minutes from 150", () => {
    const max = 28;
    const light = effortHeight(LIGHT, HEAVY, 8, max, 0);
    const heavy = effortHeight(HEAVY, HEAVY, 8, max, 0);
    expect(heavy).toBeGreaterThanOrEqual(light * 1.5);
  });

  it.each(THEME_NAMES)("inside names keep AA on the stronger fill, including a dimmed bar (%s)", (theme) => {
    const failures: string[] = [];
    for (const s of swatches(theme)) {
      const painted = mix(s.color, s.strong, BAR_STRONG_MIX);
      if (contrast(s.label, painted) < 4.5) failures.push(`${s.subject}/${s.step} solid`);
      const dimmed = composite(painted, CHROME[theme].background!, 0.7);
      if (contrast(s.label, dimmed) < 4.5) failures.push(`${s.subject}/${s.step} dim`);
    }
    expect(failures).toEqual([]);
    expect(BAR_STRONG_MIX).toBeGreaterThan(0);
    expect(BAR_STRONG_MIX).toBeLessThan(0.5);
  });
});
