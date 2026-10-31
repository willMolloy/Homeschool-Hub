/**
 * S6-03: "Make an adjustment" on the current or a coming week (WeekAdjustment). A past week keeps the check-in
 * sheet (this-week.test.tsx). The fake family's today is Wed 2026-10-28, so the current week is Oct 26 - Nov 1.
 */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, type ChildPlan } from "@hh/engine";
import { aheadTitle } from "../src/features/checkin/ChildAdjustment";
import { adjustRows, changesFor, stepAmount, type AdjustRow } from "../src/features/plan/weekAdjust";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const plan = (assignmentId: string, childId: string, over: Partial<ChildPlan> = {}): ChildPlan => ({
  engineVersion: ENGINE_VERSION, assignmentId, childId, subjectId: "lit", unitType: "pages", weightPerUnit: 1,
  weightSource: "assignment", weekdays: null, weekdaysSource: "default", totalUnits: 270, doneUnits: 70, remainingUnits: 200, baseRate: 10, rate: 10,
  plannedEnd: "2026-12-01", end: "2026-12-01", mode: null, unplacedUnits: 0, noCapacity: false, complete: false,
  checkInWeeks: [], warnings: [],
  days: ["2026-10-26", "2026-10-27"].map((date) => ({ date, capacity: 1, schoolDay: true, units: 10, thickness: 10, kind: "planned" as const, position: 10 })),
  ...over,
} as ChildPlan);
const TI = plan("ti", "c1");
const MATH = plan("math", "c1", { unitType: "lessons", totalUnits: 120, doneUnits: 10, remainingUnits: 110,
  days: [{ date: "2026-10-28", capacity: 1, schoolDay: true, units: 4, thickness: 4, kind: "planned", position: 14 }] } as Partial<ChildPlan>);
const VIOLIN = plan("violin", "c2", { unitType: "minutes", totalUnits: 3000, remainingUnits: 2000 });

const puts = () => fakeApi.calls.filter((c) => c.method === "PUT");
const deletes = () => fakeApi.calls.filter((c) => c.method === "DELETE");
const planGets = () => fakeApi.calls.filter((c) => c.method === "GET" && c.path.startsWith("/api/plan")).length;
const row = (id: string, childId: string | null, over: object = {}) => ({
  id, assignmentId: "ti", childId, weekStart: "2026-10-26", plannedUnits: 20, mode: "keepEndDate", updatedAt: "2026-10-27T12:00:00.000Z", ...over,
});

function stub(overrides: object[] = []) {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: "2026-10-26", to: "2026-11-01", plans: [TI, MATH, VIOLIN] });
  fakeApi.on("GET /api/children", 200, [
    { id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false },
    { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false },
  ]);
  fakeApi.on("GET /api/subjects", 200, [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false }]);
  fakeApi.on("GET /api/assignments", 200, [
    { id: "ti", subjectId: "lit", title: "Treasure Island" },
    { id: "math", subjectId: "lit", title: "Math 5" },
    { id: "violin", subjectId: "lit", title: "Violin" },
  ]);
  fakeApi.on("GET /api/week-overrides", 200, { overrides });
  fakeApi.on("PUT /api/week-overrides", (body) => [200, { id: "new", updatedAt: "2026-10-28T15:00:00.000Z", ...(body as object) }]);
  fakeApi.on("DELETE /api/week-overrides/o1", 204);
}

async function openSheet(path = "/", name = "Frank") {
  renderAt(path);
  await userEvent.click(await screen.findByRole("button", { name: `Make an adjustment for ${name}` }));
  const sheet = await screen.findByRole("dialog");
  await within(sheet).findByRole("list");
  return sheet;
}
const stepper = (sheet: HTMLElement, title: string) => within(sheet).getByRole("group", { name: `Amount this week for ${title}` });

describe("This Week adjustment (current week)", () => {
  it("opens with each of the child's assignments at this week's planned amount, titled This week", async () => {
    stub();
    const sheet = await openSheet();
    expect(sheet).toHaveAccessibleName("Frank · This week · Oct 26 – Nov 1");
    expect(within(sheet).getAllByRole("listitem").map((li) => li.querySelector(".checkin-row-title")?.textContent)).toEqual(["Math 5", "Treasure Island"]);
    expect(within(stepper(sheet, "Treasure Island")).getByRole("status")).toHaveTextContent("20 pages");
    expect(within(stepper(sheet, "Math 5")).getByRole("status")).toHaveTextContent("4 lessons");
    expect(within(sheet).queryByText(/Violin/)).toBeNull();
    expect(fakeApi.calls.some((c) => c.path.startsWith("/api/check-ins?weekStart="))).toBe(false);
    expect(fakeApi.calls.map((c) => c.path)).toContain("/api/week-overrides?weekStart=2026-10-26");
    // Nothing changed: no question, nothing to save.
    expect(within(sheet).queryByRole("group", { name: "What about the end date?" })).toBeNull();
    expect(within(sheet).getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("4 to 1 lessons keeps the end date by default, sends one PUT, reloads the plan and closes", async () => {
    stub();
    const sheet = await openSheet();
    const before = planGets();
    for (let i = 0; i < 3; i++) await userEvent.click(within(stepper(sheet, "Math 5")).getByRole("button", { name: "One less" }));
    expect(within(stepper(sheet, "Math 5")).getByRole("status")).toHaveTextContent("1 lesson");
    const ask = within(sheet).getByRole("group", { name: "What about the end date?" });
    expect(within(ask).getByRole("button", { name: "Keep the end date" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(within(sheet).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(puts()).toHaveLength(1);
    expect(puts()[0]).toMatchObject({ path: "/api/week-overrides", body: { assignmentId: "math", childId: "c1", weekStart: "2026-10-26", plannedUnits: 1, mode: "keepEndDate" } });
    await waitFor(() => expect(planGets()).toBeGreaterThan(before));
    expect(fakeApi.bodyKeyViolations).toEqual([]);
  });

  it("choosing to move the end date sends pushEndDate", async () => {
    stub();
    const sheet = await openSheet();
    await userEvent.click(within(stepper(sheet, "Treasure Island")).getByRole("button", { name: "One more" }));
    await userEvent.click(within(sheet).getByRole("button", { name: "Move the end date" }));
    await userEvent.click(within(sheet).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(puts()[0]!.body).toMatchObject({ assignmentId: "ti", plannedUnits: 21, mode: "pushEndDate" });
  });

  it("stepping back to where it started sends nothing; only changed rows are sent", async () => {
    stub();
    const sheet = await openSheet();
    const ti = stepper(sheet, "Treasure Island");
    await userEvent.click(within(ti).getByRole("button", { name: "One less" }));
    await userEvent.click(within(ti).getByRole("button", { name: "One more" }));
    expect(within(sheet).getByRole("button", { name: "Save" })).toBeDisabled();
    await userEvent.click(within(stepper(sheet, "Math 5")).getByRole("button", { name: "One more" }));
    await userEvent.click(within(sheet).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(puts()[0]!.body).toMatchObject({ assignmentId: "math", plannedUnits: 5 });
  });

  it("an adjustment already saved can be taken Back to plan, which sends the DELETE and no PUT", async () => {
    stub([row("o1", "c1")]);
    const sheet = await openSheet();
    await userEvent.click(within(sheet).getByRole("button", { name: "Back to plan for Treasure Island" }));
    expect(within(sheet).getByText("Back to plan")).toBeInTheDocument();
    expect(within(sheet).queryByRole("group", { name: "Amount this week for Treasure Island" })).toBeNull();
    expect(within(sheet).queryByRole("group", { name: "What about the end date?" })).toBeNull();
    await userEvent.click(within(sheet).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(deletes()).toHaveLength(1));
    expect(deletes()[0]!.path).toBe("/api/week-overrides/o1");
    expect(puts()).toEqual([]);
  });

  it("Back to plan can be undone before saving; another child's or a whole-family adjustment offers no Back to plan", async () => {
    stub([row("o1", "c1"), row("o2", "c2", { assignmentId: "math" }), row("o3", null, { assignmentId: "math" })]);
    const sheet = await openSheet();
    await userEvent.click(within(sheet).getByRole("button", { name: "Back to plan for Treasure Island" }));
    await userEvent.click(within(sheet).getByRole("button", { name: "Keep the adjustment for Treasure Island" }));
    expect(within(sheet).getByRole("button", { name: "Save" })).toBeDisabled();
    expect(within(sheet).queryByRole("button", { name: /Back to plan for Math 5/ })).toBeNull();
  });

  it("a refused save shows the message and keeps the sheet open", async () => {
    stub();
    fakeApi.on("PUT /api/week-overrides", 400, { error: "invalid_request", message: "plannedUnits: more than the assignment's total (270)." });
    const sheet = await openSheet();
    await userEvent.click(within(stepper(sheet, "Math 5")).getByRole("button", { name: "One more" }));
    await userEvent.click(within(sheet).getByRole("button", { name: "Save" }));
    expect(await within(sheet).findByRole("alert")).toHaveTextContent("more than the assignment's total (270).");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Save" })).toBeEnabled();
  });
});

describe("This Week adjustment (other weeks)", () => {
  it("a coming week is adjusted as itself", async () => {
    stub();
    const next = plan("ti", "c1", { days: ["2026-11-02", "2026-11-03"].map((date) => ({ date, capacity: 1, schoolDay: true, units: 10, thickness: 10, kind: "planned" as const, position: 10 })) } as Partial<ChildPlan>);
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: "2026-11-02", to: "2026-11-08", plans: [next] });
    const sheet = await openSheet("/?week=2026-11-04");
    expect(sheet).toHaveAccessibleName("Frank · Nov 2–8");
    expect(fakeApi.calls.map((c) => c.path)).toContain("/api/week-overrides?weekStart=2026-11-02");
    expect(fakeApi.calls.map((c) => c.path)).toContain("/api/plan?from=2026-11-02&to=2026-11-08");
    await userEvent.click(within(stepper(sheet, "Treasure Island")).getByRole("button", { name: "One less" }));
    await userEvent.click(within(sheet).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(puts()).toHaveLength(1));
    expect(puts()[0]!.body).toMatchObject({ weekStart: "2026-11-02", plannedUnits: 19 });
  });

  it("a past week still uses the check-in sheet", async () => {
    stub();
    fakeApi.on("GET /api/check-ins/weeks", 200, { weeks: [] });
    fakeApi.on("GET /api/check-ins?weekStart=2026-10-19", 200, {
      weekStart: "2026-10-19", weekEnd: "2026-10-25", status: null, addable: [],
      items: [{ assignmentId: "ti", childId: "c1", childName: "Frank", title: "Treasure Island", unitType: "pages", plannedFrom: 0, plannedTo: 80, totalUnits: 270, actual: null, mode: null }],
    });
    const sheet = await openSheet("/?week=2026-10-19");
    expect(sheet).toHaveAccessibleName("Frank · Last week · Oct 19–25");
    expect(await within(sheet).findByRole("button", { name: "Save" })).toBeEnabled();
    expect(fakeApi.calls.some((c) => c.path.startsWith("/api/week-overrides"))).toBe(false);
  });
});

describe("weekAdjust (pure)", () => {
  const titleOf = (id: string) => id.toUpperCase();
  it("adjustRows sums the week for this child, keeps an adjusted row even at 0, and notes only the child's own adjustment", () => {
    const rows = adjustRows([TI, MATH, VIOLIN, plan("zero", "c1", { days: [] })], "c1", "2026-10-26", "2026-11-01",
      [{ id: "o9", assignmentId: "zero", childId: "c1" }, { id: "o1", assignmentId: "ti", childId: null }], titleOf);
    expect(rows.map((r) => [r.assignmentId, r.planned, r.max, r.overrideId])).toEqual([
      ["math", 4, 110, null], ["ti", 20, 200, null], ["zero", 0, 200, "o9"],
    ]);
  });
  it("only counts days inside the week", () => {
    expect(adjustRows([TI], "c1", "2026-10-27", "2026-11-01", [], titleOf)[0]!.planned).toBe(10);
  });
  it("stepAmount: minutes by 5, others by 1, within 0 and max", () => {
    expect(stepAmount("minutes", 150, 1, 1000)).toBe(155);
    expect(stepAmount("minutes", 152, -1, 1000)).toBe(150);
    expect(stepAmount("pages", 0, -1, 10)).toBe(0);
    expect(stepAmount("pages", 10, 1, 10)).toBe(10);
    expect(stepAmount("lessons", 2.5, 1, 10)).toBe(3);
  });
  it("changesFor: sets for moved amounts, a removal for a row taken back (even if it was moved)", () => {
    const r = (assignmentId: string, planned: number, overrideId: string | null): AdjustRow =>
      ({ assignmentId, title: assignmentId, unitType: "pages", planned, max: 50, overrideId });
    const rows = [r("a", 5, null), r("b", 5, "o1"), r("c", 5, "o2")];
    const out = changesFor(rows, { a: 6, b: 9, c: 5 }, new Set(["b"]));
    expect(out).toEqual([{ kind: "set", row: rows[0], units: 6 }, { kind: "remove", overrideId: "o1" }]);
  });
  it("aheadTitle says This week only for the current week", () => {
    expect(aheadTitle("Frank", "2026-10-26", "2026-11-01", true)).toBe("Frank · This week · Oct 26 – Nov 1");
    expect(aheadTitle("Frank", "2026-11-02", "2026-11-08", false)).toBe("Frank · Nov 2–8");
  });
});
