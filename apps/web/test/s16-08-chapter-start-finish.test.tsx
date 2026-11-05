/** S16-08: a chapter (lesson, page) that takes several days reads "start / day 2 of 3 / finish", replacing "Keep going", everywhere ranges show. */
import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ENGINE_VERSION, planAll, type Assignment as EngineAssignment, type BlockedPeriod, type ChildPlan } from "@hh/engine";
import type { Assignment, BlockedRange, Child, Subject } from "../src/api/types";
import { buildSheet, type SheetLookups } from "../src/features/print/sheetModel";
import { rangeWords } from "../src/features/week/weekBars";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

/** The day ranges of a book of `total` units at `perDay`, for the days given (cumulative positions, as the plan has them). */
function walk(unit: "chapters" | "lessons" | "pages", perDay: number[], total: number): string[] {
  let pos = 0;
  return perDay.map((d) => { const end = Math.min(total, pos + d); const r = rangeWords(unit, pos, end, total); pos = end; return r; });
}

describe("the day range helper (S16-08)", () => {
  it("about 0.5 a day: start, then finish", () => {
    expect(walk("chapters", [0.5, 0.5, 0.5, 0.5], 19)).toEqual(["Chapter 1 · start", "Chapter 1 · finish", "Chapter 2 · start", "Chapter 2 · finish"]);
  });
  it("about 0.33 a day: start, day 2 of 3, finish", () => {
    expect(walk("chapters", Array(6).fill(1 / 3), 19)).toEqual(["Chapter 1 · start", "Chapter 1 · day 2 of 3", "Chapter 1 · finish", "Chapter 2 · start", "Chapter 2 · day 2 of 3", "Chapter 2 · finish"]);
  });
  it("a longer span counts its place: about 0.25 a day", () => {
    expect(walk("chapters", Array(4).fill(0.25), 19)).toEqual(["Chapter 1 · start", "Chapter 1 · day 2 of 4", "Chapter 1 · day 3 of 4", "Chapter 1 · finish"]);
  });
  it("whole-chapter days keep their ranges, and a span can sit beside them", () => {
    // 1 chapter, 2 chapters, then half a chapter twice
    expect(walk("chapters", [1, 2, 0.5, 0.5, 1], 19)).toEqual(["chapter 1", "chapters 2–3", "Chapter 4 · start", "Chapter 4 · finish", "chapter 5"]);
  });
  it("lessons and pages say the same, and the last chapter of the book finishes on the total", () => {
    expect(walk("lessons", [0.5, 0.5], 10)).toEqual(["Lesson 1 · start", "Lesson 1 · finish"]);
    expect(rangeWords("chapters", 18.5, 19, 19)).toBe("Chapter 19 · finish");
    expect(rangeWords("pages", 119.5, 120, 300)).toBe("Page 120 · finish");
  });
  it("a day that ends one chapter and begins the next names the one it spends more of; never 'Keep going'", () => {
    expect(rangeWords("chapters", 16.6, 17.2, 19)).toBe("Chapter 17 · finish");
    expect(rangeWords("chapters", 16.9, 17.6, 19)).toBe("chapter 18"); // rounds to one whole chapter, as in S15-06
    for (let f = 0; f < 6; f += 0.17) expect(rangeWords("chapters", f, f + 0.17, 19)).not.toMatch(/Keep going/);
  });
  it("a week or a status line over part of a chapter says start, finish or in progress", () => {
    expect(rangeWords("chapters", 16, 16.4, 19, true)).toBe("Chapter 17 · start");
    expect(rangeWords("chapters", 16.4, 16.7, 19, true)).toBe("Chapter 17 · in progress");
    expect(rangeWords("chapters", 16.7, 17, 19, true)).toBe("Chapter 17 · finish");
    expect(rangeWords("chapters", 16.2, 18.7, 19, true)).toBe("chapters 17–19"); // several units: the whole-unit range
  });
  it("minutes are unchanged", () => {
    expect(rangeWords("minutes", 0, 30)).toBe("30 minutes");
  });
});

// A real plan: The Hobbit, 19 chapters over Mon and Wed only, about half a chapter a day; days off inside the span do not count.
const KIDS: Child[] = [{ id: "c1", name: "Frank", color: "#3b6fb0", sortOrder: 0, archived: false }];
const SUBJECTS = [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null }] as Subject[];
const CAL = { weekStart: "mon" as const, schoolDays: [1, 2, 3, 4, 5] as never };
const E = (total: number, weekdays: number[]): EngineAssignment[] => [{ id: "hob", subjectId: "lit", childIds: ["c1"], unitType: "chapters", totalUnits: total, start: "2026-09-07", end: "2026-12-18", weekdays: weekdays as never }];
const BLOCKED: BlockedPeriod[] = [{ id: "tg", start: "2026-11-25", end: "2026-11-25", kind: "other", childIds: [] }];
const BLOCKED_ROWS: BlockedRange[] = [{ id: "tg", label: "Day off", kind: "other", startDate: "2026-11-25", endDate: "2026-11-25", childIds: [] }];
const A: Assignment[] = [{ id: "hob", subjectId: "lit", title: "The Hobbit", unitType: "chapters", totalUnits: 19, weightPerUnit: null, startDate: "2026-09-07", endDate: "2026-12-18", childIds: ["c1"], archived: false, weekdays: [1, 3] } as Assignment];
const look = (): SheetLookups => ({ children: KIDS, subjects: SUBJECTS, titleOf: () => "The Hobbit", subjectOf: () => "lit", slotOfAssignment: () => 1 });

describe("Days, bars and sheets agree on a real plan (S16-08)", () => {
  const plans = (): ChildPlan[] => planAll(E(19, [1, 3]), { calendar: CAL, blocked: BLOCKED, asOf: "2026-11-04" });
  it("the weekly sheet's days say start and finish, never Keep going, and a day off inside a span is not a day of it", () => {
    const rows = (from: string, to: string) => buildSheet(KIDS[0]!, plans(), from, to, look(), BLOCKED_ROWS, [1, 2, 3, 4, 5]).subjects[0]!.assignments[0]!.rows.map((r) => `${r.day} ${r.range}`);
    const all = ["2026-11-02", "2026-11-09", "2026-11-16", "2026-11-23", "2026-11-30"].flatMap((w) => rows(w, weekEnd(w)));
    expect(all.join("\n")).not.toMatch(/Keep going/);
    expect(all.some((r) => /· start$/.test(r)) && all.some((r) => /· finish$/.test(r))).toBe(true);
    // Wed Nov 25 is a day off: the run goes from Mon Nov 23 straight to Mon Nov 30.
    expect(rows("2026-11-23", "2026-11-29").map((r) => r.slice(0, 3))).toEqual(["Mon"]);
  });
  function weekEnd(w: string) { const d = new Date(`${w}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 6); return d.toISOString().slice(0, 10); }

  describe("on screen", () => {
    beforeEach(() => {
      localStorage.clear();
      localStorage.setItem("hh.child", "c1");
      fakeApi.on("GET /api/children", 200, KIDS);
      fakeApi.on("GET /api/subjects", 200, SUBJECTS);
      fakeApi.on("GET /api/assignments", 200, A);
      fakeApi.on("GET /api/blocked-ranges", 200, BLOCKED_ROWS);
      fakeApi.on("GET /api/events", 200, []);
      fakeApi.on("GET /api/plan", (_b, _p, q) => [200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: q.get("from"), to: q.get("to"), plans: plans() }]);
    });
    it("Days shows the same words as the printed sheet", async () => {
      renderAt("/schedule?view=week&week=2026-11-02&layout=days");
      const mon = await screen.findByRole("region", { name: "Mon, Nov 2" });
      const wed = screen.getByRole("region", { name: "Wed, Nov 4" });
      const sheet = buildSheet(KIDS[0]!, plans(), "2026-11-02", "2026-11-08", look(), BLOCKED_ROWS, [1, 2, 3, 4, 5]).subjects[0]!.assignments[0]!.rows;
      expect(within(mon).getByText(sheet[0]!.range!)).toBeInTheDocument();
      expect(within(wed).getByText(sheet[1]!.range!)).toBeInTheDocument();
      expect(sheet.map((r) => r.range).join(" ")).toMatch(/Chapter \d+ · (start|finish|day)/);
      expect(document.body.textContent).not.toMatch(/Keep going/);
    });
    it("the Week bar says where in the chapter the week is, not Keep going", async () => {
      renderAt("/schedule?view=week&week=2026-11-02");
      const bars = await screen.findByRole("list", { name: "Frank's bars" });
      expect(within(bars).getByText(/chapters? \d+|Chapter \d+ · /)).toBeInTheDocument();
      expect(bars.textContent).not.toMatch(/Keep going/);
    });
  });
});
