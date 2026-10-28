import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { ChildPlan, DayLoad } from "@hh/engine";
import type { PlanResponse } from "../src/api/types";
import { buildDebugTables } from "../src/features/plan/debugTable";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const WEEK = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"];
const days = (minutes: number[]): DayLoad[] =>
  WEEK.map((date, i) => ({ date, capacity: 1, schoolDay: i < 5, units: (minutes[i] ?? 0) / 2, minutes: minutes[i] ?? 0, kind: "planned" }));

const plan = (over: Partial<ChildPlan>): ChildPlan => ({
  engineVersion: "0.1.0", assignmentId: "a1", childId: "c1", subjectId: "lit", unitType: "pages",
  minutesPerUnit: 2, minutesPerUnitEstimated: false, totalUnits: 100, doneUnits: 0, remainingUnits: 100,
  baseRate: 22.5, rate: 22.5, plannedEnd: "2026-11-06", end: "2026-11-06", mode: null, unplacedUnits: 0,
  noCapacity: false, complete: false, days: days([]), warnings: [], ...over,
});

const PLANS: ChildPlan[] = [
  // Literature for Frank = two assignments merged into one row: 30.4+14.6 = 45 on Mon, 0 on Tue...
  plan({ assignmentId: "ti", days: days([30.4, 0, 30.4, 30.4, 30.4]) }),
  plan({ assignmentId: "poems", days: days([14.6, 0, 14.6, 14.6, 14.6]) }),
  plan({ assignmentId: "math5", subjectId: "math", unitType: "lessons", minutesPerUnitEstimated: true, days: days([40.4, 40.4, 0, 40.4, 40.4]) }),
  plan({ assignmentId: "math3", childId: "c2", subjectId: "math", days: days([20, 20, 20, 20, 20]), warnings: ["past-end"] }),
];
const RESPONSE: PlanResponse = { engineVersion: "0.1.0", asOf: "2026-10-26", from: WEEK[0]!, to: WEEK[6]!, plans: PLANS };

function setup() {
  fakeApi.on("GET /api/plan", 200, RESPONSE);
  fakeApi.on("GET /api/children", 200, [
    { id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false },
    { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false },
  ]);
  fakeApi.on("GET /api/subjects", 200, [
    { id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false },
    { id: "math", name: "Math", color: null, sortOrder: 1, archived: false },
  ]);
}

const cellsOf = (row: HTMLElement) => within(row).getAllByRole("cell").map((c) => c.textContent);

describe("buildDebugTables", () => {
  it("rounds cells and makes totals the sum of the rounded cells", () => {
    const [frank] = buildDebugTables(PLANS, WEEK, ["c1", "c2"], ["lit", "math"]);
    const math = frank!.rows.find((r) => r.subjectId === "math")!;
    expect(math.cells.map((c) => c.minutes)).toEqual([40, 40, 0, 40, 40, 0, 0]);
    expect(math.total).toBe(160);
    expect(frank!.columnTotals.map((d) => d.value)).toEqual([85, 40, 45, 85, 85, 0, 0]);
    expect(frank!.total).toBe(180 + 160);
  });
});

describe("Plan debug view", () => {
  it("asks /api/plan for the week containing ?week, Monday to Sunday", async () => {
    setup();
    renderAt("/?week=2026-10-28");
    await screen.findByRole("table", { name: "Frank" });
    expect(fakeApi.calls.map((c) => c.path)).toContain("/api/plan?from=2026-10-26&to=2026-11-01");
    expect(screen.getByRole("heading", { name: "Debug view (temporary)" })).toBeInTheDocument();
  });

  it("one table per child; Literature merges both assignments: 45 Mon/Wed/Thu/Fri, 0 Tue; totals add up", async () => {
    setup();
    renderAt("/?week=2026-10-28");
    const frank = await screen.findByRole("table", { name: "Frank" });
    expect(screen.getByRole("table", { name: "Margaret" })).toBeInTheDocument();
    // weekend columns hidden: nothing planned on them and they aren't school days
    expect(within(frank).getAllByRole("columnheader").map((h) => h.textContent))
      .toEqual(["Subject", "Mon10-26", "Tue10-27", "Wed10-28", "Thu10-29", "Fri10-30", "Total"]);
    const lit = within(frank).getByRole("rowheader", { name: "Literature" }).closest("tr")!;
    expect(cellsOf(lit)).toEqual(["45", "0", "45", "45", "45", "180"]);
    const math = within(frank).getByRole("rowheader", { name: "Math" }).closest("tr")!;
    expect(cellsOf(math)).toEqual(["40*", "40*", "0", "40*", "40*", "160"]);
    const total = within(frank).getByRole("rowheader", { name: "Total" }).closest("tr")!;
    expect(cellsOf(total)).toEqual(["85", "40", "45", "85", "85", "340"]);
  });

  it("estimated cells get an asterisk and the footnote", async () => {
    setup();
    renderAt("/?week=2026-10-28");
    const frank = await screen.findByRole("table", { name: "Frank" });
    expect(within(frank).getAllByLabelText("estimated")).toHaveLength(4);
    expect(screen.getByText("* estimated: default minutes per unit")).toBeInTheDocument();
  });

  it("lists plan warnings under the child's table", async () => {
    setup();
    renderAt("/?week=2026-10-28");
    const list = await screen.findByRole("list", { name: "Warnings for Margaret" });
    expect(list).toHaveTextContent("Math: the end date has passed with work left past-end");
    expect(screen.queryByRole("list", { name: "Warnings for Frank" })).not.toBeInTheDocument();
  });

  it("Previous / Next week move by 7 days; 'Plan as of' passes asOf", async () => {
    setup();
    renderAt("/?week=2026-10-28");
    const user = userEvent.setup();
    await screen.findByRole("table", { name: "Frank" });
    await user.click(screen.getByRole("button", { name: /Next week/ }));
    expect(await screen.findByText("Week of 2026-11-02")).toBeInTheDocument();
    expect(fakeApi.calls.map((c) => c.path)).toContain("/api/plan?from=2026-11-02&to=2026-11-08");
    await user.click(screen.getByRole("button", { name: "Prev week" }));
    await user.click(screen.getByRole("button", { name: "Prev week" }));
    expect(await screen.findByText("Week of 2026-10-19")).toBeInTheDocument();
    renderAt("/?week=2026-10-26&asOf=2026-10-19");
    await screen.findAllByRole("table", { name: "Frank" });
    expect(fakeApi.calls.map((c) => c.path)).toContain("/api/plan?from=2026-10-26&to=2026-11-01&asOf=2026-10-19");
  });

  it("error → alert with Retry", async () => {
    setup();
    fakeApi.on("GET /api/plan", 500, { error: "internal_error" });
    renderAt("/?week=2026-10-28");
    expect(await screen.findByRole("alert")).toHaveTextContent("Couldn't load the plan.");
    fakeApi.on("GET /api/plan", 200, RESPONSE);
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("table", { name: "Frank" })).toBeInTheDocument();
  });

  it("no plans → 'Nothing planned this week.'", async () => {
    setup();
    fakeApi.on("GET /api/plan", 200, { ...RESPONSE, plans: [] });
    renderAt("/?week=2026-10-28");
    expect(await screen.findByText("Nothing planned this week.")).toBeInTheDocument();
  });

  it("an active child with nothing planned gets a line; archived children don't", async () => {
    setup();
    fakeApi.on("GET /api/children", 200, [
      { id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false },
      { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false },
      { id: "c3", name: "Ada", color: null, sortOrder: 2, archived: false },
      { id: "c4", name: "Old Kid", color: null, sortOrder: 3, archived: true },
    ]);
    renderAt("/?week=2026-10-28");
    expect(await screen.findByText("Ada: nothing planned this week.")).toBeInTheDocument();
    expect(screen.queryByRole("table", { name: "Ada" })).not.toBeInTheDocument();
    expect(screen.queryByText(/Old Kid/)).not.toBeInTheDocument();
  });
});
