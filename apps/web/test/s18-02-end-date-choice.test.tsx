// S18-02: Update status offers Keep, Move the end to {the late line's date}, and Pick a date.
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ENGINE_VERSION, planAll, type Assignment as EngineAssignment, type ChildPlan, type ProgressCheckIn } from "@hh/engine";
import type { CheckInItem, WeekCheckIn } from "../src/api/types";
import { buildBriefing, lateEnd, suggestedEnd } from "../src/features/plan/briefingLines";
import { statusBody } from "../src/features/status/saveStatus";
import { shortDate } from "../src/features/schedule/formBits";
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

describe("one function names the suggested end date", () => {
  it("the briefing's action and suggestedEnd agree for a forecast, an extended plan and a pace too slow to forecast", () => {
    const input = (p: ChildPlan) => ({ plans: [p], children: [{ id: "c1", name: "Frank" }], titleOf: () => "Treasure Island", weekStart: "2026-10-26", calendar: CALENDAR as never });
    for (const p of [slow(), extended()]) {
      const line = buildBriefing(input(p))[0]!.lines[0]!;
      expect(line.action!.moveTo).not.toBeNull();
      expect(suggestedEnd(p, CALENDAR as never)).toBe(line.action!.moveTo);
      expect(lateEnd(p, CALENDAR as never)!.end).toBe(line.action!.end);
    }
    expect(suggestedEnd(extended(), CALENDAR as never)).toBe("2027-02-01");
    const onTime = { ...slow(), checkInWeeks: [] } as ChildPlan;
    expect(suggestedEnd(onTime, CALENDAR as never)).toBeNull();
    expect(buildBriefing(input(onTime))).toEqual([]);
  });

  it("Briefing.tsx and the sheet read lateEnd, and neither computes its own forecast", async () => {
    const { readFileSync } = await import("node:fs");
    const briefing = readFileSync("src/features/plan/briefingLines.ts", "utf8");
    expect(briefing.match(/forecastOutcome\(/g)).toHaveLength(1);
    const sheet = readFileSync("src/features/status/UpdateStatusSheet.tsx", "utf8");
    expect(sheet).not.toMatch(/forecast/i);
    expect(readFileSync("src/features/plan/useLateEnd.ts", "utf8")).toMatch(/lateEnd\(/);
  });
});

describe("Update status after Fell behind (S18-02)", () => {
  it("offers the late line's date, and its Keep date, and a free date", async () => {
    stub(extended());
    const user = userEvent.setup();
    const { lateButton, sheet } = await openStatus(user);
    expect(lateButton).toHaveTextContent("Move end to Feb 1, 2027");
    await user.click(sheet.getByRole("button", { name: "Fell behind" }));
    expect(await sheet.findByRole("radio", { name: /^Move the end to Feb 1, 2027/ })).toBeInTheDocument();
    expect(sheet.getByRole("radio", { name: /^Keep Dec 18, 2026/ })).toBeChecked();
    expect(sheet.getByRole("radio", { name: /^Pick a date/ })).toBeInTheDocument();
  });

  it("the date on the late line's button is the date on the sheet's Move option (a forecast, not only an extended plan)", async () => {
    stub(slow());
    const user = userEvent.setup();
    const { lateButton, sheet } = await openStatus(user);
    const date = lateButton.textContent!.replace("Move end to ", "");
    expect(date).toBe(shortDate(suggestedEnd(slow(), CALENDAR as never)!));
    await user.click(sheet.getByRole("button", { name: "Fell behind" }));
    expect(await sheet.findByRole("radio", { name: new RegExp(`^Move the end to ${date}`) })).toBeInTheDocument();
  });

  it("Move the end to the suggested date saves the check-in and the end date in one PUT", async () => {
    stub(extended());
    const user = userEvent.setup();
    const { sheet } = await openStatus(user);
    await user.click(sheet.getByRole("button", { name: "Fell behind" }));
    await user.click(await sheet.findByRole("radio", { name: /^Move the end to Feb 1, 2027/ }));
    await user.click(sheet.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(body()).toEqual({ status: "reviewed", items: [{ assignmentId: "ti", childId: "c1", position: 19, mode: "keepEndDate" }], endDate: { assignmentId: "ti", endDate: "2027-02-01" } });
  });

  it("Pick a date: any later date can be typed and is the one saved", async () => {
    stub(extended());
    const user = userEvent.setup();
    const { sheet } = await openStatus(user);
    await user.click(sheet.getByRole("button", { name: "Fell behind" }));
    await user.click(await sheet.findByRole("radio", { name: /^Pick a date/ }));
    const field = sheet.getByRole("textbox", { name: "New end date" });
    await user.clear(field);
    await user.type(field, "Mar 15, 2027");
    await user.click(sheet.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(body().endDate).toEqual({ assignmentId: "ti", endDate: "2027-03-15" });
    expect(body().items[0]).toMatchObject({ mode: "keepEndDate" });
  });

  it("Pick a date: a blank or too-early date is refused in the sheet and nothing is sent", async () => {
    stub(extended());
    const user = userEvent.setup();
    const { sheet } = await openStatus(user);
    await user.click(sheet.getByRole("button", { name: "Fell behind" }));
    await user.click(await sheet.findByRole("radio", { name: /^Pick a date/ }));
    const field = sheet.getByRole("textbox", { name: "New end date" });
    await user.clear(field);
    await user.click(sheet.getByRole("button", { name: "Save" }));
    expect(await sheet.findByText("Pick the new end date.")).toBeInTheDocument();
    await user.type(field, "Oct 20, 2026");
    await user.click(sheet.getByRole("button", { name: "Save" }));
    expect(await sheet.findByText("Pick a date after Oct 25, 2026.")).toBeInTheDocument();
    expect(puts()).toHaveLength(0);
  });

  it("Keep sends no end date", async () => {
    stub(extended());
    const user = userEvent.setup();
    const { sheet } = await openStatus(user);
    await user.click(sheet.getByRole("button", { name: "Fell behind" }));
    await user.click(sheet.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(body().endDate).toBeUndefined();
  });

  it("statusBody (pure): the end date rides along with the changed assignment only when one is given", () => {
    expect(statusBody(WEEK, TI, 15, "keepEndDate", "2027-02-01").endDate).toEqual({ assignmentId: "ti", endDate: "2027-02-01" });
    expect("endDate" in statusBody(WEEK, TI, 15, "keepEndDate")).toBe(false);
  });
});
