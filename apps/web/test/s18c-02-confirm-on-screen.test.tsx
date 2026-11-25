// S18c-02: after Save on a past end date, Continue and No are on screen with the question.
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, planAll, type Assignment as EngineAssignment, type ChildPlan, type ProgressCheckIn } from "@hh/engine";
import type { CheckInItem, WeekCheckIn } from "../src/api/types";
import { confirmFitsOnScreen } from "../src/features/status/confirmView";
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

function stub() {
  fakeApi.on("GET /api/children", 200, [{ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false }]);
  fakeApi.on("GET /api/subjects", 200, [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false }]);
  fakeApi.on("GET /api/assignments", 200, [{ id: "ti", subjectId: "lit", title: "Treasure Island", startDate: "2026-09-07", endDate: END, childIds: ["c1"], archived: false, weekdays: null }]);
  fakeApi.on("GET /api/blocked-ranges", 200, []);
  fakeApi.on("GET /api/events", 200, []);
  fakeApi.on("GET /api/week-overrides", 200, { overrides: [] });
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: TODAY, from: "2026-08-01", to: "2027-06-30", plans: [extended()] });
  fakeApi.on("GET /api/check-ins", 200, WEEK);
}

describe("Continue and No stay on screen (S18c-02)", () => {
  it("the confirm block fits a 360 px and a 440 px phone that is 800 px tall", () => {
    for (const width of [360, 440]) expect(confirmFitsOnScreen({ width, height: 800 })).toBe(true);
  });

  it("after Save on a past date, Continue and No lead the sheet and nothing is written until Continue", async () => {
    const user = userEvent.setup();
    stub();
    renderAt("/schedule?view=week");
    const frank = await screen.findByRole("region", { name: "Frank's work" });
    await user.click(await within(frank).findByRole("button", { name: /Treasure Island/ }));
    const adjust = await screen.findByRole("dialog");
    await user.click(await within(adjust).findByRole("button", { name: "Update status for Treasure Island" }));
    const sheet = within(await screen.findByRole("dialog", { name: "Treasure Island" }));
    await user.click(sheet.getByRole("button", { name: "One less" }));
    await user.click(await sheet.findByRole("radio", { name: /^Pick a date/ }));
    const field = sheet.getByRole("textbox", { name: "New end date" });
    await user.clear(field);
    await user.type(field, "Oct 27, 2026");
    await user.click(sheet.getByRole("button", { name: "Save" }));
    const block = (await sheet.findByText(QUESTION)).closest(".status-confirm-block");
    expect(block).toBeTruthy();
    expect(block!.querySelector(".status-sheet, .status-sub")).toBeNull();
    const body = block!.parentElement!;
    expect(body.firstElementChild).toBe(block);
    expect(within(block as HTMLElement).getByRole("button", { name: "Continue" })).toBeInTheDocument();
    expect(within(block as HTMLElement).getByRole("button", { name: "No" })).toBeInTheDocument();
    expect(within(block as HTMLElement).getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(body.querySelectorAll(".status-confirm-block")).toHaveLength(1);
    expect(puts()).toHaveLength(0);
    await user.click(within(block as HTMLElement).getByRole("button", { name: "No" }));
    expect(sheet.queryByText(QUESTION)).toBeNull();
    expect(puts()).toHaveLength(0);
  });
});
