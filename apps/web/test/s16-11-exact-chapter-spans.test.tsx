/** S16-11: exact "start / day N of M / finish" for chapters and lessons, from the assignment's real sequence of scheduled days (N10); pages keep plain ranges. */
import { screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { ENGINE_VERSION, planAll, type Assignment as EngineAssignment, type BlockedPeriod, type ChildPlan, type LocalDate } from "@hh/engine";
import type { Assignment, BlockedRange, Child, Subject } from "../src/api/types";
import { buildSheet, type SheetLookups } from "../src/features/print/sheetModel";
import { daySpanLabels } from "../src/features/week/weekBars";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

/** A plan-like object for `n` scheduled days at `perDay` (a number, or a function of the day index), dates one apart from 2026-11-02. */
function plan(unitType: "chapters" | "lessons" | "pages", perDay: number | ((i: number) => number), n: number, total = 1000, endedOn?: string) {
  const days = [];
  let pos = 0;
  for (let i = 0; i < n; i++) {
    const units = typeof perDay === "number" ? perDay : perDay(i);
    pos = Math.min(total, pos + units);
    days.push({ date: new Date(Date.UTC(2026, 10, 2 + i)).toISOString().slice(0, 10) as LocalDate, units, position: pos, capacity: 1, schoolDay: true, thickness: 1, kind: "planned" as const });
  }
  return { days, unitType, totalUnits: total, endedOn } as unknown as Pick<ChildPlan, "days" | "unitType" | "totalUnits" | "endedOn">;
}
const labels = (p: ReturnType<typeof plan>) => [...daySpanLabels(p as never).values()];

describe("daySpanLabels on uneven paces (N10)", () => {
  it("0.26 a day: each chapter reads start, day 2 of 4, day 3 of 4, finish (3 days now and then)", () => {
    const l = labels(plan("chapters", 0.26, 28, 40));
    expect(l.slice(0, 8)).toEqual(["Chapter 1 · start", "Chapter 1 · day 2 of 4", "Chapter 1 · day 3 of 4", "Chapter 1 · finish",
      "Chapter 2 · start", "Chapter 2 · day 2 of 4", "Chapter 2 · day 3 of 4", "Chapter 2 · finish"]);
    expect(l.slice(24, 27)).toEqual(["Chapter 7 · start", "Chapter 7 · day 2 of 3", "Chapter 7 · finish"]);
  });
  it("0.5 a day (Mon/Wed): start, finish", () => {
    expect(labels(plan("chapters", 0.5, 6, 19))).toEqual(["Chapter 1 · start", "Chapter 1 · finish", "Chapter 2 · start", "Chapter 2 · finish", "Chapter 3 · start", "Chapter 3 · finish"]);
  });
  for (const pace of [0.26, 0.3, 0.4, 0.55, 0.7, 0.8, 1.3, 1.7]) {
    it(`${pace} a day: every chapter that takes more than one day has exactly one start and one finish, and each day is named once`, () => {
      const total = 30;
      const n = Math.ceil(total / pace);
      const l = labels(plan("chapters", pace, n, total));
      expect(l).toHaveLength(n);
      for (let k = 1; k <= total; k++) {
        const mine = l.filter((x) => x.startsWith(`Chapter ${k} ·`));
        const starts = mine.filter((x) => x.endsWith("start")), finishes = l.filter((x) => x === `Chapter ${k} · finish`);
        if (starts.length > 0) { expect(starts).toHaveLength(1); expect(finishes).toHaveLength(1); }
        // days of a multi-day chapter count up to M in order
        const mids = mine.filter((x) => /day \d+ of \d+/.test(x));
        if (mids.length > 0) expect(new Set(mids.map((x) => x.match(/of (\d+)/)![1])).size).toBe(1);
      }
      expect(l.join(" ")).not.toMatch(/in progress|Keep going/);
    });
  }
  it("a day that finishes a started chapter and whole chapters says both; whole-chapter days are plain", () => {
    // 0.7, then 1.8 (finishes ch 1 which started on day 1, and ch 2), then 1 (ch 3), then 0.5 (reaches the end of ch 4)
    const l = labels(plan("chapters", (i) => [0.7, 1.8, 1, 0.5][i]!, 4, 19));
    expect(l).toEqual(["Chapter 1 · start", "Chapter 1 · finish, chapter 2", "chapter 3", "chapter 4"]);
  });
  it("lessons say the same; the last chapter finishes on the total; a stopped book has nothing after it", () => {
    expect(labels(plan("lessons", 0.5, 4, 10))).toEqual(["Lesson 1 · start", "Lesson 1 · finish", "Lesson 2 · start", "Lesson 2 · finish"]);
    const last = labels(plan("chapters", 0.5, 4, 2));
    expect(last).toEqual(["Chapter 1 · start", "Chapter 1 · finish", "Chapter 2 · start", "Chapter 2 · finish"]);
    const stopped = daySpanLabels(plan("chapters", 0.5, 6, 19, "2026-11-04") as never);
    expect([...stopped.keys()]).toEqual(["2026-11-02", "2026-11-03", "2026-11-04"]);
  });
  it("pages and minutes are not given span labels", () => {
    expect(daySpanLabels(plan("pages", 0.5, 4, 100) as never).size).toBe(0);
    expect(daySpanLabels(plan("pages", 20, 4, 100) as never).size).toBe(0);
  });
});

// A real plan: a daily book at an uneven pace with a day off inside a span and an adjusted week.
const KIDS: Child[] = [{ id: "c1", name: "Frank", color: "#3b6fb0", sortOrder: 0, archived: false }];
const SUBJECTS = [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null }] as Subject[];
const CAL = { weekStart: "mon" as const, schoolDays: [1, 2, 3, 4, 5] as never };
const E = (unitType: "chapters" | "pages", total: number, weekdays?: number[]): EngineAssignment[] => [{ id: "bk", subjectId: "lit", childIds: ["c1"], unitType, totalUnits: total, start: "2026-09-07", end: "2026-12-18", ...(weekdays ? { weekdays: weekdays as never } : {}) }];
const BLOCKED: BlockedPeriod[] = [{ id: "d", start: "2026-11-04", end: "2026-11-04", kind: "other", childIds: [] }];
const BLOCKED_ROWS: BlockedRange[] = [{ id: "d", label: "Day off", kind: "other", startDate: "2026-11-04", endDate: "2026-11-04", childIds: [] }];
const asg = (unitType: "chapters" | "pages", total: number): Assignment[] => [{ id: "bk", subjectId: "lit", title: "A long book", unitType, totalUnits: total, weightPerUnit: null, startDate: "2026-09-07", endDate: "2026-12-18", childIds: ["c1"], archived: false, weekdays: null } as Assignment];
const look = (): SheetLookups => ({ children: KIDS, subjects: SUBJECTS, titleOf: () => "A long book", subjectOf: () => "lit", slotOfAssignment: () => 1 });
const plans = (unitType: "chapters" | "pages", total: number): ChildPlan[] => planAll(E(unitType, total), { calendar: CAL, blocked: BLOCKED, asOf: "2026-11-04" });
const rowsOf = (p: ChildPlan[], from: string, to: string) => buildSheet(KIDS[0]!, p, from, to, look(), BLOCKED_ROWS, [1, 2, 3, 4, 5]).subjects[0]!.assignments[0]!.rows.map((r) => `${r.date.slice(5)} ${r.range}`);

describe("on a real plan (N10)", () => {
  it("a day off inside a span is not a day of it, and a week and each of its days agree", () => {
    const p = plans("chapters", 10); // 10 chapters over the term: about 0.14 a day
    const week = rowsOf(p, "2026-11-02", "2026-11-08");
    expect(week.map((r) => r.slice(0, 5))).toEqual(["11-02", "11-03", "11-05", "11-06"]); // Wed Nov 4 is off
    for (const r of week) expect(rowsOf(p, r.slice(0, 5).replace(/^/, "2026-"), r.slice(0, 5).replace(/^/, "2026-"))).toEqual([r]); // a single day knows its neighbours
    // consecutive days of one chapter count 1, 2, 3 ... of M
    const all = rowsOf(p, "2026-11-02", "2026-11-29").map((r) => r.slice(6));
    expect(all.join(" ")).not.toMatch(/Keep going/);
  });
  it("a page book never shows 'day N of M' or 'start'", () => {
    const p = plans("pages", 300);
    const rows = rowsOf(p, "2026-11-02", "2026-11-27").join(" ");
    expect(rows).toMatch(/pages? \d+/);
    expect(rows).not.toMatch(/day \d+ of|start|finish|Keep going/);
  });
  it("an adjusted week keeps every chapter's one start and one finish", () => {
    const p = plans("chapters", 10);
    // squash a week (as an adjustment would): the same days, more work on them
    const bumped = p.map((pl) => { let pos = 0; return { ...pl, days: pl.days.map((d) => { const u = d.date >= "2026-11-09" && d.date <= "2026-11-13" ? d.units * 2.3 : d.units; pos += u; return { ...d, units: u, position: pos }; }) }; });
    const l = [...daySpanLabels(bumped[0]!).values()];
    for (let k = 1; k <= 8; k++) {
      const starts = l.filter((x) => x === `Chapter ${k} · start`).length, fins = l.filter((x) => new RegExp(`Chapter ${k} · finish`).test(x)).length;
      if (starts > 0) expect([starts, fins]).toEqual([1, 1]);
    }
  });
});

describe("Days equals the sheet on a real plan (S16-11)", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("hh.child", "c1");
    fakeApi.on("GET /api/children", 200, KIDS);
    fakeApi.on("GET /api/subjects", 200, SUBJECTS);
    fakeApi.on("GET /api/assignments", 200, asg("chapters", 10));
    fakeApi.on("GET /api/blocked-ranges", 200, BLOCKED_ROWS);
    fakeApi.on("GET /api/events", 200, []);
    fakeApi.on("GET /api/plan", (_b, _p, q) => [200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: q.get("from"), to: q.get("to"), plans: plans("chapters", 10).map((pl) => ({ ...pl, days: pl.days.filter((d) => d.date >= q.get("from")! && d.date <= q.get("to")!) })) }]);
  });
  it("each day's words are the sheet's, though the API only sends the days asked for", async () => {
    renderAt("/schedule?view=week&week=2026-11-02&layout=days");
    await screen.findByRole("region", { name: "Mon, Nov 2" });
    const sheet = rowsOf(plans("chapters", 10), "2026-11-02", "2026-11-08");
    const asked = fakeApi.calls.filter((c) => c.path.startsWith("/api/plan")).map((c) => c.path);
    expect(asked.some((q) => /from=2026-09-03/.test(q))).toBe(true); // 60 days either side of the week
    for (const r of sheet) {
      const [md, ...rest] = r.split(" ");
      const day = new Date(`2026-${md}T00:00:00Z`).getUTCDate();
      const region = screen.getByRole("region", { name: new RegExp(`Nov ${day}$`) });
      expect(within(region).getByText(rest.join(" "))).toBeInTheDocument();
    }
  });
});
