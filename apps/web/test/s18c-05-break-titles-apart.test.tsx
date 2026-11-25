// S18c-05: adjacent long-break titles do not draw on top of each other.
import { describe, expect, it } from "vitest";
import { buildDayGrid } from "../src/features/timeline/grid";
import { layoutTimeline } from "../src/features/timeline/layout";
import type { TimelineModel } from "../src/features/timeline/model";

function overlaps(a: { x: number; y: number; width: number }, b: { x: number; y: number; width: number }): boolean {
  const half = 6;
  const vertical = Math.abs(a.y - b.y) < half * 2;
  const horizontal = a.x < b.x + b.width && b.x < a.x + a.width;
  return vertical && horizontal;
}

describe("adjacent break titles stay apart (S18c-05)", () => {
  const grid = buildDayGrid("2026-08-17", "2027-05-28", [1, 2, 3, 4, 5]);
  const model: TimelineModel = {
    ...grid, weekStart: "mon", today: "2026-11-05", todayIndex: Math.max(0, grid.dates.indexOf("2026-11-05")),
    events: [], children: [{ childId: "c1", name: "Elias" }],
    lanes: [{
      subjectId: "lit", name: "Literature", paletteSlot: 1,
      children: [{
        key: "lit:c1", subjectId: "lit", childId: "c1", childName: "Elias", step: "base",
        assignments: [], daily: [], weekly: [],
      }],
    }],
    totals: { daily: [], weekly: [] },
    breaks: [
      { id: "xmas", label: "Christmas break", kind: "vacation", first: grid.dates.indexOf("2026-12-14"), last: grid.dates.indexOf("2026-12-27"), childIds: [] },
      { id: "visit", label: "Family visit", kind: "vacation", first: grid.dates.indexOf("2027-02-01"), last: grid.dates.indexOf("2027-02-14"), childIds: [] },
    ],
  };

  it("does not overlap at 360 or 440, and both titles still read in full at 1280", () => {
    for (const width of [360, 440, 1280]) {
      const layout = layoutTimeline(model, { zoom: "year", width });
      const titles = layout.breaks.map((b) => b.title).filter((t): t is NonNullable<typeof t> => t !== null);
      expect(titles).toHaveLength(2);
      expect(overlaps(titles[0]!, titles[1]!)).toBe(false);
      for (const t of titles) {
        expect(t.x).toBeGreaterThanOrEqual(layout.plot.x);
        expect(t.x + t.width).toBeLessThanOrEqual(layout.plot.x + layout.plot.width + 0.5);
      }
      if (width === 1280) {
        expect(titles.map((t) => t.text).sort()).toEqual(["Christmas break", "Family visit"]);
      } else {
        expect(titles.every((t) => t.text.length > 0)).toBe(true);
        expect(new Set(titles.map((t) => t.text)).size).toBe(2);
      }
    }
  });

  it("a single long title is only shortened to the plot, as before", () => {
    const solo: TimelineModel = {
      ...model,
      breaks: [{
        id: "spring", label: "Spring holiday with both sets of grandparents, the cousins, and a week at the lake", kind: "vacation",
        first: grid.dates.indexOf("2027-05-17"), last: grid.dates.indexOf("2027-05-28"), childIds: [],
      }],
    };
    const one = layoutTimeline(solo, { zoom: "year", width: 360 });
    const title = one.breaks[0]!.title!;
    expect(title.text.endsWith("…")).toBe(true);
    expect(title.text.length).toBeLessThan(solo.breaks[0]!.label!.length);
  });
});
