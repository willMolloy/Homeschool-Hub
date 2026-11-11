/** S16-01: Schedule · Week as Days: every school day's work in one view, from the printed weekly sheet's own model. */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ENGINE_VERSION, planAll, type Assignment as EngineAssignment, type BlockedPeriod, type ChildPlan } from "@hh/engine";
import type { Assignment, BlockedRange, Child, Subject } from "../src/api/types";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const KIDS: Child[] = [
  { id: "c1", name: "Frank", color: "#3b6fb0", sortOrder: 0, archived: false },
  { id: "c2", name: "Margaret", color: "#c0603f", sortOrder: 1, archived: false },
];
const SUBJECTS = [
  { id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null },
  { id: "math", name: "Math", color: null, sortOrder: 1, archived: false, defaultWeight: null, defaultWeekdays: null },
  { id: "music", name: "Music", color: null, sortOrder: 2, archived: false, defaultWeight: null, defaultWeekdays: null },
  { id: "hist", name: "History", color: null, sortOrder: 3, archived: false, defaultWeight: null, defaultWeekdays: null },
] as Subject[];
const E: EngineAssignment[] = [
  { id: "ti", subjectId: "lit", childIds: ["c1"], unitType: "pages", totalUnits: 375, start: "2026-09-07", end: "2026-12-18" },
  { id: "piano", subjectId: "music", childIds: ["c1"], unitType: "minutes", totalUnits: 1500, start: "2026-09-07", end: "2026-12-18" },
  { id: "math", subjectId: "math", childIds: ["c1", "c2"], unitType: "lessons", totalUnits: 100, start: "2026-09-07", end: "2026-12-18", weekdays: [1, 3, 5] },
  { id: "hist", subjectId: "hist", childIds: ["c2"], unitType: "chapters", totalUnits: 30, start: "2026-09-07", end: "2026-12-18", weekdays: [1, 2, 3, 4, 5] },
];
const BLOCKED: BlockedPeriod[] = [{ id: "tg", start: "2026-11-26", end: "2026-11-27", kind: "holiday", childIds: [] }];
const BLOCKED_ROWS: BlockedRange[] = [{ id: "tg", label: "Thanksgiving break", kind: "holiday", startDate: "2026-11-26", endDate: "2026-11-27", childIds: [] }];
const CAL = { weekStart: "mon" as const, schoolDays: [1, 2, 3, 4, 5] as never };
let plans: () => ChildPlan[];
const ASSIGNMENTS: Assignment[] = E.map((e) => ({ id: e.id, subjectId: e.subjectId, title: { ti: "Treasure Island", piano: "Piano practice", math: "Math 5", hist: "Story of the World" }[e.id]!,
  unitType: e.unitType, totalUnits: e.totalUnits, weightPerUnit: null, startDate: e.start, endDate: e.end, childIds: e.childIds, archived: false, weekdays: e.weekdays ?? null })) as Assignment[];

function stub(blockedRows: BlockedRange[] = BLOCKED_ROWS) {
  plans = () => planAll(E, { calendar: CAL, blocked: BLOCKED, asOf: "2026-11-04" });
  fakeApi.on("GET /api/children", 200, KIDS);
  fakeApi.on("GET /api/subjects", 200, SUBJECTS);
  fakeApi.on("GET /api/assignments", 200, ASSIGNMENTS);
  fakeApi.on("GET /api/blocked-ranges", 200, blockedRows);
  fakeApi.on("GET /api/events", 200, []);
  fakeApi.on("GET /api/plan", (_b, _p, q) => [200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: q.get("from"), to: q.get("to"), plans: plans() }]);
}
beforeEach(() => { localStorage.clear(); stub(); });

const days = () => [...document.querySelectorAll<HTMLElement>(".day")];
/** "Mon" -> [{child?, title, range}] from the Days view. */
function dayLines(): Map<string, { child: string | null; title: string; range: string | null }[]> {
  const out = new Map<string, { child: string | null; title: string; range: string | null }[]>();
  for (const d of days()) {
    const key = d.getAttribute("aria-label")!.slice(0, 3);
    out.set(key, [...d.querySelectorAll<HTMLElement>(".day-line")].map((b) => ({
      child: b.getAttribute("data-children"), title: b.querySelector(".day-title")!.textContent!, range: b.querySelector(".day-range")?.textContent ?? null })));
  }
  return out;
}

describe("the Days view (S16-01)", () => {
  it("S16-07: under All children each day is grouped by child in the family's order, then Together once; an empty child is left out; no initials", async () => {
    localStorage.setItem("hh.child", "all");
    renderAt("/schedule?view=week&week=2026-11-02&layout=days");
    const tue = await screen.findByRole("region", { name: "Tue, Nov 3" });
    const heads = (el: HTMLElement) => within(el).getAllByRole("heading", { level: 4 }).map((h) => h.textContent);
    // Monday: Frank's Treasure Island and Piano, Margaret's History, and Math 5 which both have (Together, once).
    const mon = screen.getByRole("region", { name: "Mon, Nov 2" });
    expect(heads(mon)).toEqual(["Frank", "Margaret", "Together"]);
    const together = within(mon).getByRole("heading", { name: "Together" }).closest(".day-group") as HTMLElement;
    expect(within(together).getAllByRole("button")).toHaveLength(1);
    expect(together.querySelector(".day-line")!.getAttribute("data-children")).toBe("Frank,Margaret");
    expect(within(together).getByRole("button", { name: /Math 5/ })).toBeInTheDocument();
    // Tuesday: Math 5 is Mon/Wed/Fri, so no Together group; both children still have their own work.
    expect(heads(tue)).toEqual(["Frank", "Margaret"]);
    expect(document.querySelectorAll(".day-dot")).toHaveLength(0);
    // Frank's group comes first and holds only Frank's lines.
    const frank = within(mon).getByRole("heading", { name: "Frank" }).closest(".day-group") as HTMLElement;
    expect([...frank.querySelectorAll(".day-title")].map((t) => t.textContent)).toEqual(["Treasure Island", "Piano practice"]);
  });
  it("S16-07: one child selected has no headings", async () => {
    localStorage.setItem("hh.child", "c1");
    renderAt("/schedule?view=week&week=2026-11-02&layout=days");
    await screen.findByRole("region", { name: "Mon, Nov 2" });
    expect(document.querySelectorAll(".day-child")).toHaveLength(0);
  });

  it("shows every school day of the week in one view, each with its date, a load bar and its lines", async () => {
    renderAt("/schedule?view=week&week=2026-11-02&layout=days");
    await screen.findByRole("region", { name: "Mon, Nov 2" });
    expect(days().map((d) => d.getAttribute("aria-label"))).toEqual(["Mon, Nov 2", "Tue, Nov 3", "Wed, Nov 4", "Thu, Nov 5", "Fri, Nov 6"]);
    expect(document.querySelectorAll(".day-load")).toHaveLength(5);
    for (const el of document.querySelectorAll(".day-load")) expect(el).toHaveAttribute("aria-hidden", "true"); // no numbers, no minutes
    expect(screen.queryByText(/\bminutes?\b/)).toBeNull();
  });

  it("the day lists equal the printed weekly sheet's rows, child by child (one rule for screen and paper)", async () => {
    // Days, for All children.
    localStorage.setItem("hh.child", "all");
    const first = renderAt("/schedule?view=week&week=2026-11-02&layout=days");
    await screen.findByRole("region", { name: "Mon, Nov 2" });
    const onScreen = new Set<string>();
    // A Together line stands for each child's identical row on the sheet.
    for (const [day, lines] of dayLines()) for (const l of lines) for (const c of l.child!.split(",")) onScreen.add(`${c}|${day}|${l.title}|${l.range ?? "-"}`);
    expect(onScreen.size).toBeGreaterThan(15);
    first.unmount();
    // The printed sheets for the same week.
    renderAt("/print/week?week=2026-11-02&children=all");
    const sheets = await screen.findAllByRole("region", { name: /week of Nov 2, 2026/i });
    const onPaper = new Set<string>();
    for (const sheet of sheets) {
      const child = within(sheet).getByRole("heading", { level: 1 }).textContent!;
      for (const block of sheet.querySelectorAll(".sheet-day-block")) {
        const day = block.querySelector("h2")!.textContent!.slice(0, 3);
        for (const a of block.querySelectorAll(".sheet-assignment")) {
          const title = a.querySelector("h3")!.textContent!;
          const range = a.querySelector(".sheet-range")?.textContent?.replace(/^·\s*/, "") ?? "-";
          onPaper.add(`${child}|${day}|${title}|${range}`);
        }
      }
    }
    expect([...onScreen].sort()).toEqual([...onPaper].sort());
  });

  it("a range reads in whole units and agrees with the paper: pages, a lesson, chapters; minutes show the title only", async () => {
    localStorage.setItem("hh.child", "c1");
    renderAt("/schedule?view=week&week=2026-11-02&layout=days");
    await screen.findByRole("region", { name: "Mon, Nov 2" });
    const mon = dayLines().get("Mon")!;
    expect(mon.find((l) => l.title === "Treasure Island")!.range).toBe("pages 206–211");
    expect(mon.find((l) => l.title === "Math 5")!.range).toMatch(/^lessons? \d+/);
    expect(mon.find((l) => l.title === "Piano practice")!.range).toBeNull();
    expect(dayLines().get("Tue")!.some((l) => l.title === "Math 5")).toBe(false); // Mon/Wed/Fri only
  });

  it("a break is one quiet line in place of the list; a school day with nothing planned says so", async () => {
    localStorage.setItem("hh.child", "c1");
    renderAt("/schedule?view=week&week=2026-11-23&layout=days");
    const thu = await screen.findByRole("region", { name: "Thu, Nov 26" });
    expect(within(thu).getByText("Thanksgiving break")).toBeInTheDocument();
    expect(thu.querySelectorAll(".day-line")).toHaveLength(0);
    expect(within(screen.getByRole("region", { name: "Fri, Nov 27" })).getByText("Thanksgiving break")).toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "Wed, Nov 25" })).queryByText("Thanksgiving break")).toBeNull();
  });

  it("nothing planned: a day the child's only work does not run on", async () => {
    // Margaret has Math on Mon/Wed/Fri and History every day, so give her a week with only Math: History is stopped on Nov 3.
    plans = () => planAll(E, { calendar: CAL, blocked: BLOCKED, asOf: "2026-11-04" }).map((p) => (p.assignmentId === "hist" ? { ...p, endedOn: "2026-11-02" } : p));
    localStorage.setItem("hh.child", "c2");
    renderAt("/schedule?view=week&week=2026-11-02&layout=days");
    const tue = await screen.findByRole("region", { name: "Tue, Nov 3" });
    expect(within(tue).getByText("Nothing planned")).toBeInTheDocument();
    // A stopped assignment has no lines after the day it ended (Sprint 12): History shows Monday only.
    expect(dayLines().get("Mon")!.some((l) => l.title === "Story of the World")).toBe(true);
    for (const d of ["Tue", "Wed", "Thu", "Fri"]) expect(dayLines().get(d)!.some((l) => l.title === "Story of the World")).toBe(false);
  });

  it("under All children, one child's day off reads under that child's heading while the other's work stays", async () => {
    stub([...BLOCKED_ROWS, { id: "dent", label: "Dentist", kind: "other", startDate: "2026-11-04", endDate: "2026-11-04", childIds: ["c1"] }]);
    plans = () => planAll(E, { calendar: CAL, blocked: [...BLOCKED, { id: "dent", start: "2026-11-04", end: "2026-11-04", kind: "other", childIds: ["c1"] }], asOf: "2026-11-04" });
    localStorage.setItem("hh.child", "all");
    renderAt("/schedule?view=week&week=2026-11-02&layout=days");
    const wed = await screen.findByRole("region", { name: "Wed, Nov 4" });
        // Frank's heading carries his day off; the work that remains is Margaret's (and Together work he is not on is none).
    const frank = within(wed).getByRole("heading", { name: "Frank" }).closest(".day-group") as HTMLElement;
    expect(frank.querySelectorAll(".day-line")).toHaveLength(0);
    expect(within(frank).getByText("Dentist")).toBeInTheDocument();
    expect([...wed.querySelectorAll(".day-line")].every((l) => l.getAttribute("data-children") === "Margaret")).toBe(true);
  });

  it("tapping a line opens the same adjustment a Week bar opens", async () => {
    localStorage.setItem("hh.child", "c1");
    const user = userEvent.setup();
    renderAt("/schedule?view=week&week=2026-11-02&layout=days");
    const mon = await screen.findByRole("region", { name: "Mon, Nov 2" });
    await user.click(within(mon).getByRole("button", { name: /Treasure Island/ }));
    await waitFor(() => expect(screen.getByRole("dialog", { name: /Frank · Nov 2/ })).toBeInTheDocument());
  });

  it("Bars is still the default layout", async () => {
    localStorage.setItem("hh.child", "c1");
    renderAt("/schedule?view=week&week=2026-11-02");
    await screen.findByRole("list", { name: "Frank's bars" });
    expect(days()).toHaveLength(0);
  });
});
