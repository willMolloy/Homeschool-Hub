// S18c-03: a long year-view title may shorten. The days that tell two copies apart may not.
import { describe, expect, it } from "vitest";
import { buildDayGrid } from "../src/features/timeline/grid";
import { layoutTimeline } from "../src/features/timeline/layout";
import type { TimelineModel } from "../src/features/timeline/model";
import { ELLIPSIS, daysEnding, fitKeepingSuffix } from "../src/features/timeline/names";

const per = (n: number) => (t: string) => t.length * n;

describe("a long title keeps its days (S18c-03)", () => {
  it("shortens the title and leaves the days", () => {
    const full = "The Hobbit (read aloud) · Mon–Thu";
    const keep = daysEnding(full, "Mon–Thu");
    expect(keep).toBe("Mon–Thu");
    const fitted = fitKeepingSuffix(full, keep!, 18, per(1));
    expect(fitted).toBeTruthy();
    expect(fitted).toContain("Mon–Thu");
    expect(fitted!.endsWith("Mon–Thu")).toBe(true);
    expect(fitted).toContain(ELLIPSIS);
    expect(fitted!.length).toBeLessThan(full.length);
    expect(fitKeepingSuffix("Luke · Tue–Fri", "Tue–Fri", 40, per(1))).toBe("Luke · Tue–Fri");
  });

  it("at 360 px the year bar shows the days, and at 1280 px the full title still fits", () => {
    const grid = buildDayGrid("2026-08-17", "2027-05-28", [1, 2, 3, 4, 5]);
    const n = grid.dates.length;
    const daily = grid.schoolDay.map((on) => (on ? 20 : 0));
    const bar = (id: string, title: string, daysLabel?: string): TimelineModel["lanes"][number]["children"][number]["assignments"][number] => ({
      assignmentId: id, childId: "c1", title, daily, weekly: daily, first: 0, last: n - 1,
      end: "2027-05-28", plannedEnd: "2027-05-28", estimated: false, complete: false, warnings: [],
      ...(daysLabel ? { daysLabel } : {}),
    });
    const model: TimelineModel = {
      ...grid, weekStart: "mon", today: "2026-11-05", todayIndex: Math.max(0, grid.dates.indexOf("2026-11-05")),
      breaks: [], events: [], children: [{ childId: "c1", name: "Wren" }],
      lanes: [{
        subjectId: "lit", name: "Literature", paletteSlot: 1,
        children: [{
          key: "lit:c1", subjectId: "lit", childId: "c1", childName: "Wren", step: "base",
          assignments: [
            bar("hobbit", "The Hobbit (read aloud) · Mon–Thu", "Mon–Thu"),
            bar("poem", "Poetry and Psalm 23, learned by heart · Tue–Fri", "Tue–Fri"),
            bar("math", "Math 2"),
            bar("luke", "Gospel of Luke · Tue–Fri", "Tue–Fri"),
          ],
          daily, weekly: daily,
        }],
      }],
      totals: { daily: [], weekly: [] },
    };
    const measure = per(11);
    const textOf = (layout: ReturnType<typeof layoutTimeline>, id: string) => layout.names.filter((name) => name.assignmentId === id).map((name) => name.text);
    const narrow = layoutTimeline(model, { zoom: "year", width: 360, measureText: measure });
    for (const [id, days] of [["hobbit", "Mon–Thu"], ["poem", "Tue–Fri"]] as const) {
      const names = textOf(narrow, id);
      expect(names.length).toBeGreaterThan(0);
      expect(names.every((t) => t.endsWith(days))).toBe(true);
      expect(names.some((t) => t.includes(ELLIPSIS))).toBe(true);
    }
    expect(textOf(narrow, "math").every((t) => !t.includes("·"))).toBe(true);
    expect(textOf(narrow, "luke").some((t) => t === "Gospel of Luke · Tue–Fri")).toBe(true);
    const wide = layoutTimeline(model, { zoom: "year", width: 1280, measureText: measure });
    expect(textOf(wide, "hobbit")).toContain("The Hobbit (read aloud) · Mon–Thu");
    expect(textOf(wide, "poem")).toContain("Poetry and Psalm 23, learned by heart · Tue–Fri");
  });
});
