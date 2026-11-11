// S18b-01: Pick a date may be before today. Saving one asks first and waits. The picker has no minimum of today.
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ENGINE_VERSION, planAll, type Assignment as EngineAssignment, type ChildPlan, type ProgressCheckIn } from "@hh/engine";
import type { CheckInItem, WeekCheckIn } from "../src/api/types";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const CALENDAR = { weekStart: "mon" as const, schoolDays: [1, 2, 3, 4, 5] as number[] };
const TODAY = "2026-10-28";
const END = "2026-12-18";
const A: EngineAssignment = { id: "ti", subjectId: "lit", childIds: ["c1"], unitType: "pages", totalUnits: 100, start: "2026-09-07", end: END };
const checkIns: ProgressCheckIn[] = [
  { assignmentId: "ti", childId: "c1", weekStart: "2026-09-14", position: 5, mode: "keepEndDate" },
  { assignmentId: "ti", childId: "c1", weekStart: "2026-09-21", position: 10, mode: "keepEndDate" },
];
const extended = (): ChildPlan => ({ ...planAll([A], { calendar: { ...CALENDAR, schoolDays: CALENDAR.schoolDays as never }, asOf: TODAY, checkIns })[0]!, checkInWeeks: [], warnings: ["keep-end-extended"], plannedEnd: END, end: "2027-02-01" } as ChildPlan);

const TI: CheckInItem = { assignmentId: "ti", childId: "c1", childName: "Frank", title: "Treasure Island", unitType: "pages", plannedFrom: 10, plannedTo: 20, totalUnits: 100, actual: null, mode: null };
const WEEK: WeekCheckIn = { weekStart: "2026-10-19", weekEnd: "2026-10-25", status: null, items: [TI], addable: [] };
const QUESTION = "That's before today; this ends the book now. Continue?";
const puts = () => fakeApi.calls.filter((c) => c.method === "PUT" && c.path.startsWith("/api/check-ins/"));
const body = () => puts()[0]!.body as { endDate?: { assignmentId: string; endDate: string } };

function stub() {
  fakeApi.on("GET /api/children", 200, [{ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false }]);
  fakeApi.on("GET /api/subjects", 200, [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false }]);
  fakeApi.on("GET /api/assignments", 200, [{ id: "ti", subjectId: "lit", title: "Treasure Island", startDate: "2026-09-07", endDate: END, childIds: ["c1"], archived: false, weekdays: null }]);
  fakeApi.on("GET /api/blocked-ranges", 200, []);
  fakeApi.on("GET /api/events", 200, []);
  fakeApi.on("GET /api/week-overrides", 200, { overrides: [] });
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: TODAY, from: "2026-08-01", to: "2027-06-30", plans: [extended()] });
  fakeApi.on("GET /api/check-ins", 200, WEEK);
  fakeApi.on("PUT /api/check-ins/2026-10-19", 200, { ...WEEK, status: "reviewed", planChanged: true });
}
beforeEach(() => { localStorage.clear(); });

async function pickDate(user: ReturnType<typeof userEvent.setup>, text: string) {
  stub();
  renderAt("/schedule?view=week");
  const frank = await screen.findByRole("region", { name: "Frank's work" });
  await user.click(await within(frank).findByRole("button", { name: /Treasure Island/ }));
  const adjust = await screen.findByRole("dialog");
  await user.click(await within(adjust).findByRole("button", { name: "Update status for Treasure Island" }));
  const sheet = within(await screen.findByRole("dialog"));
  await user.click(sheet.getByRole("button", { name: "Fell behind" }));
  await user.click(await sheet.findByRole("radio", { name: /^Pick a date/ }));
  const field = sheet.getByRole("textbox", { name: "New end date" });
  await user.clear(field);
  if (text) await user.type(field, text);
  return { sheet, field };
}

describe("a past Pick a date asks before it saves (S18b-01)", () => {
  it("the picker has no minimum of today, and a date before today asks and does not save until Continue", async () => {
    const user = userEvent.setup();
    const { sheet, field } = await pickDate(user, "Oct 27, 2026");
    expect(field).not.toHaveAttribute("min");
    expect(field.getAttribute("type")).not.toBe("date");
    await user.click(sheet.getByRole("button", { name: "Save" }));
    expect(await sheet.findByText(QUESTION)).toBeInTheDocument();
    expect(puts()).toHaveLength(0);
    expect(sheet.getByRole("radio", { name: /^Keep Dec 18, 2026/ })).toBeInTheDocument();
    fakeApi.on("GET /api/undo", 200, { label: "Updated Treasure Island, end moved to Oct 27", createdAt: "2026-10-28T15:00:00.000Z" });
    fakeApi.on("POST /api/undo", 200, { label: "Updated Treasure Island, end moved to Oct 27" });
    await user.click(sheet.getByRole("button", { name: "Continue" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(body().endDate).toEqual({ assignmentId: "ti", endDate: "2026-10-27" });
    const bar = await screen.findByRole("status");
    expect(bar).toHaveTextContent("Updated Treasure Island, end moved to Oct 27.");
    await user.click(within(bar).getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(fakeApi.calls.some((c) => c.method === "POST" && c.path === "/api/undo")).toBe(true));
  });

  it("answering No leaves the end date where it was", async () => {
    const user = userEvent.setup();
    const { sheet } = await pickDate(user, "Oct 27, 2026");
    await user.click(sheet.getByRole("button", { name: "Save" }));
    expect(await sheet.findByText(QUESTION)).toBeInTheDocument();
    await user.click(sheet.getByRole("button", { name: "No" }));
    expect(sheet.queryByText(QUESTION)).toBeNull();
    expect(sheet.getByRole("radio", { name: /^Keep Dec 18, 2026/ })).toBeInTheDocument();
    expect(puts()).toHaveLength(0);
    expect(fakeApi.calls.filter((c) => c.method === "PATCH" || c.method === "PUT")).toHaveLength(0);
  });

  it("a date on or before the end of the week is still refused, with no confirmation", async () => {
    const user = userEvent.setup();
    const { sheet } = await pickDate(user, "Oct 20, 2026");
    await user.click(sheet.getByRole("button", { name: "Save" }));
    expect(await sheet.findByText("Pick a date after Oct 25, 2026.")).toBeInTheDocument();
    expect(sheet.queryByText(QUESTION)).toBeNull();
    expect(puts()).toHaveLength(0);
  });

  it("a date of today saves without the new question", async () => {
    const user = userEvent.setup();
    const { sheet } = await pickDate(user, "Oct 28, 2026");
    await user.click(sheet.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(screen.queryByText(QUESTION)).toBeNull();
    expect(body().endDate).toEqual({ assignmentId: "ti", endDate: "2026-10-28" });
  });

  it("a date after today and before the current end saves without the new question", async () => {
    const user = userEvent.setup();
    const { sheet } = await pickDate(user, "Nov 20, 2026");
    await user.click(sheet.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(screen.queryByText(QUESTION)).toBeNull();
    expect(body().endDate).toEqual({ assignmentId: "ti", endDate: "2026-11-20" });
  });
});
