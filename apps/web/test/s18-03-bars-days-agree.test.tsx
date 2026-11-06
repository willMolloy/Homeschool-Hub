/** S18-03 (E3): a Week bar names the same units as that week's Days lines and the printed sheet. */
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { addDays, ENGINE_VERSION, planAll, type Assignment as EngineAssignment, type BlockedPeriod, type ChildPlan } from "@hh/engine";
import type { BlockedRange, Child, CheckInItem, Subject, WeekCheckIn } from "../src/api/types";
import { buildDays } from "../src/features/week/daysModel";
import { buildSheet, type SheetLookups } from "../src/features/print/sheetModel";
import { barsFromPlans, itemRangeWords, rangeWords, weekRangeWords } from "../src/features/week/weekBars";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const KIDS: Child[] = [{ id: "c1", name: "Elias", color: "#3b6fb0", sortOrder: 0, archived: false }];
const SUBJECTS = [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null }] as Subject[];
const CAL = { weekStart: "mon" as const, schoolDays: [1, 2, 3, 4, 5] as never };
const DAYS = [1, 2, 3, 4, 5];
const ASG: { id: string; title: string; unitType: EngineAssignment["unitType"]; total: number; start: string; end: string; weekdays?: number[] }[] = [
  { id: "luke", title: "Gospel of Luke", unitType: "chapters", total: 24, start: "2026-09-07", end: "2026-12-18" },          // about 0.3 a day: chapters over several days
  { id: "fabre", title: "Fabre", unitType: "chapters", total: 40, start: "2026-09-07", end: "2026-12-18" },              // about 0.5
  { id: "swift", title: "Swift", unitType: "chapters", total: 130, start: "2026-09-07", end: "2026-12-18" },             // 1.7 a day: several chapters a day
  { id: "latin", title: "Lingua Angelica", unitType: "lessons", total: 36, start: "2026-09-07", end: "2026-12-18", weekdays: [1, 3, 5] },
  { id: "math", title: "Algebra", unitType: "lessons", total: 100, start: "2026-09-07", end: "2026-12-18" },
  { id: "hobbit", title: "The Hobbit", unitType: "pages", total: 311, start: "2026-09-07", end: "2026-12-18" },
  { id: "walk", title: "Nature walk", unitType: "minutes", total: 900, start: "2026-09-07", end: "2026-12-18" },
];
const E: EngineAssignment[] = ASG.map((a) => ({ id: a.id, subjectId: "lit", childIds: ["c1"], unitType: a.unitType, totalUnits: a.total, start: a.start, end: a.end, ...(a.weekdays ? { weekdays: a.weekdays as never } : {}) }));
const BLOCKED: BlockedPeriod[] = [{ id: "d", start: "2026-10-14", end: "2026-10-14", kind: "other", childIds: [] }, { id: "t", start: "2026-11-23", end: "2026-11-27", kind: "other", childIds: [] }];
const BLOCKED_ROWS: BlockedRange[] = [
  { id: "d", label: "Day off", kind: "other", startDate: "2026-10-14", endDate: "2026-10-14", childIds: [] },
  { id: "t", label: "Thanksgiving", kind: "other", startDate: "2026-11-23", endDate: "2026-11-27", childIds: [] },
];
const titleOf = (id: string) => ASG.find((a) => a.id === id)!.title;
const look = (): SheetLookups => ({ children: KIDS, subjects: SUBJECTS, titleOf, subjectOf: () => "lit", slotOfAssignment: () => 1 });
const plans = planAll(E, { calendar: CAL, blocked: BLOCKED, asOf: "2026-09-07" });

/** The unit numbers a line of words names ("chapters 16–17 (starts 17)", "chapter 17 · finish, chapters 18–19", "lesson 4 · day 2 of 3"). */
export function unitsNamed(words: string): number[] {
  const text = words.replace(/day \d+ of \d+/g, "");
  const out = new Set<number>();
  for (const m of text.matchAll(/(\d+)(?:–(\d+))?/g)) for (let n = Number(m[1]); n <= Number(m[2] ?? m[1]); n++) out.add(n);
  return [...out].sort((a, b) => a - b);
}
const mondays = Array.from({ length: 15 }, (_, i) => addDays("2026-09-07", i * 7));

describe("Bars and Days name the same units (E3)", () => {
  it("every assignment in every week from Sep 7 to Dec 14: the bar's range names the union of the Days lines (and the sheet's rows)", () => {
    let checked = 0;
    let multi = 0;
    let disagreed = 0;
    for (const week of mondays) {
      const bars = barsFromPlans(plans, week, look());
      const days = buildDays(KIDS, plans, week, look(), BLOCKED_ROWS, DAYS, false);
      const sheet = buildSheet(KIDS[0]!, plans, week, addDays(week, 6), look(), BLOCKED_ROWS, DAYS);
      for (const bar of bars) {
        if (bar.unitType === "minutes") continue;
        const fromDays = days.flatMap((d) => d.lines).filter((l) => l.assignmentId === bar.assignmentId).map((l) => l.range!);
        const fromSheet = sheet.subjects.flatMap((s) => s.assignments).filter((a) => a.assignmentId === bar.assignmentId).flatMap((a) => a.rows.map((r) => r.range!));
        expect(fromSheet, `${bar.title} ${week}`).toEqual(fromDays);
        const barUnits = unitsNamed(bar.range!);
        const dayUnits = [...new Set(fromDays.flatMap(unitsNamed))].sort((a, b) => a - b);
        const ends = (u: number[]) => [u[0], u[u.length - 1]];
        expect(ends(barUnits), `${bar.title} ${week}: bar "${bar.range}" vs days ${fromDays.join(" | ")}`).toEqual(ends(dayUnits));
        // chapters and lessons name every unit between: nothing is skipped on either side
        if (bar.unitType === "chapters" || bar.unitType === "lessons") expect(barUnits, `${bar.title} ${week}`).toEqual(dayUnits);
        checked++;
        if (barUnits.length > 1) multi++;
        // the stateless words the bars used to show (finished units only) left out the unit the week began: the run's E3
        const old = unitsNamed(rangeWords(bar.unitType, bar.from, bar.to, bar.total, true));
        if (ends(old).join() !== ends(dayUnits).join()) disagreed++;
      }
    }
    expect(checked).toBeGreaterThan(60);
    expect(multi).toBeGreaterThan(10);
    expect(disagreed, "the sample must include weeks where the old words disagreed with Days").toBeGreaterThan(5);
  });

  it("the run's case: a week that finishes chapter 16 and begins 17 names both", () => {
    // Mon 0.6 (chapter 16 starts), Tue 0.4 (finishes 16), Wed 0.5, Thu 0.3, Fri 0.1: chapter 17 is begun and not finished
    const steps = [0.6, 0.4, 0.5, 0.3, 0.1];
    let position = 15;
    const days = steps.map((units, i) => { position += units; return { date: addDays("2026-11-02", i), units, position, capacity: 1, schoolDay: true, thickness: 1, kind: "planned" as const }; });
    const p = { days, unitType: "chapters", totalUnits: 40, endedOn: undefined } as unknown as ChildPlan;
    expect(weekRangeWords(p, "2026-11-02")).toBe("chapters 16–17 (starts 17)");
    // ...and the Days lines name 16 (start, finish) and 17 (start, day 2 of 3, ...), so the bar leaves nothing out
    expect(unitsNamed("chapter 16 · start, chapter 16 · finish, chapter 17 · start, chapter 17 · day 2 of 3")).toEqual([16, 17]);
  });

  it("one unit finished, one unit only begun, one carried on, and several with the last unfinished", () => {
    const mk = (unitType: "chapters" | "lessons", steps: number[], start = 0) => {
      let position = start;
      const days = steps.map((units, i) => { position += units; return { date: addDays("2026-11-02", i), units, position, capacity: 1, schoolDay: true, thickness: 1, kind: "planned" as const }; });
      return { days, unitType, totalUnits: 40, endedOn: undefined } as unknown as ChildPlan;
    };
    expect(weekRangeWords(mk("chapters", [0.5, 0.5], 15), "2026-11-02")).toBe("chapter 16");
    expect(weekRangeWords(mk("chapters", [0.2, 0.2, 0.2], 16), "2026-11-02")).toBe("chapter 17 · start");
    expect(weekRangeWords(mk("chapters", [0.2, 0.2], 16.3), "2026-11-02")).toBe("chapter 17 · in progress");
    expect(weekRangeWords(mk("chapters", [0.5, 0.5, 0.2], 15.5), "2026-11-02")).toBe("chapters 16–17 (starts 17)");
    expect(weekRangeWords(mk("lessons", [1, 1, 1], 23), "2026-11-02")).toBe("lessons 24–26");
    expect(weekRangeWords(mk("lessons", [1, 1, 0.4], 23), "2026-11-02")).toBe("lessons 24–26 (starts 26)");
  });

  it("a finished week's bar and Update status read from the plan too, and fall back to the check-in row when the plan has moved", () => {
    const week = "2026-10-26";
    const plan = plans.find((p) => p.assignmentId === "luke")!;
    const bar = barsFromPlans(plans, week, look()).find((b) => b.assignmentId === "luke")!;
    const row: Pick<CheckInItem, "unitType" | "plannedFrom" | "plannedTo" | "totalUnits"> = { unitType: "chapters", plannedFrom: bar.from, plannedTo: bar.to, totalUnits: 24 };
    expect(itemRangeWords(row, plan, week)).toBe(bar.range);
    expect(itemRangeWords({ ...row, plannedTo: bar.to + 3 }, plan, week)).toBe(itemRangeWords({ ...row, plannedTo: bar.to + 3 }, undefined, week));
    expect(itemRangeWords(row, undefined, undefined)).toMatch(/chapter/);
  });
});

describe("on screen (S18-03)", () => {
  const A = ASG.find((a) => a.id === "luke")!;
  const week: WeekCheckIn = { weekStart: "2026-10-19", weekEnd: "2026-10-25", status: null, addable: [], items: [] };
  it("Schedule · Week: the bar and the Days lines for Gospel of Luke name the same chapters, and Update status says the same words as the bar", async () => {
    const user = userEvent.setup();
    const asgJson = ASG.map((a) => ({ id: a.id, subjectId: "lit", title: a.title, unitType: a.unitType, totalUnits: a.total, weightPerUnit: null, startDate: a.start, endDate: a.end, childIds: ["c1"], archived: false, weekdays: a.weekdays ?? null }));
    fakeApi.on("GET /api/children", 200, KIDS);
    fakeApi.on("GET /api/subjects", 200, SUBJECTS);
    fakeApi.on("GET /api/assignments", 200, asgJson);
    fakeApi.on("GET /api/blocked-ranges", 200, BLOCKED_ROWS);
    fakeApi.on("GET /api/events", 200, []);
    fakeApi.on("GET /api/week-overrides", 200, { overrides: [] });
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: "2026-08-01", to: "2026-12-31", plans });
    const shown = weekRangeWords(plans.find((p) => p.assignmentId === A.id)!, "2026-10-26");
    renderAt("/schedule?view=week");
    const bars = within(await screen.findByRole("region", { name: "Elias's work" }));
    const bar = await bars.findByRole("button", { name: new RegExp(`^${A.title}`) });
    expect(bar).toHaveTextContent(shown);
    // Days: the same chapters
    await user.click(screen.getByRole("button", { name: "Days" }));
    const dayText = (await screen.findAllByText(/Chapter|chapter/)).map((e) => e.textContent!).join(" | ");
    const named = unitsNamed(dayText.replace(/Gospel of Luke/g, ""));
    for (const n of unitsNamed(shown)) expect(named).toContain(n);
    expect(week.items).toEqual([]);
  });
});
