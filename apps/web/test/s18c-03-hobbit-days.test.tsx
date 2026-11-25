// S18c-03 L1: the Hartley seed's two Hobbit bars keep their days at phone widths.
// Dates, children, weekdays and breaks match scripts/e2e/seed-cm-family.ts (the family the tester used).
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { planAll, type Assignment as EngineAssignment, type BlockedPeriod } from "@hh/engine";
import type { Assignment, BlockedRange, Child, Subject } from "../src/api/types";
import { Timeline } from "../src/features/timeline/Timeline";
import { layoutTimeline } from "../src/features/timeline/layout";
import { buildTimelineModel } from "../src/features/timeline/model";
import { fetchRange, shownRange } from "../src/features/timeline/range";

const MON_FRI = [1, 2, 3, 4, 5] as const;
const TUE_FRI = [2, 3, 4, 5] as const;
/** The seeded books that share a lane with the Hobbits, plus the spring books that set the year width. */
const BOOKS: { subject: string; title: string; unit: "pages" | "chapters" | "lessons" | "minutes"; total: number; start: string; end: string; kids: string[]; weekdays?: number[] }[] = [
  { subject: "Bible", title: "Gospel of Luke", unit: "chapters", total: 24, start: "2026-08-17", end: "2026-12-18", kids: ["Elias", "Clara"], weekdays: [1, 2, 3, 4] },
  { subject: "Bible", title: "Gospel of Luke", unit: "chapters", total: 24, start: "2026-08-17", end: "2026-12-18", kids: ["Wren"], weekdays: [...TUE_FRI] },
  { subject: "Literature", title: "The Hobbit (read aloud)", unit: "pages", total: 300, start: "2026-08-24", end: "2026-12-11", kids: ["Elias", "Clara"], weekdays: [1, 2, 3, 4] },
  { subject: "Literature", title: "The Hobbit (read aloud)", unit: "pages", total: 300, start: "2026-08-24", end: "2026-12-11", kids: ["Wren"], weekdays: [...TUE_FRI] },
  { subject: "History", title: "Our Island Story", unit: "chapters", total: 40, start: "2026-08-17", end: "2026-12-18", kids: ["Clara"] },
  { subject: "History", title: "Our Island Story", unit: "chapters", total: 40, start: "2026-08-17", end: "2026-12-18", kids: ["Wren"], weekdays: [...TUE_FRI] },
  { subject: "Recitation", title: "Poetry and Psalm 23 recitation", unit: "lessons", total: 60, start: "2026-08-17", end: "2026-12-18", kids: ["Elias", "Clara"], weekdays: [1, 2, 3, 4] },
  { subject: "Recitation", title: "Poetry and Psalm 23 recitation", unit: "lessons", total: 60, start: "2026-08-17", end: "2026-12-18", kids: ["Wren"], weekdays: [...TUE_FRI] },
  { subject: "Literature", title: "Robinson Crusoe", unit: "pages", total: 320, start: "2026-08-24", end: "2026-10-30", kids: ["Elias"] },
  { subject: "Literature", title: "Treasure Island", unit: "pages", total: 290, start: "2026-11-02", end: "2026-12-18", kids: ["Elias"] },
  { subject: "Literature", title: "Little Women", unit: "pages", total: 260, start: "2026-08-24", end: "2026-11-13", kids: ["Clara"] },
  { subject: "Literature", title: "Pathway Readers", unit: "pages", total: 150, start: "2026-08-17", end: "2026-12-18", kids: ["Wren"], weekdays: [...TUE_FRI] },
  { subject: "Literature", title: "Winnie-the-Pooh", unit: "chapters", total: 10, start: "2026-09-01", end: "2026-10-29", kids: ["Wren"], weekdays: [...TUE_FRI] },
  { subject: "Math", title: "Algebra 1", unit: "lessons", total: 140, start: "2026-08-17", end: "2026-12-18", kids: ["Elias"] },
  { subject: "Math", title: "Math 5 (spring)", unit: "lessons", total: 120, start: "2027-01-04", end: "2027-05-21", kids: ["Clara"] },
  { subject: "Math", title: "Math 2 (spring)", unit: "lessons", total: 100, start: "2027-01-05", end: "2027-05-21", kids: ["Wren"], weekdays: [...TUE_FRI] },
];
const BREAKS: BlockedPeriod[] = [
  { id: "tg", start: "2026-11-23", end: "2026-11-27", kind: "holiday" },
  { id: "xmas", start: "2026-12-19", end: "2027-01-03", kind: "vacation" },
];

function hartley() {
  const children: Child[] = ["Elias", "Clara", "Wren"].map((name, i) => ({ id: name.toLowerCase(), name, color: null, sortOrder: i, archived: false }));
  const subjectNames = [...new Set(BOOKS.map((r) => r.subject))];
  const subjects: Subject[] = subjectNames.map((name, i) => ({ id: name.toLowerCase().replace(/\s/g, "-"), name, color: null, sortOrder: i, archived: false, defaultWeight: null, defaultWeekdays: null }));
  const subjectId = (n: string) => subjects.find((s) => s.name === n)!.id;
  const engine: EngineAssignment[] = BOOKS.map((r, i) => ({
    id: `a${i}`, subjectId: subjectId(r.subject), childIds: r.kids.map((k) => k.toLowerCase()), unitType: r.unit, totalUnits: r.total,
    start: r.start, end: r.end, weekdays: (r.weekdays ?? null) as EngineAssignment["weekdays"],
  }));
  const plans = planAll(engine, { calendar: { weekStart: "mon", schoolDays: [...MON_FRI] }, blocked: BREAKS, asOf: "2026-11-05" });
  const assignments: Assignment[] = engine.map((a, i) => ({
    id: a.id, subjectId: a.subjectId, title: BOOKS[i]!.title, unitType: a.unitType, totalUnits: a.totalUnits, weightPerUnit: null,
    startDate: a.start, endDate: a.end, childIds: [...a.childIds], archived: false, weekdays: BOOKS[i]!.weekdays ?? null,
  }));
  const fetched = fetchRange("2026-11-05", "mon");
  const shown = shownRange(fetched, plans, "2026-11-05", "mon");
  const blocked: BlockedRange[] = BREAKS.map((b) => ({
    id: b.id, label: b.id === "tg" ? "Thanksgiving week" : "Christmas break",
    kind: b.id === "tg" ? "holiday" as const : "vacation" as const, startDate: b.start, endDate: b.end, childIds: [],
  }));
  const model = buildTimelineModel({
    ...shown, today: "2026-11-05", weekStart: "mon", schoolDays: [...MON_FRI], plans, assignments, children, subjects, blocked, events: [],
  });
  const shared = assignments.find((a) => a.title.startsWith("The Hobbit") && a.childIds.length > 1)!.id;
  const wren = assignments.find((a) => a.title.startsWith("The Hobbit") && a.childIds.includes("wren"))!.id;
  return { model, shared, wren };
}

const browserish = (t: string) => t.length * 7;

describe("the seeded Hobbit bars keep their days (S18c-03)", () => {
  const { model, shared, wren } = hartley();

  it("shows the days, and an aria-label, at 320/360/390/440 on Year and Fall", () => {
    for (const width of [320, 360, 390, 440]) for (const zoom of ["year", "fall"] as const) {
      const layout = layoutTimeline(model, { zoom, width, measureText: browserish });
      const text = (id: string) => layout.names.filter((n) => n.assignmentId === id).map((n) => n.text);
      expect(text(shared).some((t) => t.includes("Mon–Thu")), `${zoom} ${width} shared`).toBe(true);
      expect(text(wren).some((t) => t.includes("Tue–Fri")), `${zoom} ${width} wren`).toBe(true);
      const view = render(<Timeline layout={layout} label="Year" />);
      const labels = [...view.container.querySelectorAll("[aria-label]")].map((el) => el.getAttribute("aria-label") ?? "");
      expect(labels.some((l) => l.includes("Hobbit") && l.includes("Mon–Thu"))).toBe(true);
      expect(labels.some((l) => l.includes("Hobbit") && l.includes("Tue–Fri"))).toBe(true);
      view.unmount();
    }
  });

  it("at 1280 px Year both Hobbit titles still read in full", () => {
    const layout = layoutTimeline(model, { zoom: "year", width: 1280, measureText: browserish });
    const text = (id: string) => layout.names.filter((n) => n.assignmentId === id).map((n) => n.text);
    expect(text(shared)).toContain("The Hobbit (read aloud) · Mon–Thu · E C");
    expect(text(wren)).toContain("The Hobbit (read aloud) · Tue–Fri");
  });
});
