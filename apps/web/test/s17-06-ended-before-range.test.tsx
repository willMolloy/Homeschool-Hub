/** S17-06 (N1): a stopped or finished-early assignment that ended before the shown range has nothing to draw there; no zoom may crash on it. */
import { describe, expect, it } from "vitest";
import { planAll, type Assignment as EngineAssignment } from "@hh/engine";
import type { Assignment, Child, Subject } from "../src/api/types";
import { layoutTimeline } from "../src/features/timeline/layout";
import { buildTimelineModel } from "../src/features/timeline/model";
import { placePieceNames } from "../src/features/timeline/names";

const CAL = { weekStart: "mon" as const, schoolDays: [1, 2, 3, 4, 5] as (0 | 1 | 2 | 3 | 4 | 5 | 6)[] };
const subjects: Subject[] = [{ id: "s1", name: "Latin", color: null, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null }];
const kids: Child[] = [{ id: "c1", name: "Clara", color: null, sortOrder: 0, archived: false }, { id: "c2", name: "Wren", color: null, sortOrder: 1, archived: false }];

function build(ended: "stopped" | "finished") {
  const defs = [
    { id: "gone", title: "Prima Latina", start: "2026-08-24", end: "2026-12-18", ended: { as: ended, on: "2026-10-23" } },
    { id: "spring", title: "Math 5 (spring)", start: "2027-01-04", end: "2027-05-21" },
  ];
  const eng: EngineAssignment[] = defs.map((d) => ({ id: d.id, subjectId: "s1", childIds: ["c1"], unitType: "lessons", totalUnits: 40, start: d.start, end: d.end, ...(d.ended ? { endedAs: d.ended.as, endedOn: d.ended.on } : {}) }) as EngineAssignment);
  const api: Assignment[] = defs.map((d) => ({ id: d.id, subjectId: "s1", title: d.title, unitType: "lessons", totalUnits: 40, weightPerUnit: null, startDate: d.start, endDate: d.end, childIds: ["c1"], archived: false, weekdays: null, ...(d.ended ? { endedAs: d.ended.as, endedOn: d.ended.on } : {}) }) as Assignment);
  return buildTimelineModel({
    from: "2026-08-17", to: "2027-05-21", today: "2026-11-05", weekStart: "mon", schoolDays: CAL.schoolDays,
    plans: planAll(eng, { calendar: CAL, asOf: "2026-11-05" }), assignments: api, children: kids, subjects, blocked: [], events: [],
  });
}

describe.each(["stopped", "finished"] as const)("a %s assignment that ended before the range", (ended) => {
  const model = build(ended);
  const ranges: { zoom: string; month?: string }[] = [{ zoom: "year" }, { zoom: "spring" }, { zoom: "fall" }, { zoom: "month", month: "2027-01" }, { zoom: "month", month: "2027-03" }];
  for (const widths of [320, 390, 1280]) for (const r of ranges) {
    it(`${r.zoom}${r.month ? " " + r.month : ""} at ${widths} px draws without throwing, and names only what is drawn`, () => {
      const l = layoutTimeline(model, { zoom: r.zoom as never, width: widths, ...(r.month ? { month: r.month } : {}) });
      const gone = l.bands.find((b) => b.assignmentId === "gone");
      if (r.zoom === "spring" || r.month) {
        expect(gone === undefined || gone.runs.length === 0).toBe(true);
        expect(l.names.some((n) => n.assignmentId === "gone")).toBe(false);
        expect(l.names.some((n) => n.assignmentId === "spring")).toBe(true);
      }
    });
  }
  it("a custom view after it ended", () => {
    const l = layoutTimeline(model, { zoom: "custom:x" as never, width: 390, customViews: [{ id: "x", name: "Jan to Feb", start: "2027-01-04", end: "2027-02-26" }] as never });
    expect(l.names.some((n) => n.assignmentId === "gone")).toBe(false);
  });
});

describe("the name placement helpers on nothing drawn", () => {
  it("placePieceNames with no pieces, even for a stopped bar, places nothing", () => {
    expect(placePieceNames("Prima Latina · Stopped", [], 10, false, undefined, [], { left: 0, right: 300 })).toEqual([]);
  });
});

describe("N4: a print address with no week or day has a heading", () => {
  it("/print/week and /print/day show an h1 and the plain line", async () => {
    const { renderAt } = await import("./render");
    const { screen } = await import("@testing-library/react");
    for (const [path, word] of [["/print/week", "week"], ["/print/day?children=all", "day"]] as const) {
      const { unmount } = renderAt(path);
      expect(await screen.findByRole("heading", { level: 1, name: `Choose a ${word} to print` })).toBeInTheDocument();
      expect(screen.getByRole("alert")).toHaveTextContent(`needs a ${word}`);
      unmount();
    }
  });
});
