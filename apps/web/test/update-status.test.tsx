// S8-06 / S9-02: Update status (from a Week bar, the Year edit bar and a finished week), and the retired weekly check-in card.
import { readFileSync } from "node:fs";
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ENGINE_VERSION, type ChildPlan } from "@hh/engine";
import type { CheckInItem, WeekCheckIn } from "../src/api/types";
import { endChoices, shiftSchoolDays } from "../src/features/status/endDates";
import { statusBody } from "../src/features/status/saveStatus";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_SUBJECTS, samplePlans } from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

const item = (over: Partial<CheckInItem>): CheckInItem => ({
  assignmentId: "ti", childId: "c1", childName: "Frank", title: "Treasure Island", unitType: "pages",
  plannedFrom: 0, plannedTo: 80, totalUnits: 270, actual: null, mode: null, ...over,
});
const TI = item({});
const MATH = item({ assignmentId: "math", title: "Math 5", unitType: "lessons", plannedFrom: 10, plannedTo: 15, totalUnits: 120 });
const VIOLIN = item({ assignmentId: "violin", childId: "c2", childName: "Margaret", title: "Violin", unitType: "minutes", plannedFrom: 600, plannedTo: 750, totalUnits: 3000 });
const WEEK: WeekCheckIn = { weekStart: "2026-10-19", weekEnd: "2026-10-25", status: null, items: [TI, MATH, VIOLIN], addable: [] };

// The plan the sheet works the end dates from: Treasure Island ends Tue 2026-12-01 at 10 pages a day.
const plan = (assignmentId: string, childId: string): ChildPlan => ({
  engineVersion: ENGINE_VERSION, assignmentId, childId, subjectId: "lit", unitType: "pages", weightPerUnit: 1,
  weightSource: "assignment", weekdays: null, weekdaysSource: "default", totalUnits: 270, doneUnits: 0, remainingUnits: 270, baseRate: 10, rate: 10,
  plannedEnd: "2026-12-01", end: "2026-12-01", mode: null, unplacedUnits: 0, noCapacity: false, complete: false,
  checkInWeeks: [], adjustedWeeks: [], weekdaysFrom: null, previousWeekdays: null, warnings: [],
  days: ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"]
    .map((date) => ({ date, capacity: 1, schoolDay: true, units: 10, thickness: 10, kind: "planned" as const, position: 10 })),
} as ChildPlan);

const PUT = "PUT /api/check-ins/2026-10-19";
const puts = () => fakeApi.calls.filter((c) => c.method === "PUT" && c.path.startsWith("/api/check-ins/"));
const body = () => puts()[0]!.body as { status: string; items: { assignmentId: string; childId: string; position: number; mode: string | null }[] };

function stub(week: WeekCheckIn = WEEK) {
  fakeApi.on("GET /api/children", 200, [
    { id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false },
    { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false },
  ]);
  fakeApi.on("GET /api/subjects", 200, [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false }]);
  const span = { startDate: "2026-08-31", endDate: "2027-05-28", archived: false };
  fakeApi.on("GET /api/assignments", 200, [
    { id: "ti", subjectId: "lit", title: "Treasure Island", childIds: ["c1"], ...span }, { id: "math", subjectId: "lit", title: "Math 5", childIds: ["c1"], ...span },
    { id: "violin", subjectId: "lit", title: "Violin", childIds: ["c2"], ...span },
  ]);
  fakeApi.on("GET /api/blocked-ranges", 200, []);
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: "2026-10-19", to: "2026-10-25", plans: [plan("ti", "c1"), plan("math", "c1"), plan("violin", "c2")] });
  fakeApi.on("GET /api/events", 200, []);
  fakeApi.on("GET /api/week-overrides", 200, { overrides: [] });
  fakeApi.on("GET /api/check-ins", 200, week);
  fakeApi.on("GET /api/check-ins?weekStart=2026-10-19", 200, week);
  fakeApi.on(PUT, (b) => {
    const sent = b as { status: "reviewed"; items: { assignmentId: string; childId: string; position: number; mode: string | null }[] };
    const items = week.items.map((i) => {
      const s = sent.items.find((x) => x.assignmentId === i.assignmentId && x.childId === i.childId);
      return { ...i, actual: s?.position ?? null, mode: (s?.mode ?? null) as CheckInItem["mode"] };
    });
    return [200, { ...week, status: sent.status, items, planChanged: sent.items.length > 0 }];
  });
}
beforeEach(() => { stub(); localStorage.clear(); });

/** The current week (Oct 26 - Nov 1): a bar opens the adjustment, whose rows offer Update status. */
async function openStatusFromWeek(user: ReturnType<typeof userEvent.setup>, title: string) {
  renderAt("/schedule?view=week");
  const frank = await screen.findByRole("region", { name: "Frank's work" });
  await user.click(await within(frank).findByRole("button", { name: new RegExp(title) }));
  const adjust = await screen.findByRole("dialog");
  await user.click(await within(adjust).findByRole("button", { name: `Update status for ${title}` }));
  return within(await screen.findByRole("dialog"));
}

describe("the weekly check-in is retired (S9-02)", () => {
  it("no screen asks 'Did everything get done?', and no bar has a round check or a Save check-in button", async () => {
    const user = userEvent.setup();
    renderAt("/");
    await within(await screen.findByRole("main")).findByRole("link", { name: "Schedule" });
    expect(screen.queryByText("Did everything get done?")).toBeNull();
    expect(screen.queryByText(/isn't checked in yet|needs a quick check/)).toBeNull();
    await user.click(within(screen.getByRole("navigation", { name: "Main" })).getByRole("link", { name: "Schedule" }));
    await screen.findByRole("region", { name: "Frank's work" });
    expect(screen.queryByText("Did everything get done?")).toBeNull();
    expect(screen.queryByText("Last week isn't checked in yet.")).toBeNull();
    expect(document.querySelector(".bar-check")).toBeNull();
  });

  it("/track still lands on Schedule · Week (and there is no Track work page or tab)", async () => {
    const { router } = renderAt("/track?week=2026-10-19");
    await waitFor(() => expect(router.state.location.pathname).toBe("/schedule"));
    expect(router.state.location.search).toContain("view=week");
    expect(screen.queryByRole("link", { name: "Track work" })).toBeNull();
  });

  it("the weeks list is no longer asked for (the nudge is gone), and nothing is deleted from the API", async () => {
    renderAt("/schedule?view=week");
    await screen.findByRole("region", { name: "Frank's work" });
    expect(fakeApi.calls.some((c) => c.path === "/api/check-ins/weeks")).toBe(false);
  });
});

describe("Update status from a Week bar (S9-02)", () => {
  it("Fell behind, got to p. 38, move to the computed date: one PUT for last week with pushEndDate", async () => {
    const user = userEvent.setup();
    const sheet = await openStatusFromWeek(user, "Treasure Island");
    expect(sheet.getByText("How did it go?")).toBeInTheDocument();
    await user.click(sheet.getByRole("button", { name: "Fell behind" }));
    const got = sheet.getByRole("spinbutton", { name: "page reached" });
    await user.clear(got);
    await user.type(got, "38");
    // 42 pages behind at 10 a day is 4 school days: Tue Dec 1 moves to Mon Dec 7.
    expect(sheet.getByText("What about the end date?")).toBeInTheDocument();
    expect(sheet.getByText(/Keep Dec 1/)).toBeInTheDocument();
    await user.click(sheet.getByRole("radio", { name: /Move to Dec 7/ }));
    expect(puts()).toHaveLength(0); // nothing is sent until Save
    await user.click(sheet.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(puts()[0]!.path).toBe("/api/check-ins/2026-10-19");
    expect(body()).toEqual({ status: "reviewed", items: [{ assignmentId: "ti", childId: "c1", position: 38, mode: "pushEndDate" }] });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("Keep is the default: the end stays and the remaining days get heavier", async () => {
    const user = userEvent.setup();
    const sheet = await openStatusFromWeek(user, "Treasure Island");
    await user.click(sheet.getByRole("button", { name: "Fell behind" }));
    expect(sheet.getByRole("radio", { name: /Keep Dec 1/ })).toBeChecked();
    await user.click(sheet.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(body().items[0]).toMatchObject({ assignmentId: "ti", position: 79, mode: "keepEndDate" });
  });

  it("Got ahead offers a lighter end, with an earlier date to move to", async () => {
    const user = userEvent.setup();
    const sheet = await openStatusFromWeek(user, "Treasure Island");
    const got = sheet.getByRole("spinbutton", { name: "page reached" });
    await user.clear(got);
    await user.type(got, "100");
    expect(sheet.getByRole("button", { name: "Got ahead" })).toHaveAttribute("aria-pressed", "true");
    expect(sheet.getByText("The remaining days get a little lighter")).toBeInTheDocument();
    expect(sheet.getByRole("radio", { name: /Move to Nov 27/ })).toBeInTheDocument(); // 20 pages ahead is 2 school days earlier
  });

  it("finishing sends no mode and asks nothing about the end date", async () => {
    const user = userEvent.setup();
    const sheet = await openStatusFromWeek(user, "Treasure Island");
    const got = sheet.getByRole("spinbutton", { name: "page reached" });
    await user.clear(got);
    await user.type(got, "270");
    expect(sheet.queryByText("What about the end date?")).toBeNull();
    await user.click(sheet.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(body().items[0]).toEqual({ assignmentId: "ti", childId: "c1", position: 270, mode: null });
  });

  it("As planned puts it back, − and + step, and Cancel sends nothing", async () => {
    const user = userEvent.setup();
    const sheet = await openStatusFromWeek(user, "Math 5");
    await user.click(sheet.getByRole("button", { name: "One less" }));
    expect(sheet.getByRole("button", { name: "Fell behind" })).toHaveAttribute("aria-pressed", "true");
    await user.click(sheet.getByRole("button", { name: "One more" }));
    expect(sheet.getByRole("button", { name: "As planned" })).toHaveAttribute("aria-pressed", "true");
    await user.click(sheet.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(puts()).toHaveLength(0);
  });

  it("keeps the week's other stored answers and replaces only this bar's; a failed save keeps the sheet and says why", async () => {
    const user = userEvent.setup();
    stub({ ...WEEK, status: "reviewed", items: [TI, item({ ...MATH, actual: 12, mode: "keepEndDate" }), VIOLIN] });
    fakeApi.on(PUT, 400, { error: "invalid_request", message: "items.1.position: can't be more than the total (270)." });
    const sheet = await openStatusFromWeek(user, "Treasure Island");
    await user.click(sheet.getByRole("button", { name: "Fell behind" }));
    await user.click(sheet.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(body().items.map((i) => i.assignmentId)).toEqual(["math", "ti"]);
    expect(await screen.findByText("can't be more than the total (270).")).toBeInTheDocument();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("statusBody (pure): a row back at its plan is dropped, finishing has no mode, other stored rows stay", () => {
    const stored = item({ assignmentId: "math", title: "Math 5", actual: 12, mode: "keepEndDate", plannedFrom: 10, plannedTo: 15, totalUnits: 120, unitType: "lessons" });
    const week: WeekCheckIn = { ...WEEK, items: [TI, stored], addable: [] };
    expect(statusBody(week, TI, 80, null)).toEqual({ status: "reviewed", items: [{ assignmentId: "math", childId: "c1", position: 12, mode: "keepEndDate" }] });
    expect(statusBody(week, TI, 270, "keepEndDate").items[1]).toEqual({ assignmentId: "ti", childId: "c1", position: 270, mode: null });
    expect(statusBody(week, stored, 15, null).items).toEqual([]);
  });
});

describe("Update status from the Year edit bar (S9-02)", () => {
  function stubYear() {
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
    fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
    fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
    fakeApi.on("GET /api/assignments", 200, SAMPLE_ASSIGNMENTS);
    fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
    fakeApi.on("GET /api/events", 200, []);
  }
  function tapBand(svg: Element, nth: number): string {
    const band = svg.querySelectorAll("path.tl-band")[nth]!;
    const [x, y] = band.getAttribute("d")!.slice(1).split(/[ ,LCQVHZ]+/).filter(Boolean).map(Number);
    fireEvent.click(svg, { clientX: x! + 1, clientY: y! + 1 });
    return band.getAttribute("data-assignment")!;
  }
  /** A last finished week holding the selected assignment for each of its children. */
  const weekFor = (assignmentId: string): WeekCheckIn => {
    const a = SAMPLE_ASSIGNMENTS.find((x) => x.id === assignmentId)!;
    const kid = (id: string) => SAMPLE_CHILDREN.find((c) => c.id === id)!.name;
    return { weekStart: "2026-10-05", weekEnd: "2026-10-11", status: null, addable: [],
      items: a.childIds.map((childId) => item({ assignmentId, childId, childName: kid(childId), title: a.title, plannedFrom: 0, plannedTo: 10, totalUnits: 100 })) };
  };

  it("More has Update status; it opens the same sheet for the selected bar and saves one PUT", async () => {
    stubYear();
    const user = userEvent.setup();
    renderAt("/timeline");
    const svg = await screen.findByRole("img", { name: "Year timeline" });
    const id = tapBand(svg, 0);
    const a = SAMPLE_ASSIGNMENTS.find((x) => x.id === id)!;
    const week = weekFor(id);
    fakeApi.on("GET /api/check-ins", 200, week);
    fakeApi.on("PUT /api/check-ins/2026-10-05", 200, { ...week, status: "reviewed", planChanged: true });
    const edit = await screen.findByRole("region", { name: /^Edit / });
    await user.click(within(edit).getByRole("button", { name: "More" }));
    await user.click(within(edit).getByRole("button", { name: "Update status" }));
    const dialog = await screen.findByRole("dialog");
    if (a.childIds.length > 1) {
      expect(within(dialog).getByText("Whose progress?")).toBeInTheDocument();
      await user.click(within(dialog).getByRole("button", { name: week.items[1]!.childName }));
    }
    const sheet = within(await screen.findByText("How did it go?").then((e) => e.closest("[role=dialog]") as HTMLElement));
    await user.click(sheet.getByRole("button", { name: "Fell behind" }));
    await user.click(sheet.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(puts()[0]!.path).toBe("/api/check-ins/2026-10-05");
    expect(body().items).toHaveLength(1);
    expect(body().items[0]).toMatchObject({ assignmentId: id, position: 9, mode: "keepEndDate" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  });

  it("an assignment with nothing planned in the last finished week says so", async () => {
    stubYear();
    const user = userEvent.setup();
    renderAt("/timeline");
    const svg = await screen.findByRole("img", { name: "Year timeline" });
    tapBand(svg, 0);
    fakeApi.on("GET /api/check-ins", 200, { weekStart: "2026-10-05", weekEnd: "2026-10-11", status: null, items: [], addable: [] });
    const edit = await screen.findByRole("region", { name: /^Edit / });
    await user.click(within(edit).getByRole("button", { name: "More" }));
    await user.click(within(edit).getByRole("button", { name: "Update status" }));
    expect(await screen.findByText(/There is nothing to update yet/)).toBeInTheDocument();
  });
});

describe("a finished week on Schedule (S9-02)", () => {
  it("shows its bars with no checks and no Save check-in; a bar opens Update status, which saves by itself", async () => {
    const user = userEvent.setup();
    renderAt("/schedule?view=week&week=2026-10-19");
    expect(await screen.findByRole("heading", { level: 2, name: "Last week" })).toBeInTheDocument();
    const bars = within(await screen.findByRole("region", { name: "Frank's week" }));
    expect(document.querySelector(".bar-check")).toBeNull();
    expect(screen.queryByRole("button", { name: "Save check-in" })).toBeNull();
    await user.click(bars.getByRole("button", { name: /Treasure Island pages 1–80/ }));
    const sheet = within(await screen.findByRole("dialog"));
    await user.click(sheet.getByRole("button", { name: "Fell behind" }));
    await user.click(sheet.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(body().items[0]).toMatchObject({ assignmentId: "ti", position: 79, mode: "keepEndDate" });
  });

  it("a stored answer is shown and prefilled; As planned takes it back out", async () => {
    const user = userEvent.setup();
    stub({ ...WEEK, status: "reviewed", items: [item({ actual: 40, mode: "pushEndDate" }), MATH, VIOLIN] });
    renderAt("/schedule?view=week&week=2026-10-19");
    const bars = within(await screen.findByRole("region", { name: "Frank's week" }));
    expect(await bars.findByText("40 of 80 pp.")).toBeInTheDocument();
    await user.click(bars.getByRole("button", { name: /Treasure Island pages/ }));
    const sheet = within(await screen.findByRole("dialog"));
    expect(sheet.getByRole("radio", { name: /Move to/ })).toBeChecked();
    await user.click(sheet.getByRole("button", { name: "As planned" }));
    await user.click(sheet.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(body()).toEqual({ status: "reviewed", items: [] });
  });
});

describe("end dates (pure)", () => {
  it("shiftSchoolDays walks school days only, forward and back", () => {
    expect(shiftSchoolDays("2026-12-01", 4, [1, 2, 3, 4, 5])).toBe("2026-12-07");
    expect(shiftSchoolDays("2026-12-01", -2, [1, 2, 3, 4, 5])).toBe("2026-11-27");
    expect(shiftSchoolDays("2026-12-01", 0, [1, 2, 3, 4, 5])).toBe("2026-12-01");
    expect(shiftSchoolDays("2026-12-01", 2, [2, 4])).toBe("2026-12-08");
    expect(shiftSchoolDays("2026-12-01", 5, [])).toBe("2026-12-01");
  });
  it("endChoices: keep is the end now; move shifts by the shortfall at the plan's pace, null when it would not move", () => {
    const p = { end: "2026-12-01", rate: 10, baseRate: 10, weekdays: null };
    expect(endChoices(p, 42, [1, 2, 3, 4, 5])).toEqual({ keep: "2026-12-01", move: "2026-12-07" });
    expect(endChoices(p, -20, [1, 2, 3, 4, 5])).toEqual({ keep: "2026-12-01", move: "2026-11-27" });
    expect(endChoices(p, 0, [1, 2, 3, 4, 5]).move).toBeNull();
    expect(endChoices({ ...p, rate: 0, baseRate: 0 }, 5, [1, 2, 3, 4, 5]).move).toBeNull();
    expect(endChoices({ ...p, weekdays: [2, 4] as never }, 20, [1, 2, 3, 4, 5]).move).toBe("2026-12-08");
  });
});

describe("a phone at 360 px (S7b re-test R1)", () => {
  const css = readFileSync("src/features/status/status.css", "utf8") + readFileSync("src/features/week/week.css", "utf8") + readFileSync("src/ui/soft-paper.css", "utf8");
  it("'As planned' and its siblings never wrap mid-control, and every target is 44 px", () => {
    expect(css).toMatch(/\.status-ways \.chip \{[^}]*white-space: nowrap/);
    expect(css).toMatch(/\.chip \{[^}]*min-height: 44px/);
    expect(css).toMatch(/\.round-btn \{[^}]*width: 44px; height: 44px/);
  });
});

describe("Update status can be undone (S18-01)", () => {
  it("Save closes the sheet and shows 'Updated Treasure Island. Undo'; Undo asks the API to take it back", async () => {
    const user = userEvent.setup();
    fakeApi.on("GET /api/undo", 200, { label: "Updated Treasure Island", createdAt: "2026-10-28T15:00:00.000Z" });
    fakeApi.on("POST /api/undo", 200, { label: "Updated Treasure Island" });
    const sheet = await openStatusFromWeek(user, "Treasure Island");
    await user.click(sheet.getByRole("button", { name: "Fell behind" }));
    await user.click(sheet.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const bar = await screen.findByRole("status");
    expect(bar).toHaveTextContent("Updated Treasure Island.");
    await user.click(within(bar).getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(fakeApi.calls.some((c) => c.method === "POST" && c.path === "/api/undo")).toBe(true));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Undo" })).toBeNull());
  });

  it("a finished week's Update status leaves the same bar", async () => {
    const user = userEvent.setup();
    fakeApi.on("GET /api/undo", 200, { label: "Updated Treasure Island", createdAt: "2026-10-28T15:00:00.000Z" });
    renderAt("/schedule?view=week&week=2026-10-19");
    const bars = within(await screen.findByRole("region", { name: "Frank's week" }));
    await user.click(bars.getByRole("button", { name: /Treasure Island pages 1–80/ }));
    const sheet = within(await screen.findByRole("dialog"));
    await user.click(sheet.getByRole("button", { name: "Fell behind" }));
    await user.click(sheet.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("button", { name: "Undo" })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent("Updated Treasure Island.");
  });
});
