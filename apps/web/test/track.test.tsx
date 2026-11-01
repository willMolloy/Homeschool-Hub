// S8-06: Track work: last week's one question, a check per bar, and Update status.
import { readFileSync } from "node:fs";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ENGINE_VERSION, type ChildPlan } from "@hh/engine";
import type { CheckInItem, WeekCheckIn } from "../src/api/types";
import { endChoices, shiftSchoolDays } from "../src/features/track/endDates";
import { fakeApi } from "./helpers/fake-api";
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
  checkInWeeks: [], adjustedWeeks: [], weekdaysFrom: null, previousWeekdays: null, warnings: [], days: [],
} as ChildPlan);

const PUT = "PUT /api/check-ins/2026-10-19";
const puts = () => fakeApi.calls.filter((c) => c.method === "PUT");

function stub(week: WeekCheckIn = WEEK) {
  fakeApi.on("GET /api/children", 200, [
    { id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false },
    { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false },
  ]);
  fakeApi.on("GET /api/subjects", 200, [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false }]);
  fakeApi.on("GET /api/assignments", 200, [
    { id: "ti", subjectId: "lit", title: "Treasure Island" }, { id: "math", subjectId: "lit", title: "Math 5" }, { id: "violin", subjectId: "lit", title: "Violin" },
  ]);
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: "2026-10-19", to: "2026-10-25", plans: [plan("ti", "c1"), plan("math", "c1"), plan("violin", "c2")] });
  fakeApi.on("GET /api/check-ins", 200, week);
  fakeApi.on("GET /api/check-ins?weekStart=2026-10-19", 200, week);
  fakeApi.on("GET /api/check-ins/weeks", 200, { weeks: [] });
  fakeApi.on(PUT, (body) => {
    const b = body as { status: "reviewed"; items: { assignmentId: string; childId: string; position: number; mode: string | null }[] };
    const items = week.items.map((i) => {
      const s = b.items.find((x) => x.assignmentId === i.assignmentId && x.childId === i.childId);
      return { ...i, actual: s?.position ?? null, mode: (s?.mode ?? null) as CheckInItem["mode"] };
    });
    return [200, { ...week, status: b.status, items, planChanged: b.items.length > 0 }];
  });
}
const body = () => puts()[0]!.body as { status: string; items: { assignmentId: string; childId: string; position: number; mode: string | null }[] };
const frankBars = async () => within(await screen.findByRole("region", { name: "Frank's last week" }));
const openBar = async (user: ReturnType<typeof userEvent.setup>, name: RegExp) => {
  await user.click((await frankBars()).getByRole("button", { name }));
  return screen.findByRole("dialog");
};

beforeEach(() => { stub(); localStorage.clear(); });

describe("Track work: the one question", () => {
  it("opens on last week's question, with the dates, and no bars until Not quite", async () => {
    renderAt("/track");
    const card = await screen.findByRole("region", { name: "Last week's check-in" });
    expect(within(card).getByRole("heading", { name: "Last week · 19 Oct – 25 Oct" })).toBeInTheDocument();
    expect(within(card).getByText("Did everything get done?")).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Yes, all done" })).toBeInTheDocument();
    expect(screen.queryByRole("region", { name: "Frank's last week" })).toBeNull();
  });

  it("Yes, all done checks in the week as planned with one tap, once", async () => {
    const user = userEvent.setup();
    renderAt("/track");
    await user.click(await screen.findByRole("button", { name: "Yes, all done" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Thanks!");
    expect(puts()).toHaveLength(1);
    expect(body()).toEqual({ status: "reviewed", items: [] });
    expect(screen.queryByRole("region", { name: "Last week's check-in" })).toBeNull();
    expect(await frankBars()).toBeTruthy(); // the bars stay, to correct
  });

  it("the card stays until answered: it is there on every visit, and Not quite does not answer it", async () => {
    const user = userEvent.setup();
    const first = renderAt("/track");
    await user.click(await screen.findByRole("button", { name: "Not quite" }));
    expect(puts()).toHaveLength(0);
    first.unmount();
    renderAt("/track");
    expect(await screen.findByRole("region", { name: "Last week's check-in" })).toBeInTheDocument();
  });

  it("an answered week shows no question, and a week with nothing planned says so", async () => {
    stub({ ...WEEK, status: "reviewed" });
    const first = renderAt("/track");
    await frankBars();
    expect(screen.queryByRole("button", { name: "Yes, all done" })).toBeNull();
    first.unmount();
    stub({ ...WEEK, items: [], status: null });
    renderAt("/track");
    expect(await screen.findByText(/Nothing was planned last week/)).toBeInTheDocument();
  });

  it("one child at a time: All children, Frank or Margaret", async () => {
    const user = userEvent.setup();
    renderAt("/track");
    await user.click(await screen.findByRole("button", { name: "Not quite" }));
    await frankBars();
    expect(screen.queryByRole("region", { name: "Margaret's last week" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Margaret" }));
    expect(within(await screen.findByRole("region", { name: "Margaret's last week" })).getByRole("button", { name: /Violin 150 minutes/ })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "All children" }));
    await frankBars();
    await screen.findByRole("region", { name: "Margaret's last week" });
  });
});

describe("Track work: the checks", () => {
  it("every bar starts checked (the plan assumed it was done); unchecking one is 'didn't get to it'", async () => {
    const user = userEvent.setup();
    renderAt("/track");
    await user.click(await screen.findByRole("button", { name: "Not quite" }));
    const bars = await frankBars();
    for (const n of ["Treasure Island completed", "Math 5 completed"]) expect(bars.getByRole("button", { name: n })).toHaveAttribute("aria-pressed", "true");
    expect(bars.getByRole("button", { name: /Treasure Island pages 1–80/ })).toBeInTheDocument();
    await user.click(bars.getByRole("button", { name: "Treasure Island completed" }));
    expect(bars.getByRole("button", { name: "Treasure Island completed" })).toHaveAttribute("aria-pressed", "false");
    expect(bars.getByText("Missed")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save check-in" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(body()).toEqual({ status: "reviewed", items: [{ assignmentId: "ti", childId: "c1", position: 0, mode: "keepEndDate" }] });
  });

  it("Save check-in after Not quite with nothing changed saves the week as planned", async () => {
    const user = userEvent.setup();
    renderAt("/track");
    await user.click(await screen.findByRole("button", { name: "Not quite" }));
    await user.click(await screen.findByRole("button", { name: "Save check-in" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(body()).toEqual({ status: "reviewed", items: [] });
  });

  it("a 400 shows on its bar and the board stays", async () => {
    const user = userEvent.setup();
    fakeApi.on(PUT, 400, { error: "invalid_request", message: "items.0.position: can't be more than the total (270)." });
    renderAt("/track");
    await user.click(await screen.findByRole("button", { name: "Not quite" }));
    await user.click((await frankBars()).getByRole("button", { name: "Treasure Island completed" }));
    await user.click(screen.getByRole("button", { name: "Save check-in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("can't be more than the total (270).");
    expect(await frankBars()).toBeTruthy();
  });

  it("Add progress on something else adds a bar for it", async () => {
    const user = userEvent.setup();
    stub({ ...WEEK, addable: [item({ assignmentId: "sci", title: "Science 5", unitType: "lessons", plannedFrom: 22, plannedTo: 22, totalUnits: 100 })] });
    renderAt("/track");
    await user.click(await screen.findByRole("button", { name: "Not quite" }));
    await user.click(await screen.findByRole("button", { name: "Add progress on something else" }));
    await user.click(screen.getByRole("button", { name: "Frank — Science 5" }));
    expect((await frankBars()).getByRole("button", { name: /Science 5/ })).toBeInTheDocument();
  });
});

describe("Update status", () => {
  it("Fell behind, got to p. 38, move to the computed date: saves pushEndDate", async () => {
    const user = userEvent.setup();
    renderAt("/track");
    await user.click(await screen.findByRole("button", { name: "Not quite" }));
    const sheet = within(await openBar(user, /Treasure Island pages 1–80/));
    expect(sheet.getByText("How did it go?")).toBeInTheDocument();
    await user.click(sheet.getByRole("button", { name: "Fell behind" }));
    const got = sheet.getByRole("spinbutton", { name: "page reached" });
    await user.clear(got);
    await user.type(got, "38");
    // 42 pages behind at 10 a day is 4 school days: Tue 1 Dec moves to Mon 7 Dec.
    expect(sheet.getByText("What about the end date?")).toBeInTheDocument();
    expect(sheet.getByText(/Keep 1 Dec/)).toBeInTheDocument();
    expect(sheet.getByText("The remaining days get a little heavier")).toBeInTheDocument();
    await user.click(sheet.getByRole("radio", { name: /Move to 7 Dec/ }));
    expect(sheet.getByText("Keep the same pace")).toBeInTheDocument();
    await user.click(sheet.getByRole("button", { name: "Save" }));
    const bars = await frankBars();
    expect(bars.getByText("38 of 80 pp.")).toBeInTheDocument();
    expect(puts()).toHaveLength(0); // nothing is sent until Save check-in
    await user.click(screen.getByRole("button", { name: "Save check-in" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(body()).toEqual({ status: "reviewed", items: [{ assignmentId: "ti", childId: "c1", position: 38, mode: "pushEndDate" }] });
  });

  it("Keep is the default: the end stays and the remaining days get heavier", async () => {
    const user = userEvent.setup();
    renderAt("/track");
    await user.click(await screen.findByRole("button", { name: "Not quite" }));
    const sheet = within(await openBar(user, /Treasure Island pages/));
    await user.click(sheet.getByRole("button", { name: "Fell behind" }));
    expect(sheet.getByRole("radio", { name: /Keep 1 Dec/ })).toBeChecked();
    await user.click(sheet.getByRole("button", { name: "Save" }));
    await user.click(screen.getByRole("button", { name: "Save check-in" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(body().items[0]).toMatchObject({ assignmentId: "ti", position: 79, mode: "keepEndDate" });
  });

  it("Got ahead offers a lighter end, with an earlier date to move to", async () => {
    const user = userEvent.setup();
    renderAt("/track");
    await user.click(await screen.findByRole("button", { name: "Not quite" }));
    const sheet = within(await openBar(user, /Treasure Island pages/));
    const got = sheet.getByRole("spinbutton", { name: "page reached" });
    await user.clear(got);
    await user.type(got, "100");
    expect(sheet.getByRole("button", { name: "Got ahead" })).toHaveAttribute("aria-pressed", "true");
    expect(sheet.getByText("The remaining days get a little lighter")).toBeInTheDocument();
    expect(sheet.getByRole("radio", { name: /Move to 27 Nov/ })).toBeInTheDocument(); // 20 pages ahead is 2 school days earlier
  });

  it("finishing sends no mode and asks nothing about the end date", async () => {
    const user = userEvent.setup();
    renderAt("/track");
    await user.click(await screen.findByRole("button", { name: "Not quite" }));
    const sheet = within(await openBar(user, /Treasure Island pages/));
    const got = sheet.getByRole("spinbutton", { name: "page reached" });
    await user.clear(got);
    await user.type(got, "270");
    expect(sheet.queryByText("What about the end date?")).toBeNull();
    await user.click(sheet.getByRole("button", { name: "Save" }));
    expect((await frankBars()).getByText("Finished")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Save check-in" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(body().items[0]).toEqual({ assignmentId: "ti", childId: "c1", position: 270, mode: null });
  });

  it("As planned puts it back, − and + step, and Cancel changes nothing", async () => {
    const user = userEvent.setup();
    renderAt("/track");
    await user.click(await screen.findByRole("button", { name: "Not quite" }));
    const sheet = within(await openBar(user, /Math 5 lessons 11–15/));
    await user.click(sheet.getByRole("button", { name: "One less" }));
    expect(sheet.getByRole("button", { name: "Fell behind" })).toHaveAttribute("aria-pressed", "true");
    await user.click(sheet.getByRole("button", { name: "One more" }));
    expect(sheet.getByRole("button", { name: "As planned" })).toHaveAttribute("aria-pressed", "true");
    await user.click(sheet.getByRole("button", { name: "One more" }));
    await user.click(sheet.getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.queryByRole("button", { name: "Save check-in" })).not.toBeNull(); // Not quite still offers it
    expect(puts()).toHaveLength(0);
    expect((await frankBars()).queryByText(/more than planned/)).toBeNull();
  });

  it("a stored answer is prefilled when an answered week is reopened", async () => {
    const user = userEvent.setup();
    stub({ ...WEEK, status: "reviewed", items: [item({ actual: 40, mode: "pushEndDate" }), MATH, VIOLIN] });
    renderAt("/track");
    expect((await frankBars()).getByText("40 of 80 pp.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Save check-in" })).toBeNull(); // nothing changed yet
    const sheet = within(await openBar(user, /Treasure Island pages/));
    expect(sheet.getByRole("radio", { name: /Move to/ })).toBeChecked();
    await user.click(sheet.getByRole("button", { name: "As planned" }));
    await user.click(sheet.getByRole("button", { name: "Save" }));
    await user.click(await screen.findByRole("button", { name: "Save check-in" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(body()).toEqual({ status: "reviewed", items: [] });
  });
});

describe("a finished week on Schedule", () => {
  it("is the same board: bars with checks, and a bar opens Update status", async () => {
    const user = userEvent.setup();
    renderAt("/schedule?view=week&week=2026-10-19");
    expect(await screen.findByRole("heading", { level: 2, name: "Last week" })).toBeInTheDocument();
    const bars = within(await screen.findByRole("region", { name: "Frank's week" }));
    expect(bars.getByRole("button", { name: "Treasure Island completed" })).toBeInTheDocument();
    await user.click(bars.getByRole("button", { name: /Treasure Island pages 1–80/ }));
    expect(await screen.findByText("How did it go?")).toBeInTheDocument();
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
  const css = readFileSync("src/features/track/track.css", "utf8") + readFileSync("src/features/week/week.css", "utf8") + readFileSync("src/ui/soft-paper.css", "utf8");
  it("'As planned' and its siblings never wrap mid-control, and every target is 44 px", () => {
    expect(css).toMatch(/\.status-ways \.chip \{[^}]*white-space: nowrap/);
    expect(css).toMatch(/\.chip \{[^}]*min-height: 44px/);
    expect(css).toMatch(/\.bar-check \{[^}]*width: 44px; height: 44px/);
    expect(css).toMatch(/\.round-btn \{[^}]*width: 44px; height: 44px/);
  });
  it("the check sits beside the title, in the same row of the bar", async () => {
    const user = userEvent.setup();
    renderAt("/track");
    await user.click(await screen.findByRole("button", { name: "Not quite" }));
    const bar = (await frankBars()).getByRole("button", { name: "Math 5 completed" }).closest("li")!;
    expect(bar.querySelector(".bar-title")).not.toBeNull();
    expect(bar.children[bar.children.length - 1]!.tagName).toBe("BUTTON");
  });
});
