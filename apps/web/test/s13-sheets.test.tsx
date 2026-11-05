/** S13-01..03: Print sheets (the choices and the address), the print pages, and the weekly and daily sheets. */
import { readFileSync } from "node:fs";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENGINE_VERSION, planAll, type Assignment as EngineAssignment, type BlockedPeriod } from "@hh/engine";
import type { Assignment, BlockedRange, Child, Subject } from "../src/api/types";
import { defaultDay } from "../src/features/print/PrintSheets";
import { parsePrintParams, printUrl } from "../src/features/print/printUrl";
import { buildSheet, breakNames, type SheetLookups } from "../src/features/print/sheetModel";
import { plannedRange, plannedRangeBetween } from "../src/features/week/weekBars";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const KIDS: Child[] = [
  { id: "c1", name: "Frank", color: "#3b6fb0", sortOrder: 0, archived: false },
  { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false },
];
const SUBJECTS = [
  { id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null },
  { id: "math", name: "Math", color: null, sortOrder: 1, archived: false, defaultWeight: null, defaultWeekdays: null },
  { id: "music", name: "Music", color: null, sortOrder: 2, archived: false, defaultWeight: null, defaultWeekdays: null },
] as Subject[];
// Engine side: Treasure Island, 300 pages over Mon Sep 7 to Fri Dec 18 (15 weeks, 75 school days, 4 a day); Piano in minutes; Math only Mon/Wed/Fri for Margaret.
const E: EngineAssignment[] = [
  { id: "ti", subjectId: "lit", childIds: ["c1"], unitType: "pages", totalUnits: 375, start: "2026-09-07", end: "2026-12-18" },
  { id: "piano", subjectId: "music", childIds: ["c1"], unitType: "minutes", totalUnits: 1500, start: "2026-09-07", end: "2026-12-18" },
  { id: "math", subjectId: "math", childIds: ["c2"], unitType: "lessons", totalUnits: 100, start: "2026-09-07", end: "2026-12-18", weekdays: [1, 3, 5] },
];
const BLOCKED: BlockedPeriod[] = [{ id: "tg", start: "2026-11-26", end: "2026-11-27", kind: "holiday", childIds: [] }];
const BLOCKED_ROWS: BlockedRange[] = [{ id: "tg", label: "Thanksgiving break", kind: "holiday", startDate: "2026-11-26", endDate: "2026-11-27", childIds: [] }];
const CAL = { weekStart: "mon" as const, schoolDays: [1, 2, 3, 4, 5] as never };
const plans = () => planAll(E, { calendar: CAL, blocked: BLOCKED, asOf: "2026-11-04" });
const ASSIGNMENTS: Assignment[] = [
  { id: "ti", subjectId: "lit", title: "Treasure Island", unitType: "pages", totalUnits: 375, weightPerUnit: null, startDate: "2026-09-07", endDate: "2026-12-18", childIds: ["c1"], archived: false, weekdays: null },
  { id: "piano", subjectId: "music", title: "Piano practice", unitType: "minutes", totalUnits: 1500, weightPerUnit: null, startDate: "2026-09-07", endDate: "2026-12-18", childIds: ["c1"], archived: false, weekdays: null },
  { id: "math", subjectId: "math", title: "Math 5", unitType: "lessons", totalUnits: 100, weightPerUnit: null, startDate: "2026-09-07", endDate: "2026-12-18", childIds: ["c2"], archived: false, weekdays: [1, 3, 5] },
] as Assignment[];

const lookups = (): SheetLookups => ({
  children: KIDS, subjects: SUBJECTS,
  titleOf: (id) => ASSIGNMENTS.find((a) => a.id === id)!.title,
  subjectOf: (id) => ASSIGNMENTS.find((a) => a.id === id)!.subjectId,
  slotOfAssignment: (id) => SUBJECTS.findIndex((s) => s.id === ASSIGNMENTS.find((a) => a.id === id)!.subjectId) + 1,
});

function stub() {
  fakeApi.on("GET /api/children", 200, KIDS);
  fakeApi.on("GET /api/subjects", 200, SUBJECTS);
  fakeApi.on("GET /api/assignments", 200, ASSIGNMENTS);
  fakeApi.on("GET /api/blocked-ranges", 200, BLOCKED_ROWS);
  fakeApi.on("GET /api/events", 200, []);
  fakeApi.on("GET /api/plan", (_b, _p, q) => [200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: q.get("from"), to: q.get("to"), plans: plans() }]);
}

describe("the print address (S13-01)", () => {
  it("builds and reads back a week and a day", () => {
    expect(printUrl({ kind: "week", date: "2026-11-02", children: "all" })).toBe("/print/week?week=2026-11-02&children=all");
    expect(printUrl({ kind: "day", date: "2026-11-03", children: ["c1", "c2"] }, { print: true })).toBe("/print/day?date=2026-11-03&children=c1%2Cc2&print=1");
    expect(parsePrintParams("week", new URLSearchParams("week=2026-11-02&children=all"))).toEqual({ kind: "week", date: "2026-11-02", children: "all" });
    expect(parsePrintParams("day", new URLSearchParams("date=2026-11-03&children=c1,c2"))).toEqual({ kind: "day", date: "2026-11-03", children: ["c1", "c2"] });
    expect(parsePrintParams("day", new URLSearchParams("date=nope"))).toBeNull();
    expect(parsePrintParams("week", new URLSearchParams("children=all"))).toBeNull();
  });
  it("the day starts on today, or on the first day of a shown week that does not hold today", () => {
    expect(defaultDay("2026-11-04", "2026-11-02")).toBe("2026-11-04");
    expect(defaultDay("2026-11-04", "2026-11-09")).toBe("2026-11-09");
    expect(defaultDay("2026-11-04", "2026-10-26")).toBe("2026-10-26");
  });
});

describe("Print sheets on Schedule · Week (S13-01)", () => {
  beforeEach(() => { stub(); window.print = vi.fn(); });
  const open = async (url = "/schedule?view=week&week=2026-11-02") => {
    const user = userEvent.setup();
    const r = renderAt(url);
    await user.click(await screen.findByRole("button", { name: "Print sheets" }));
    const dlg = await screen.findByRole("dialog", { name: "Print sheets" });
    return { user, dlg, ...r };
  };

  it("opens with the shown week, All children on", async () => {
    const { dlg } = await open();
    expect(within(dlg).getByRole("button", { name: "Week" })).toHaveAttribute("aria-pressed", "true");
    expect(within(dlg).getByText("Week of Nov 2")).toBeInTheDocument();
    expect(within(dlg).getByRole("button", { name: "All children" })).toHaveAttribute("aria-pressed", "true");
  });
  it("Print goes to the week's print page for all children", async () => {
    const { user, dlg, router } = await open();
    await user.click(within(dlg).getByRole("button", { name: "Print" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/print/week"));
    expect(router.state.location.search).toBe("?week=2026-11-02&children=all&print=1");
  });
  it("the week can be stepped, and the children chosen one or several", async () => {
    const { user, dlg, router } = await open();
    await user.click(within(dlg).getByRole("button", { name: "Next week" }));
    await user.click(within(dlg).getByRole("button", { name: "Margaret" }));
    expect(within(dlg).getByRole("button", { name: "All children" })).toHaveAttribute("aria-pressed", "false");
    expect(within(dlg).getByRole("button", { name: "Margaret" })).toHaveAttribute("aria-pressed", "true");
    await user.click(within(dlg).getByRole("button", { name: "Print" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/print/week"));
    expect(router.state.location.search).toBe("?week=2026-11-09&children=c2&print=1");
  });
  it("from All children a tap picks just that child; then chips add and remove; none left, or every child, is All children", async () => {
    const { user, dlg } = await open();
    const pressed = (n: string) => within(dlg).getByRole("button", { name: n }).getAttribute("aria-pressed");
    await user.click(within(dlg).getByRole("button", { name: "Frank" }));
    expect([pressed("All children"), pressed("Frank"), pressed("Margaret")]).toEqual(["false", "true", "false"]);
    await user.click(within(dlg).getByRole("button", { name: "Margaret" }));
    expect(pressed("All children")).toBe("true"); // both picked = everyone
    await user.click(within(dlg).getByRole("button", { name: "Margaret" }));
    expect([pressed("All children"), pressed("Frank"), pressed("Margaret")]).toEqual(["false", "false", "true"]); // from All, one child only
    await user.click(within(dlg).getByRole("button", { name: "Margaret" }));
    expect(pressed("All children")).toBe("true"); // none left = everyone
  });
  it("Day defaults to Monday of a shown week that does not hold today (today is Oct 28 here)", async () => {
    const { user, dlg } = await open();
    await user.click(within(dlg).getByRole("button", { name: "Day" }));
    expect(within(dlg).getByLabelText("Day")).toHaveValue("Nov 2, 2026");
  });
  it("Day: today when the shown week holds it", async () => {
    const { user, dlg, router } = await open("/schedule?view=week&week=2026-10-26");
    await user.click(within(dlg).getByRole("button", { name: "Day" }));
    expect(within(dlg).getByLabelText("Day")).toHaveValue("Oct 28, 2026");
    await user.click(within(dlg).getByRole("button", { name: "Print" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/print/day"));
    expect(router.state.location.search).toBe("?date=2026-10-28&children=all&print=1");
  });
});

describe("the weekly sheet (S13-02)", () => {
  it("rows are the days with work, with each day's range from the plan (a mid-book assignment)", () => {
    const frank = buildSheet(KIDS[0]!, plans(), "2026-11-02", "2026-11-08", lookups(), BLOCKED_ROWS, [1, 2, 3, 4, 5]);
    const ti = frank.subjects.find((s) => s.name === "Literature")!.assignments[0]!;
    expect(ti.title).toBe("Treasure Island");
    expect(ti.rows.map((r) => r.day)).toEqual(["Mon", "Tue", "Wed", "Thu", "Fri"]);
    // 375 pages over the 73 school days that are not Thanksgiving: about 5.14 a day; after 40 days Monday starts at 205.5, so "pages 206–211".
    expect(ti.rows[0]!.range).toBe("pages 206–211");
    // The week's own range (the Week bars' helper) agrees with the first and last day.
    const p = plans().find((x) => x.assignmentId === "ti")!;
    const wk = plannedRange(p, "2026-11-02");
    expect(wk.from).toBeCloseTo(205.48, 1);
    expect(ti.rows[0]!.range).toBe(`pages ${Math.round(wk.from) + 1}–${Math.round(plannedRangeBetween(p, "2026-11-02", "2026-11-02").to)}`);
    expect(ti.rows[4]!.range).toBe(`pages ${Math.round(plannedRangeBetween(p, "2026-11-06", "2026-11-06").from) + 1}–${Math.round(wk.to)}`);
    // Each day starts where the day before ended.
    const ends = ti.rows.map((r) => plannedRangeBetween(p, r.date, r.date));
    for (let i = 1; i < ends.length; i++) expect(ends[i]!.from).toBeCloseTo(ends[i - 1]!.to, 6);
    // S15-06: and the printed ranges never overlap: each day's first page is the page after the day before's last.
    const nums = ti.rows.map((r) => r.range!.match(/\d+/g)!.map(Number));
    for (let i = 1; i < nums.length; i++) expect(nums[i]![0]).toBe(nums[i - 1]![nums[i - 1]!.length - 1]! + 1);
  });
  it("leaves out days the assignment does not run on", () => {
    const margaret = buildSheet(KIDS[1]!, plans(), "2026-11-02", "2026-11-08", lookups(), BLOCKED_ROWS, [1, 2, 3, 4, 5]);
    expect(margaret.subjects[0]!.assignments[0]!.rows.map((r) => r.day)).toEqual(["Mon", "Wed", "Fri"]);
  });
  it("leaves out days off, and a break reads once by its name", () => {
    const frank = buildSheet(KIDS[0]!, plans(), "2026-11-23", "2026-11-29", lookups(), BLOCKED_ROWS, [1, 2, 3, 4, 5]);
    expect(frank.subjects.find((s) => s.name === "Literature")!.assignments[0]!.rows.map((r) => r.day)).toEqual(["Mon", "Tue", "Wed"]);
    expect(frank.breaks).toEqual(["Thanksgiving break"]);
    const normal = buildSheet(KIDS[0]!, plans(), "2026-11-02", "2026-11-08", lookups(), BLOCKED_ROWS, [1, 2, 3, 4, 5]);
    expect(normal.breaks).toEqual([]);
  });
  it("a break on a weekend only, a missed day and another child's day off are not listed", () => {
    const row = (over: Partial<BlockedRange>): BlockedRange => ({ ...BLOCKED_ROWS[0]!, ...over });
    expect(breakNames([row({ startDate: "2026-11-28", endDate: "2026-11-29" })], "c1", "2026-11-23", "2026-11-29", [1, 2, 3, 4, 5])).toEqual([]);
    expect(breakNames([row({ kind: "missed" })], "c1", "2026-11-23", "2026-11-29", [1, 2, 3, 4, 5])).toEqual([]);
    expect(breakNames([row({ childIds: ["c2"] })], "c1", "2026-11-23", "2026-11-29", [1, 2, 3, 4, 5])).toEqual([]);
    expect(breakNames([row({ label: null, kind: "sick", startDate: "2026-11-24", endDate: "2026-11-24" })], "c1", "2026-11-23", "2026-11-29", [1, 2, 3, 4, 5])).toEqual(["Sick day"]);
  });
  it("a one-child day off on a week's sheet names its day; a family break and a day sheet do not (S14-00, N5)", () => {
    const row = (over: Partial<BlockedRange>): BlockedRange => ({ ...BLOCKED_ROWS[0]!, ...over });
    const week = (b: BlockedRange) => breakNames([b], "c1", "2026-11-02", "2026-11-08", [1, 2, 3, 4, 5]);
    expect(week(row({ label: "Dentist", kind: "other", childIds: ["c1"], startDate: "2026-11-04", endDate: "2026-11-04" }))).toEqual(["Wed · Dentist"]);
    expect(week(row({ label: null, kind: "other", childIds: ["c1"], startDate: "2026-11-05", endDate: "2026-11-06" }))).toEqual(["Thu–Fri · Day off"]);
    expect(week(row({ label: "Co-op", childIds: ["c1", "c2"], startDate: "2026-11-03", endDate: "2026-11-03" }))).toEqual(["Tue · Co-op"]);
    expect(week(row({ label: "Open house", childIds: [], startDate: "2026-11-04", endDate: "2026-11-04" }))).toEqual(["Open house"]);
    expect(breakNames([row({ label: "Dentist", childIds: ["c1"], startDate: "2026-11-04", endDate: "2026-11-04" })], "c1", "2026-11-04", "2026-11-04", [1, 2, 3, 4, 5])).toEqual(["Dentist"]);
  });
  it("work counted in minutes shows its days with no range: no minutes on a sheet", () => {
    const frank = buildSheet(KIDS[0]!, plans(), "2026-11-02", "2026-11-08", lookups(), BLOCKED_ROWS, [1, 2, 3, 4, 5]);
    const piano = frank.subjects.find((s) => s.name === "Music")!.assignments[0]!;
    expect(piano.rows).toHaveLength(5);
    expect(piano.rows.every((r) => r.range === null)).toBe(true);
  });
  it("subjects come in the family's order, assignments by title", () => {
    const frank = buildSheet(KIDS[0]!, plans(), "2026-11-02", "2026-11-08", lookups(), BLOCKED_ROWS, [1, 2, 3, 4, 5]);
    expect(frank.subjects.map((s) => s.name)).toEqual(["Literature", "Music"]);
  });
});

describe("the print pages (S13-01, S13-02, S13-03)", () => {
  beforeEach(() => { stub(); window.print = vi.fn(); });

  it("All children: one sheet per child, with no app chrome, a Back to Schedule and no minutes anywhere", async () => {
    renderAt("/print/week?week=2026-11-02&children=all");
    const sheets = await screen.findAllByRole("region", { name: /week of Nov 2, 2026/i });
    expect(sheets.map((s) => within(s).getByRole("heading", { level: 1 }).textContent)).toEqual(["Frank", "Margaret"]);
    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
    const back = screen.getByRole("link", { name: /Back/ });
    expect(back).toHaveAttribute("href", "/schedule?view=week&week=2026-11-02");
    const text = document.body.textContent ?? "";
    expect(text).not.toMatch(/minute|\bmin\b|effort|heavy|light/i);
    const frank = within(sheets[0]!);
    expect(frank.getByText("Treasure Island")).toBeInTheDocument();
    expect(frank.getAllByText(/pages 2\d\d–2\d\d/)).toHaveLength(5);
    // S15-00 (N2): the notes block is a heading in the sheet, not a second landmark.
    expect(frank.getByRole("heading", { name: "Notes" })).toBeInTheDocument();
    expect(screen.getAllByRole("region")).toHaveLength(2); // one landmark per child sheet, none for the notes
    expect(within(sheets[1]!).getByText("Math 5")).toBeInTheDocument();
    expect(within(sheets[1]!).queryByText("Treasure Island")).not.toBeInTheDocument();
  });
  it("a chosen child only; a date inside the week is that week", async () => {
    renderAt("/print/week?week=2026-11-04&children=c2");
    const sheets = await screen.findAllByRole("region", { name: /week of Nov 2, 2026/i });
    expect(sheets).toHaveLength(1);
    expect(within(sheets[0]!).getByRole("heading", { level: 1 }).textContent).toBe("Margaret");
  });
  it("a break week says the break once, and drops the days off", async () => {
    renderAt("/print/week?week=2026-11-23&children=c1");
    const sheet = (await screen.findAllByRole("region", { name: /week of Nov 23, 2026/i }))[0]!;
    expect(within(sheet).getAllByText("Thanksgiving break")).toHaveLength(1);
    const text = sheet.textContent ?? "";
    expect(text).not.toMatch(/Thu|Fri/);
  });
  it("the daily sheet: only that weekday's work, each with its range", async () => {
    renderAt("/print/day?date=2026-11-03&children=all");
    const sheets = await screen.findAllByRole("region", { name: /Tuesday, Nov 3/ });
    expect(sheets).toHaveLength(2);
    const frank = within(sheets[0]!);
    expect(frank.getByText("Treasure Island")).toBeInTheDocument();
    expect(frank.getByText(/pages 21\d–21\d/)).toBeInTheDocument();
    // Margaret's Math runs Mon, Wed, Fri only: nothing on Tuesday.
    expect(within(sheets[1]!).getByText("Nothing planned for Tuesday")).toBeInTheDocument();
    expect(within(sheets[1]!).queryAllByRole("region")).toHaveLength(0); // S15-00 (N2): only the sheet itself is a landmark
    expect(within(sheets[1]!).queryByText("Math 5")).not.toBeInTheDocument();
  });
  it("the daily sheet on a day off and on a weekend says nothing is planned", async () => {
    renderAt("/print/day?date=2026-11-26&children=c1");
    expect(await screen.findByText("Nothing planned for Thursday")).toBeInTheDocument();
    expect(screen.getByText("Thanksgiving break")).toBeInTheDocument();
  });
  it("a bad address says what it needs and offers the way back", async () => {
    renderAt("/print/day?children=all");
    expect(await screen.findByRole("alert")).toHaveTextContent("needs a day");
    expect(screen.getByRole("link", { name: /Back/ })).toBeInTheDocument();
  });
  it("the print styles hide the bar, break after each child's sheet, and keep text at 10 pt or more", () => {
    const css = readFileSync("src/features/print/print.css", "utf8");
    expect(css).toMatch(/@media print[\s\S]*\.no-print \{ display: none !important; \}/);
    expect(css).toMatch(/\.sheet \{[^}]*break-after: page/);
    expect(css).toMatch(/\.sheet:last-child \{ break-after: auto; \}/);
    const sizes = [...css.matchAll(/font-size: ([\d.]+)pt/g)].map((m) => Number(m[1]));
    expect(Math.min(...sizes)).toBeGreaterThanOrEqual(10);
  });
});
