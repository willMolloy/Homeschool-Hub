// S18b-01: a picked end date before today asks "That's before today; this ends the book now. Continue?" before it saves.
import { cleanup, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ENGINE_VERSION, planAll, type Assignment as EngineAssignment, type ChildPlan, type ProgressCheckIn } from "@hh/engine";
import type { CheckInItem, WeekCheckIn } from "../src/api/types";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const CALENDAR = { weekStart: "mon" as const, schoolDays: [1, 2, 3, 4, 5] as number[] };
const TODAY = "2026-10-28";
const A: EngineAssignment = { id: "ti", subjectId: "lit", childIds: ["c1"], unitType: "pages", totalUnits: 100, start: "2026-09-07", end: "2026-12-18" };
const checkIns: ProgressCheckIn[] = [
  { assignmentId: "ti", childId: "c1", weekStart: "2026-09-14", position: 5, mode: "keepEndDate" },
  { assignmentId: "ti", childId: "c1", weekStart: "2026-09-21", position: 10, mode: "keepEndDate" },
];
/** A real plan that the forecast says is late (about 1 page a day against 1.3 planned). */
const slow = (): ChildPlan => planAll([A], { calendar: { ...CALENDAR, schoolDays: CALENDAR.schoolDays as never }, asOf: TODAY, checkIns })[0]!;
/** The same assignment with a keepEndDate adjustment that left no room: the plan runs past its end (the other kind of late line). */
const extended = (): ChildPlan => ({ ...slow(), checkInWeeks: [], warnings: ["keep-end-extended"], plannedEnd: "2026-12-18", end: "2027-02-01" } as ChildPlan);

const TI: CheckInItem = { assignmentId: "ti", childId: "c1", childName: "Frank", title: "Treasure Island", unitType: "pages", plannedFrom: 10, plannedTo: 20, totalUnits: 100, actual: null, mode: null };
const WEEK: WeekCheckIn = { weekStart: "2026-10-19", weekEnd: "2026-10-25", status: null, items: [TI], addable: [] };
const puts = () => fakeApi.calls.filter((c) => c.method === "PUT" && c.path.startsWith("/api/check-ins/"));
const body = () => puts()[0]!.body as { status: string; items: { assignmentId: string; position: number; mode: string | null }[]; endDate?: { assignmentId: string; endDate: string } };

function stub(plan: ChildPlan) {
  fakeApi.on("GET /api/children", 200, [{ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false }]);
  fakeApi.on("GET /api/subjects", 200, [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false }]);
  fakeApi.on("GET /api/assignments", 200, [{ id: "ti", subjectId: "lit", title: "Treasure Island", startDate: "2026-09-07", endDate: "2026-12-18", childIds: ["c1"], archived: false }]);
  fakeApi.on("GET /api/blocked-ranges", 200, []);
  fakeApi.on("GET /api/events", 200, []);
  fakeApi.on("GET /api/week-overrides", 200, { overrides: [] });
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: TODAY, from: "2026-08-01", to: "2027-06-30", plans: [plan] });
  fakeApi.on("GET /api/check-ins", 200, WEEK);
  fakeApi.on("PUT /api/check-ins/2026-10-19", 200, { ...WEEK, status: "reviewed", planChanged: true });
}
beforeEach(() => { localStorage.clear(); });

async function openStatus(user: ReturnType<typeof userEvent.setup>) {
  renderAt("/schedule?view=week");
  const briefing = await screen.findByRole("region", { name: "Weekly briefing" });
  const lateButton = within(briefing).getByRole("button", { name: /^Move end to / });
  const frank = await screen.findByRole("region", { name: "Frank's work" });
  await user.click(await within(frank).findByRole("button", { name: /Treasure Island/ }));
  const adjust = await screen.findByRole("dialog");
  await user.click(await within(adjust).findByRole("button", { name: "Update status for Treasure Island" }));
  return { lateButton, sheet: within(await screen.findByRole("dialog")) };
}

const QUESTION = "That's before today; this ends the book now. Continue?";

async function pickDate(user: ReturnType<typeof userEvent.setup>, text: string) {
  stub(extended());
  const { sheet } = await openStatus(user);
  await user.click(sheet.getByRole("button", { name: "Fell behind" }));
  await user.click(await sheet.findByRole("radio", { name: /^Pick a date/ }));
  const field = sheet.getByRole("textbox", { name: "New end date" });
  await user.clear(field);
  await user.type(field, text);
  await user.click(sheet.getByRole("button", { name: "Save" }));
  return sheet;
}

describe("a past Pick a date asks first (S18b-01; today is Oct 28, 2026)", () => {
  it("asks, sends nothing until Continue, then saves that date once", async () => {
    const user = userEvent.setup();
    const sheet = await pickDate(user, "Oct 27, 2026");
    expect(await sheet.findByText(QUESTION)).toBeInTheDocument();
    expect(sheet.queryByRole("button", { name: "Save" })).toBeNull();
    expect(puts()).toHaveLength(0);
    await user.click(sheet.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(body().endDate).toEqual({ assignmentId: "ti", endDate: "2026-10-27" });
    expect(body().items[0]).toMatchObject({ mode: "keepEndDate" });
  });

  it("No leaves the end where it was: nothing is sent and Save is back", async () => {
    const user = userEvent.setup();
    const sheet = await pickDate(user, "Oct 27, 2026");
    await user.click(await sheet.findByRole("button", { name: "No" }));
    expect(sheet.queryByText(QUESTION)).toBeNull();
    expect(sheet.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(puts()).toHaveLength(0);
  });

  it("changing the date drops the question, and it is asked again for the new past date", async () => {
    const user = userEvent.setup();
    const sheet = await pickDate(user, "Oct 27, 2026");
    await sheet.findByText(QUESTION);
    const field = sheet.getByRole("textbox", { name: "New end date" });
    await user.clear(field);
    await user.type(field, "Oct 26, 2026");
    expect(sheet.queryByText(QUESTION)).toBeNull();
    await user.click(sheet.getByRole("button", { name: "Save" }));
    expect(await sheet.findByText(QUESTION)).toBeInTheDocument();
    expect(puts()).toHaveLength(0);
  });

  it("a date on or before the end of the week is still refused, with no question", async () => {
    const user = userEvent.setup();
    const sheet = await pickDate(user, "Oct 25, 2026");
    expect(await sheet.findByText("Pick a date after Oct 25, 2026.")).toBeInTheDocument();
    expect(sheet.queryByText(QUESTION)).toBeNull();
    expect(puts()).toHaveLength(0);
  });

  it("today and later dates save at once with no question", async () => {
    for (const text of ["Oct 28, 2026", "Nov 20, 2026"]) {
      fakeApi.calls.length = 0;
      const user = userEvent.setup();
      const sheet = await pickDate(user, text);
      await waitFor(() => expect(puts()).toHaveLength(1));
      expect(sheet.queryByText(QUESTION)).toBeNull();
      cleanup();
    }
  });
});
