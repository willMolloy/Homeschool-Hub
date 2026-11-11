/** S19-04: a steady 40-minute day is plainly thinner than a steady 150-minute day, and the fill is a little stronger. */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { forChild } from "../src/features/timeline/childView";
import { buildDayGrid } from "../src/features/timeline/grid";
import { BAR_H_MIN, effortHeight, layoutTimeline } from "../src/features/timeline/layout";
import type { TimelineAssignment, TimelineModel } from "../src/features/timeline/model";
import { BAR_STRONG_MIX, bandFill } from "../src/features/timeline/Timeline";
import type { ChildStep } from "../src/features/timeline/model";
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

  it("a seed-like year, where 150 minutes does not set the cap, still keeps 40 at least 1.5 times thinner (M1)", () => {
    // Twenty books near 56 minutes, one at 40, one at 150. The 150 is under 5% of the samples, so the 95th percentile stays near 56.
    const grid = buildDayGrid("2026-08-17", "2027-05-28", [1, 2, 3, 4, 5]);
    const n = grid.dates.length;
    const school = grid.dates.map((_, i) => (grid.schoolDay[i] ? 1 : 0));
    const steady = (v: number) => school.map((on) => on * v);
    const k = "c1";
    const assignment = (id: string, daily: number[]): TimelineAssignment => ({
      assignmentId: id, childId: k, title: id, daily, weekly: daily, first: 0, last: n - 1,
      end: "2027-05-28", plannedEnd: "2027-05-28", estimated: false, complete: false, warnings: [],
    });
    const model: TimelineModel = {
      ...grid, weekStart: "mon", today: "2026-11-05", todayIndex: grid.dates.indexOf("2026-11-05"), breaks: [], events: [],
      children: [{ childId: k, name: "Elias" }],
      lanes: [{
        subjectId: "sub", name: "Math", paletteSlot: 1, children: [{
          key: `sub:${k}`, subjectId: "sub", childId: k, childName: "Elias", step: "base",
          assignments: [
            ...Array.from({ length: 20 }, (_, i) => assignment(`usual-${i}`, steady(28))),
            assignment("light", steady(20)),
            assignment("heavy", steady(75)),
          ],
          daily: [], weekly: [],
        }],
      }],
      totals: { daily: [], weekly: [] },
    };
    for (const zoom of ["year", "fall"] as const) {
      for (const width of [390, 1280]) {
        const l = layoutTimeline(model, { zoom, width });
        expect(l.viewMax).toBeLessThan(75);
        const light = l.bands.find((b) => b.assignmentId === "light")!;
        const heavy = l.bands.find((b) => b.assignmentId === "heavy")!;
        const lh = peakOf(light.d, light.cy);
        const hh = peakOf(heavy.d, heavy.cy);
        expect(hh).toBeGreaterThanOrEqual(lh * 1.5);
      }
    }
  });

  it("every colour variable an ended bar's fill names is defined for every subject step (H1)", () => {
    const css = readFileSync("src/styles/tokens.css", "utf8");
    const light = css.slice(css.indexOf(":root {"), css.indexOf('[data-theme="dark"]'));
    const dark = css.slice(css.indexOf('[data-theme="dark"]'));
    const steps: ChildStep[] = ["base", "light", "dark"];
    const missing: string[] = [];
    for (let slot = 1; slot <= 12; slot++) {
      for (const step of steps) {
        const fill = bandFill(slot, step);
        expect(fill).not.toMatch(/-light-strong|-dark-strong/);
        for (const name of fill.matchAll(/var\((--[\w-]+)\)/g)) {
          const token = `${name[1]}:`;
          if (!light.includes(token)) missing.push(`light ${token} via ${step}`);
          if (!dark.includes(token)) missing.push(`dark ${token} via ${step}`);
        }
      }
    }
    expect(missing).toEqual([]);
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
