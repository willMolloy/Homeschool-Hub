import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ENGINE_VERSION, type ChildPlan, type DayLoad } from "@hh/engine";
import type { PlanResponse } from "../src/api/types";
import { buildDebugTables } from "../src/features/plan/debugTable";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const WEEK = ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"];
/** Day series from thickness per day; units = thickness / weight. */
const days = (thickness: number[], weight = 1): DayLoad[] => {
  let position = 0;
  return WEEK.map((date, i) => {
    const t = thickness[i] ?? 0;
    position += t / weight;
    return { date, capacity: 1, schoolDay: i < 5, units: t / weight, thickness: t, kind: "planned", position };
  });
};

const plan = (over: Partial<ChildPlan>): ChildPlan => ({
  engineVersion: ENGINE_VERSION, assignmentId: "a1", childId: "c1", subjectId: "lit", unitType: "pages",
  weightPerUnit: 1, weightSource: "assignment", totalUnits: 100, doneUnits: 0, remainingUnits: 100,
  baseRate: 22.5, rate: 22.5, plannedEnd: "2026-11-06", end: "2026-11-06", mode: null, unplacedUnits: 0,
  noCapacity: false, complete: false, checkInWeeks: [], days: days([]), warnings: [], ...over,
});

const PLANS: ChildPlan[] = [
  // Literature for Frank = two assignments merged into one row: 15.24 + 7.33 = 22.57 → 22.6 on Mon, 0 on Tue...
  plan({ assignmentId: "ti", days: days([15.24, 0, 15.24, 15.24, 15.24]) }),
  plan({ assignmentId: "poems", days: days([7.33, 0, 7.33, 7.33, 7.33]) }),
  // Math for Frank: lessons at the built-in 15.
  plan({ assignmentId: "math5", subjectId: "math", unitType: "lessons", weightPerUnit: 15, weightSource: "default", days: days([15, 15, 0, 15, 15], 15) }),
  // Math for Margaret mixes a pages book (its own weight) with practice minutes at the subject default.
  plan({ assignmentId: "math3", childId: "c2", subjectId: "math", days: days([20, 20, 20, 20, 20]), warnings: ["past-end"] }),
  plan({ assignmentId: "drill", childId: "c2", subjectId: "math", unitType: "minutes", weightPerUnit: 0.5, weightSource: "subject", days: days([0, 15, 0, 15, 0], 0.5) }),
];
const RESPONSE: PlanResponse = { engineVersion: ENGINE_VERSION, asOf: "2026-10-26", from: WEEK[0]!, to: WEEK[6]!, plans: PLANS };

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
const rowOf = (table: HTMLElement, name: string) => within(table).getByRole("rowheader", { name }).closest("tr")!;

describe("buildDebugTables", () => {
  const [frank, margaret] = buildDebugTables(PLANS, WEEK, ["c1", "c2"], ["lit", "math"]);

  it("cells are thickness rounded to 1 decimal; totals are the sum of the rounded cells", () => {
    const lit = frank!.rows.find((r) => r.subjectId === "lit")!;
    expect(lit.cells.map((c) => c.value)).toEqual([22.6, 0, 22.6, 22.6, 22.6, 0, 0]);
    expect(lit.total).toBe(90.4);
    expect(frank!.columnTotals.map((d) => d.value)).toEqual([37.6, 15, 22.6, 37.6, 37.6, 0, 0]);
    expect(frank!.total).toBe(150.4);
  });

  it("marks cells by the source of their weight; empty cells and own weights have no marker", () => {
    const lit = frank!.rows.find((r) => r.subjectId === "lit")!;
    const math = frank!.rows.find((r) => r.subjectId === "math")!;
    expect(lit.cells.every((c) => c.defaults.length === 0)).toBe(true);
    expect(math.cells.map((c) => c.defaults)).toEqual([["default"], ["default"], [], ["default"], ["default"], [], []]);
  });

  it("a mixed minutes and pages lane sums thickness and marks only the days the default contributes", () => {
    const math = margaret!.rows[0]!;
    expect(math.cells.map((c) => c.value)).toEqual([20, 35, 20, 35, 20, 0, 0]);
    expect(math.cells.map((c) => c.defaults)).toEqual([[], ["subject"], [], ["subject"], [], [], []]);
    expect(math.total).toBe(130);
  });

  it("lists built-in before subject when one cell uses both", () => {
    const both = buildDebugTables([
      plan({ assignmentId: "x", weightSource: "subject", days: days([2]) }),
      plan({ assignmentId: "y", weightSource: "default", days: days([1]) }),
    ], WEEK);
    expect(both[0]!.rows[0]!.cells[0]!.defaults).toEqual(["default", "subject"]);
  });

  it("sums of 1-decimal cells stay at 1 decimal", () => {
    const [t] = buildDebugTables([plan({ days: days([0.1, 0.2, 0.04]) })], WEEK);
    expect(t!.rows[0]!.cells.slice(0, 3).map((c) => c.value)).toEqual([0.1, 0.2, 0]);
    expect(t!.rows[0]!.total).toBe(0.3);
  });
});

describe("Plan debug view", () => {
  it("asks /api/plan for the week containing ?week, Monday to Sunday", async () => {
    setup();
    renderAt("/?week=2026-10-28");
    await screen.findByRole("table", { name: "Frank" });
    expect(fakeApi.calls.map((c) => c.path)).toContain("/api/plan?from=2026-10-26&to=2026-11-01");
    expect(screen.getByRole("heading", { name: "Debug view (temporary)" })).toBeInTheDocument();
    expect(screen.getByText(/Effort \(units × weight\) per day/)).toBeInTheDocument();
  });

  it("one table per child; Literature merges both assignments: 22.6 Mon/Wed/Thu/Fri, 0 Tue; totals add up", async () => {
    setup();
    renderAt("/?week=2026-10-28");
    const frank = await screen.findByRole("table", { name: "Frank" });
    expect(screen.getByRole("table", { name: "Margaret" })).toBeInTheDocument();
    // weekend columns hidden: nothing planned on them and they aren't school days
    expect(within(frank).getAllByRole("columnheader").map((h) => h.textContent))
      .toEqual(["Subject", "Mon10-26", "Tue10-27", "Wed10-28", "Thu10-29", "Fri10-30", "Total"]);
    expect(cellsOf(rowOf(frank, "Literature"))).toEqual(["22.6", "0", "22.6", "22.6", "22.6", "90.4"]);
    expect(cellsOf(rowOf(frank, "Math"))).toEqual(["15~", "15~", "0", "15~", "15~", "60"]);
    expect(cellsOf(rowOf(frank, "Total"))).toEqual(["37.6", "15", "22.6", "37.6", "37.6", "150.4"]);
  });

  it("the mixed lane shows the subject-default marker only where the default adds work", async () => {
    setup();
    renderAt("/?week=2026-10-28");
    const margaret = await screen.findByRole("table", { name: "Margaret" });
    expect(cellsOf(rowOf(margaret, "Math"))).toEqual(["20", "35s", "20", "35s", "20", "130"]);
    expect(within(margaret).getAllByLabelText("subject default weight")).toHaveLength(2);
  });

  it("default cells get a labelled marker and the legend names each marker used", async () => {
    setup();
    renderAt("/?week=2026-10-28");
    const frank = await screen.findByRole("table", { name: "Frank" });
    expect(within(frank).getAllByLabelText("built-in weight")).toHaveLength(4);
    const legend = screen.getByRole("list", { name: "Markers" });
    expect(within(legend).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "~ uses the built-in weight for its unit",
      "s uses the subject's default weight",
    ]);
  });

  it("no defaults in the week → no legend", async () => {
    setup();
    fakeApi.on("GET /api/plan", 200, { ...RESPONSE, plans: PLANS.filter((p) => p.weightSource === "assignment") });
    renderAt("/?week=2026-10-28");
    await screen.findByRole("table", { name: "Frank" });
    expect(screen.queryByRole("list", { name: "Markers" })).not.toBeInTheDocument();
  });

  it("lists plan warnings under the child's table", async () => {
    setup();
    renderAt("/?week=2026-10-28");
    const list = await screen.findByRole("list", { name: "Warnings for Margaret" });
    expect(list).toHaveTextContent("Math: the end date has passed with work left past-end");
    expect(screen.queryByRole("list", { name: "Warnings for Frank" })).not.toBeInTheDocument();
  });

  describe("default week (no ?week)", () => {
    afterEach(() => vi.useRealTimers());

    it("follows the family's today from /api/me, not the device date", async () => {
      // Device thinks it is mid-December; the family's zone says Wednesday 2026-11-04.
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-12-16T12:00:00"));
      setup();
      fakeApi.on("GET /api/me", 200, { ...DEMO_ME, today: "2026-11-04" });
      renderAt("/");
      await screen.findByRole("table", { name: "Frank" });
      expect(screen.getByText("Week of 2026-11-02")).toBeInTheDocument();
      expect(fakeApi.calls.map((c) => c.path)).toContain("/api/plan?from=2026-11-02&to=2026-11-08");
      expect(fakeApi.calls.some((c) => c.path.includes("2026-12-14"))).toBe(false);
    });

    it("a family a day ahead of the device (Sunday device, Monday family) opens on the family's week", async () => {
      vi.useFakeTimers({ toFake: ["Date"] });
      vi.setSystemTime(new Date("2026-11-01T20:00:00"));
      setup();
      fakeApi.on("GET /api/me", 200, { ...DEMO_ME, today: "2026-11-02" });
      renderAt("/");
      await screen.findByRole("table", { name: "Frank" });
      expect(fakeApi.calls.map((c) => c.path)).toContain("/api/plan?from=2026-11-02&to=2026-11-08");
    });
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
