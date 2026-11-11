/** S19-06: regular weekly days off stay off the year view. A named break of a week or longer shows its title. */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { weekdayOf } from "@hh/engine";
import { buildDayGrid } from "../src/features/timeline/grid";
import { layoutTimeline } from "../src/features/timeline/layout";
import type { TimelineModel } from "../src/features/timeline/model";
import { Timeline } from "../src/features/timeline/Timeline";
import { showsWeeklyOffs, spanWeeks, zoomRange } from "../src/features/timeline/zoom";

const SCHOOL = [1, 2, 4, 5];

function model(from: string, to: string, breaks: TimelineModel["breaks"] = []): TimelineModel {
  const grid = buildDayGrid(from, to, SCHOOL);
  return {
    ...grid, weekStart: "mon", today: "2026-11-05", todayIndex: Math.max(0, grid.dates.indexOf("2026-11-05")),
    breaks, events: [], children: [{ childId: "c1", name: "Elias" }],
    lanes: [{
      subjectId: "lit", name: "Literature", paletteSlot: 1,
      children: [{
        key: "lit:c1", subjectId: "lit", childId: "c1", childName: "Elias", step: "base",
        assignments: [], daily: [], weekly: [],
      }],
    }],
    totals: { daily: [], weekly: [] },
  };
}

describe("regular weekly days off (S19-06)", () => {
  const nov = model("2026-11-01", "2026-11-30");

  it("Year hides Sunday and Wednesday; This month shows them, with no title", () => {
    const year = layoutTimeline(nov, { zoom: "year", width: 1280 });
    const month = layoutTimeline(nov, { zoom: "month", width: 390, month: "2026-11" });
    expect(year.plot.columns).toBe(nov.schoolDay.filter(Boolean).length);
    expect(month.plot.columns).toBe(nov.dates.length);
    expect(month.plot.columns).toBeGreaterThan(year.plot.columns);
    const wed = nov.dates.findIndex((d) => weekdayOf(d) === 3);
    const sun = nov.dates.findIndex((d) => weekdayOf(d) === 0);
    expect(wed).toBeGreaterThanOrEqual(0);
    expect(sun).toBeGreaterThanOrEqual(0);
    expect(JSON.stringify(year)).not.toMatch(/Wednesdays off/);
    expect(JSON.stringify(month)).not.toMatch(/Wednesdays off/);
  });

  it("a term zoom, wider than a month, does not draw those days", () => {
    const year = model("2026-08-17", "2027-05-28");
    const range = zoomRange(year, "fall");
    expect(showsWeeklyOffs("fall", spanWeeks(year, range))).toBe(false);
    expect(showsWeeklyOffs("year", 40)).toBe(false);
    expect(showsWeeklyOffs("month", 4)).toBe(true);
    const fall = layoutTimeline(year, { zoom: "fall", width: 1280 });
    const shown = year.dates.slice(range![0], range![1] + 1);
    const school = shown.filter((d) => SCHOOL.includes(weekdayOf(d))).length;
    expect(fall.plot.columns).toBe(school);
    expect(fall.plot.columns).toBeLessThan(shown.length);
  });

  it.each(["light", "dark"] as const)("a named two-week break shows its name on the year view, at 390 and 1280 (%s)", (theme) => {
    document.documentElement.dataset.theme = theme;
    const grid = buildDayGrid("2026-08-17", "2027-05-28", SCHOOL);
    const first = grid.dates.indexOf("2026-12-14");
    const last = grid.dates.indexOf("2026-12-27");
    const sick = grid.dates.indexOf("2026-11-04");
    const m = model("2026-08-17", "2027-05-28", [
      { id: "xmas", label: "Christmas break", kind: "vacation", first, last, childIds: [] },
      { id: "sick", label: null, kind: "sick", first: sick, last: sick, childIds: [] },
    ]);
    for (const width of [390, 1280]) {
      const layout = layoutTimeline(m, { zoom: "year", width });
      const named = layout.breaks.filter((b) => b.breakId === "xmas");
      expect(named.length).toBeGreaterThan(0);
      expect(named.every((b) => b.title?.text === "Christmas break")).toBe(true);
      expect(layout.breaks.filter((b) => b.breakId === "sick").every((b) => b.title === null)).toBe(true);
      const view = render(<Timeline layout={layout} label="Year" />);
      expect(screen.getAllByText("Christmas break").length).toBeGreaterThan(0);
      expect(document.body.textContent).not.toMatch(/Wednesdays off/);
      view.unmount();
    }
    document.documentElement.removeAttribute("data-theme");
  });
});
