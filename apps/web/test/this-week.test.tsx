/**
 * T-03b: This Week — one week switcher in the header, and a "Make an adjustment" sheet per student (Drawer on
 * phones, Dialog wider) that edits that child's rows of the finished week. Ports S2b-27's past-week editing.
 */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ENGINE_VERSION, type ChildPlan } from "@hh/engine";
import type { CheckInItem, PastWeek, WeekCheckIn } from "../src/api/types";
import { forChild, withOtherChildren } from "../src/features/checkin/childWeek";
import { LATER_NOTE, laterCheckInsExist, sheetTitle } from "../src/features/checkin/ChildAdjustment";
import { shownWeek } from "../src/features/plan/useShownWeek";
import { choose, rowFor, step } from "./helpers/checkin";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const item = (over: Partial<CheckInItem>): CheckInItem => ({
  assignmentId: "ti", childId: "c1", childName: "Frank", title: "Treasure Island", unitType: "pages",
  plannedFrom: 0, plannedTo: 80, totalUnits: 270, actual: null, mode: null, ...over,
});
const TI = item({});
const MATH = item({ assignmentId: "math", title: "Math 5", unitType: "lessons", plannedFrom: 10, plannedTo: 15, totalUnits: 120 });
const VIOLIN_M = item({ assignmentId: "violin", childId: "c2", childName: "Margaret", title: "Violin", unitType: "minutes", plannedFrom: 600, plannedTo: 750, totalUnits: 3000, actual: 700, mode: "pushEndDate" });
const OCT19: WeekCheckIn = { weekStart: "2026-10-19", weekEnd: "2026-10-25", status: null, items: [TI, MATH, VIOLIN_M], addable: [] };
const OCT12: WeekCheckIn = { weekStart: "2026-10-12", weekEnd: "2026-10-18", status: "skipped", items: [item({ actual: 60, mode: "keepEndDate" })], addable: [] };
const WEEKS: PastWeek[] = [
  { weekStart: "2026-10-19", weekEnd: "2026-10-25", status: null, hasCheckIns: true },
  { weekStart: "2026-10-12", weekEnd: "2026-10-18", status: "skipped", hasCheckIns: true },
];
const puts = () => fakeApi.calls.filter((c) => c.method === "PUT");

const plan = (assignmentId: string, childId: string, subjectId: string): ChildPlan => ({
  engineVersion: ENGINE_VERSION, assignmentId, childId, subjectId, unitType: "pages", weightPerUnit: 1,
  weightSource: "assignment", totalUnits: 100, doneUnits: 0, remainingUnits: 100, baseRate: 10, rate: 10,
  plannedEnd: "2026-12-01", end: "2026-12-01", mode: null, unplacedUnits: 0, noCapacity: false, complete: false,
  checkInWeeks: [], warnings: [],
  days: ["2026-10-26", "2026-10-27"].map((date) => ({ date, capacity: 1, schoolDay: true, units: 10, thickness: 10, kind: "planned" as const, position: 10 })),
});

function stub(weeks: WeekCheckIn[] = [OCT19, OCT12]) {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: "2026-10-26", to: "2026-11-01", plans: [plan("ti", "c1", "lit")] });
  fakeApi.on("GET /api/children", 200, [
    { id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false },
    { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false },
    { id: "c3", name: "Old Kid", color: null, sortOrder: 2, archived: true },
  ]);
  fakeApi.on("GET /api/subjects", 200, [
    { id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false },
    { id: "math", name: "Math", color: null, sortOrder: 1, archived: false },
  ]);
  fakeApi.on("GET /api/assignments", 200, [
    { id: "ti", subjectId: "lit", title: "Treasure Island" },
    { id: "math", subjectId: "math", title: "Math 5" },
  ]);
  fakeApi.on("GET /api/check-ins/weeks", 200, { weeks: WEEKS });
  for (const w of weeks) {
    fakeApi.on(`GET /api/check-ins?weekStart=${w.weekStart}`, 200, w);
    fakeApi.on(`PUT /api/check-ins/${w.weekStart}`, (body) => {
      const b = body as { status: "reviewed"; items: { assignmentId: string; childId: string; position: number; mode: string | null }[] };
      const items = w.items.map((i) => {
        const s = b.items.find((x) => x.assignmentId === i.assignmentId && x.childId === i.childId);
        return { ...i, actual: s?.position ?? null, mode: (s?.mode ?? null) as CheckInItem["mode"] };
      });
      return [200, { ...w, status: b.status, items, planChanged: true }];
    });
  }
}

function phone(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  }));
}
afterEach(() => vi.unstubAllGlobals());

async function openSheet(name = "Frank", path = "/") {
  renderAt(path);
  await userEvent.click(await screen.findByRole("button", { name: `Make an adjustment for ${name}` }));
  return screen.findByRole("dialog");
}

describe("This Week header", () => {
  it("has the title and one week switcher; no Prev/Next bar, past-week list, or debug extras", async () => {
    stub();
    renderAt("/");
    await screen.findByRole("table", { name: "Frank" });
    expect(screen.getByRole("heading", { level: 1, name: "Plan" })).toBeInTheDocument();
    const switcher = screen.getByRole("group", { name: "Week" });
    expect(within(switcher).getAllByRole("button").map((b) => b.getAttribute("aria-label"))).toEqual(["Previous week", "Next week"]);
    expect(switcher).toHaveTextContent("This week");
    expect(screen.queryByRole("button", { name: "Review a past week" })).toBeNull();
    expect(screen.queryByRole("button", { name: /Prev week/ })).toBeNull();
    expect(screen.queryByText(/Debug view|Plan as of|Week of/)).toBeNull();
  });

  it("shownWeek: the sheet edits the shown week once it's over, otherwise last week", () => {
    expect(shownWeek(null, "2026-10-28", "mon")).toEqual({ weekStart: "2026-10-26", weekEnd: "2026-11-01", currentWeekStart: "2026-10-26", checkInWeekStart: "2026-10-19" });
    expect(shownWeek("2026-10-14", "2026-10-28", "mon").checkInWeekStart).toBe("2026-10-12");
    expect(shownWeek("2026-11-04", "2026-10-28", "mon").checkInWeekStart).toBe("2026-10-19");
    expect(shownWeek("nonsense", "2026-10-28", "mon").weekStart).toBe("2026-10-26");
  });
});

describe("Make an adjustment", () => {
  it("one button per active student, nothing opened or fetched until tapped", async () => {
    stub();
    renderAt("/");
    expect(await screen.findByRole("button", { name: "Make an adjustment for Frank" })).toHaveTextContent("Make an adjustment");
    expect(screen.getByRole("button", { name: "Make an adjustment for Margaret" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Old Kid/ })).toBeNull();
    // Beside the student's name, above their table (which keeps its caption as its name).
    const frank = screen.getByRole("button", { name: "Make an adjustment for Frank" });
    expect(frank.closest(".plan-child-head")).toHaveTextContent(/^Frank/);
    expect(screen.getByRole("table", { name: "Frank" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(fakeApi.calls.some((c) => c.path.startsWith("/api/check-ins?weekStart="))).toBe(false);
  });

  it("wide screens get a Dialog, phones a Drawer; both titled with the child and Last week · its dates (T-09)", async () => {
    stub();
    phone(false);
    const dialog = await openSheet();
    expect(dialog).toHaveAttribute("data-sheet", "dialog");
    expect(dialog).toHaveAccessibleName("Frank · Last week · Oct 19–25");
    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("phones get the Drawer", async () => {
    stub();
    phone(true);
    const drawer = await openSheet("Margaret");
    expect(drawer).toHaveAttribute("data-sheet", "drawer");
    expect(drawer).toHaveAccessibleName("Margaret · Last week · Oct 19–25");
  });

  it("shows only that child's rows, in the same calm rows as the card, each tinted with its subject's pastel", async () => {
    stub();
    const sheet = await openSheet();
    expect(fakeApi.calls.map((c) => c.path)).toContain("/api/check-ins?weekStart=2026-10-19");
    const toggles = await within(sheet).findAllByRole("button", { expanded: false });
    expect(toggles.map((t) => t.textContent)).toEqual(["Treasure Islandpp. 1–80✓As planned", "Math 5Lessons 11–15✓As planned"]);
    expect(within(sheet).queryByText(/Violin/)).toBeNull();
    expect(within(sheet).queryByRole("group", { name: "Child" })).toBeNull();
    const rows = within(sheet).getAllByRole("listitem");
    expect(rows.map((r) => r.style.getPropertyValue("--checkin-row-tint"))).toEqual(["var(--tl-subject-1-pastel)", "var(--tl-subject-2-pastel)"]);
    // No prompt buttons or card header in the sheet, just Save (edit mode: re-saving unchanged is allowed).
    expect(within(sheet).queryByRole("button", { name: "Skip" })).toBeNull();
    expect(within(sheet).queryByRole("button", { name: "Looks right" })).toBeNull();
    expect(within(sheet).getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("saving sends this child's change and keeps the other children's stored rows (the PUT replaces the week)", async () => {
    stub();
    const sheet = await openSheet();
    await within(sheet).findByRole("list");
    const ti = await rowFor(sheet, "Treasure Island");
    await choose(ti, "Less");
    await step(ti, "One less", 14);
    expect(ti.querySelector(".checkin-row-state")).toHaveTextContent("65 of 80 pp.");
    await userEvent.click(within(sheet).getByRole("button", { name: "Save" }));
    expect(puts().at(-1)).toMatchObject({
      path: "/api/check-ins/2026-10-19",
      body: { status: "reviewed", items: [
        { assignmentId: "ti", childId: "c1", position: 65, mode: "keepEndDate" },
        { assignmentId: "violin", childId: "c2", position: 700, mode: "pushEndDate" },
      ] },
    });
    expect(await within(sheet).findByRole("status")).toHaveTextContent("Thanks — plan updated");
    expect(fakeApi.bodyKeyViolations).toEqual([]);
  });

  it("a save from the sheet refreshes last week's prompt on the page (it goes once the week is reviewed)", async () => {
    stub();
    let home: WeekCheckIn = OCT19;
    fakeApi.on("GET /api/check-ins", () => [200, home]);
    fakeApi.on(`PUT /api/check-ins/${OCT19.weekStart}`, () => {
      home = { ...OCT19, status: "reviewed" };
      return [200, { ...home, planChanged: true }];
    });
    renderAt("/");
    expect(await screen.findByRole("region", { name: /How did last week go\?/ })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Make an adjustment for Frank" }));
    const sheet = await screen.findByRole("dialog");
    await userEvent.click(await within(sheet).findByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.queryByRole("region", { name: /How did last week go\?/ })).toBeNull());
  });

  it("a past shown week is adjusted as itself, prefilled and keeping its stored mode; a skipped week saves as reviewed", async () => {
    stub();
    const sheet = await openSheet("Frank", "/?week=2026-10-14");
    expect(sheet).toHaveAccessibleName("Frank · Oct 12–18");
    await within(sheet).findByRole("list");
    expect(within(sheet).queryByText(/skipped/)).toBeNull();
    const ti = await rowFor(sheet, "Treasure Island");
    expect(ti.querySelector(".checkin-row-state")).toHaveTextContent("60 of 80 pp.");
    await step(ti, "One more", 10);
    await userEvent.click(within(sheet).getByRole("button", { name: "Save" }));
    expect(puts().at(-1)).toMatchObject({
      path: "/api/check-ins/2026-10-12",
      body: { status: "reviewed", items: [{ assignmentId: "ti", position: 70, mode: "keepEndDate" }] },
    });
  });

  it("Undo on a stored row removes it from the week on Save", async () => {
    stub();
    const sheet = await openSheet("Frank", "/?week=2026-10-14");
    await within(sheet).findByRole("list");
    await userEvent.click(within(sheet).getByRole("button", { name: "Undo Treasure Island for Frank" }));
    await userEvent.click(within(sheet).getByRole("button", { name: "Save" }));
    expect(puts().at(-1)).toMatchObject({ path: "/api/check-ins/2026-10-12", body: { status: "reviewed", items: [] } });
  });

  it("sheetTitle says Last week only for last week", () => {
    expect(sheetTitle("Frank", "2026-10-19", "2026-10-25", true)).toBe("Frank · Last week · Oct 19–25");
    expect(sheetTitle("Frank", "2026-10-12", "2026-10-18", false)).toBe("Frank · Oct 12–18");
  });

  it("the later-check-ins note shows only when a later week has check-ins", async () => {
    stub();
    const older = await openSheet("Frank", "/?week=2026-10-14");
    expect(await within(older).findByText(LATER_NOTE)).toBeInTheDocument();
    expect(laterCheckInsExist(WEEKS, "2026-10-19")).toBe(false);
    expect(laterCheckInsExist(WEEKS, "2026-10-12")).toBe(true);
  });

  it("no note for last week when nothing later has check-ins", async () => {
    stub();
    const sheet = await openSheet();
    await within(sheet).findAllByRole("button", { expanded: false });
    await waitFor(() => expect(fakeApi.calls.some((c) => c.path === "/api/check-ins/weeks")).toBe(true));
    expect(within(sheet).queryByText(LATER_NOTE)).toBeNull();
  });

  it("a child with nothing planned this week still gets the button", async () => {
    stub();
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: "2026-10-26", to: "2026-11-01", plans: [] });
    renderAt("/");
    expect(await screen.findByText("Nothing planned this week.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Make an adjustment for Frank" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Make an adjustment for Margaret" })).toBeInTheDocument();
  });
});

describe("childWeek", () => {
  it("forChild keeps one child's rows and addable pairs", () => {
    const week = { ...OCT19, addable: [item({ assignmentId: "sci", childId: "c2" })] };
    expect(forChild(week, "c1").items.map((i) => i.assignmentId)).toEqual(["ti", "math"]);
    expect(forChild(week, "c1").addable).toEqual([]);
    expect(forChild(week, "c2").addable).toHaveLength(1);
  });
  it("withOtherChildren appends only the other children's stored rows", () => {
    expect(withOtherChildren(OCT19, "c1", [])).toEqual([{ assignmentId: "violin", childId: "c2", position: 700, mode: "pushEndDate" }]);
    expect(withOtherChildren(OCT19, "c2", [])).toEqual([]);
  });
});
