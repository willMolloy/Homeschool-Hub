/** S7-04: a family's own zoom views and hidden built-ins on the timeline (zoom.ts, ZoomPresets, TimelinePage). */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, planAll } from "@hh/engine";
import type { ZoomViews } from "../src/api/types";
import { layoutTimeline } from "../src/features/timeline/layout";
import { buildTimelineModel } from "../src/features/timeline/model";
import { customZoom, viewWithoutPlan, visibleZooms, zoomLabel, zoomRange } from "../src/features/timeline/zoom";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_SUBJECTS, sampleInput, samplePlans } from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

const TERM1 = { id: "70000000-0000-4000-8000-000000000001", name: "Term 1", start: "2026-08-17", end: "2026-11-06" };
const TERM2 = { id: "70000000-0000-4000-8000-000000000002", name: "Term 2", start: "2026-11-09", end: "2027-02-05" };
const model = buildTimelineModel(sampleInput({ today: DEMO_ME.today, events: [] }));
const last = model.dates.length - 1;

describe("zoomRange for a family's own view (S7-04)", () => {
  it("runs from its first to its last day", () => {
    const [a, b] = zoomRange(model, customZoom(TERM2.id), null, [TERM2])!;
    expect([model.dates[a], model.dates[b]]).toEqual(["2026-11-09", "2027-02-05"]);
  });

  it("is clamped to the grid (the grid starts on 2026-08-31, the view on 08-17)", () => {
    const [a, b] = zoomRange(model, customZoom(TERM1.id), null, [TERM1])!;
    expect([model.dates[a], model.dates[b]]).toEqual(["2026-08-31", "2026-11-06"]);
    const late = { id: "x", name: "Late", start: "2027-04-01", end: "2027-08-31" };
    const [c, d] = zoomRange(model, customZoom("x"), null, [late])!;
    expect([model.dates[c], d]).toEqual(["2027-04-01", last]);
  });

  it("shows the whole grid when it is entirely outside the grid, or unknown, like Fall and Spring do", () => {
    const before = { id: "b", name: "Before", start: "2025-01-01", end: "2025-06-01" };
    const after = { id: "a", name: "After", start: "2028-01-01", end: "2028-06-01" };
    expect(zoomRange(model, customZoom("b"), null, [before])).toEqual([0, last]);
    expect(zoomRange(model, customZoom("a"), null, [after])).toEqual([0, last]);
    expect(zoomRange(model, customZoom("gone"), null, [TERM1])).toEqual([0, last]);
    expect(zoomRange(model, customZoom(TERM1.id), null)).toEqual([0, last]);
  });

  it("one day is a one-day range, and an empty grid has none", () => {
    const day = { id: "d", name: "Day", start: "2026-10-05", end: "2026-10-05" };
    const [a, b] = zoomRange(model, customZoom("d"), null, [day])!;
    expect(a).toBe(b);
    expect(model.dates[a]).toBe("2026-10-05");
    expect(zoomRange({ dates: [], today: "2026-10-28" }, customZoom("d"), null, [day])).toBeNull();
  });

  it("a layout draws just those days", () => {
    const l = layoutTimeline(model, { zoom: customZoom(TERM1.id), customViews: [TERM1], width: 360 });
    const [a, b] = zoomRange(model, customZoom(TERM1.id), null, [TERM1])!;
    expect([l.plot.first, l.plot.last]).toEqual([a, b]);
  });
});

describe("which views are in the row (S7-04)", () => {
  const views = (over: Partial<ZoomViews> = {}): ZoomViews => ({ hidden: [], custom: [], ...over });
  it("is Year, the built-ins and then the family's views in their order", () => {
    expect(visibleZooms(model, views({ custom: [TERM2, TERM1] }))).toEqual(["year", "fall", "spring", "month", customZoom(TERM2.id), customZoom(TERM1.id)]);
  });
  it("leaves out hidden built-ins, never Year", () => {
    expect(visibleZooms(model, views({ hidden: ["fall"], custom: [TERM1] }))).toEqual(["year", "spring", "month", customZoom(TERM1.id)]);
    expect(visibleZooms(model, views({ hidden: ["fall", "spring", "month"] }))).toEqual(["year"]);
  });
  it("behaves as before with no views stored, and offers only Year without a grid", () => {
    expect(visibleZooms(model)).toEqual(["year", "fall", "spring", "month"]);
    expect(visibleZooms({ dates: [] }, views({ custom: [TERM1] }))).toEqual(["year"]);
  });
  it("labels a view with the family's name", () => {
    expect(zoomLabel(customZoom(TERM1.id), [TERM1])).toBe("Term 1");
    expect(zoomLabel("fall")).toBe("Fall");
  });
});

function stub(zoomViews?: ZoomViews) {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
  fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
  fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
  fakeApi.on("GET /api/assignments", 200, SAMPLE_ASSIGNMENTS);
  fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
  fakeApi.on("GET /api/events", 200, []);
  if (zoomViews) fakeApi.on("GET /api/family", 200, { name: "F", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", weekStartLocked: false, zoomViews });
}
const row = () => within(screen.getByRole("group", { name: "Zoom" })).getAllByRole("button").map((b) => b.textContent);
const todayX = (svg: Element) => Number(svg.querySelector("[data-today] line")!.getAttribute("x1"));

describe("the zoom row on the timeline (S7-04)", () => {
  it("shows Year, Spring, This month, Term 1 with Fall hidden, and Term 1 zooms to its dates", async () => {
    stub({ hidden: ["fall"], custom: [TERM1] });
    renderAt("/timeline");
    await screen.findByRole("img", { name: "Year timeline" });
    expect(row()).toEqual(["Year", "Spring", "This month", "Term 1"]);
    await userEvent.click(within(screen.getByRole("group", { name: "Zoom" })).getByRole("button", { name: "Term 1" }));
    const svg = await screen.findByRole("img", { name: "Term 1 timeline" });
    expect(within(screen.getByRole("group", { name: "Zoom" })).getByRole("button", { name: "Term 1" })).toHaveAttribute("aria-pressed", "true");
    const expected = layoutTimeline(model, { zoom: customZoom(TERM1.id), customViews: [TERM1], width: 360 });
    expect(todayX(svg)).toBeCloseTo(expected.todayX!, 3);
    const months = [...svg.querySelectorAll("text.tl-axis-label")].map((t) => t.textContent);
    expect(months).not.toContain("Jan");
    expect(months).not.toContain("Dec");
  });

  it("shows the family's views in their stored order after the built-ins", async () => {
    stub({ hidden: [], custom: [TERM2, TERM1] });
    renderAt("/timeline");
    await screen.findByRole("img", { name: "Year timeline" });
    expect(row()).toEqual(["Year", "Fall", "Spring", "This month", "Term 2", "Term 1"]);
  });

  it("is the four built-ins for a family that stored nothing", async () => {
    stub({ hidden: [], custom: [] });
    renderAt("/timeline");
    await screen.findByRole("img", { name: "Year timeline" });
    expect(row()).toEqual(["Year", "Fall", "Spring", "This month"]);
  });

  it("still draws the timeline with the built-ins when the family request fails", async () => {
    stub();
    fakeApi.on("GET /api/family", 500, { error: "internal_error", message: "x" });
    renderAt("/timeline");
    await screen.findByRole("img", { name: "Year timeline" });
    expect(row()).toEqual(["Year", "Fall", "Spring", "This month"]);
  });

  it("shows only the plain timeline when every built-in is hidden and there are no views (just Year)", async () => {
    stub({ hidden: ["fall", "spring", "month"], custom: [] });
    renderAt("/timeline");
    await screen.findByRole("img", { name: "Year timeline" });
    expect(screen.queryByRole("group", { name: "Zoom" })).toBeNull();
  });

  it("the row scrolls sideways rather than the page when it doesn't fit", async () => {
    const { readFileSync } = await import("node:fs");
    const css = readFileSync("src/features/timeline/timeline.css", "utf8");
    expect(css).toMatch(/\.tl-zoom \{[^}]*overflow-x: auto/);
    expect(css).toMatch(/\.tl-zoom button \{[^}]*flex: none/);
  });
});

describe("a view with no plan, and an empty month (S7b-07)", () => {
  it("viewWithoutPlan: only a family's view none of whose days is on the grid", () => {
    const far = { id: "f", name: "Far future", start: "2035-01-05", end: "2035-03-01" };
    expect(viewWithoutPlan(model, customZoom("f"), [far])).toEqual(far);
    expect(viewWithoutPlan(model, customZoom(TERM2.id), [TERM2])).toBeNull();
    // Partly on the grid still shows something of its own.
    expect(viewWithoutPlan(model, customZoom("p"), [{ id: "p", name: "P", start: "2027-05-01", end: "2027-08-31" }])).toBeNull();
    expect(viewWithoutPlan(model, "year", [far])).toBeNull();
    expect(viewWithoutPlan(model, customZoom("gone"), [far])).toBeNull();
    expect(viewWithoutPlan({ dates: [] }, customZoom("f"), [far])).toBeNull();
  });

  it("a view outside the plan says 'Nothing planned in {name} yet.' over the grid; one inside doesn't", async () => {
    const far = { id: "70000000-0000-4000-8000-0000000000ff", name: "Far future", start: "2035-01-05", end: "2035-03-01" };
    stub({ hidden: [], custom: [TERM2, far] });
    const user = userEvent.setup();
    renderAt("/timeline");
    await screen.findByRole("img", { name: "Year timeline" });
    expect(screen.queryByText(/^Nothing planned in /)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Far future" }));
    expect(await screen.findByText("Nothing planned in Far future yet.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Term 2" }));
    expect(screen.queryByText(/^Nothing planned in /)).toBeNull();
  });

  it("This month with nothing planned that month says so under the axis", async () => {
    // Today is Oct 28; the only assignment starts Nov 2 (the tester's new family).
    const a = { ...SAMPLE_ASSIGNMENTS[0]!, startDate: "2026-11-02", endDate: "2026-11-27", childIds: [SAMPLE_CHILDREN[0]!.id], weightPerUnit: null };
    const plans = planAll([{ id: a.id, subjectId: a.subjectId, childIds: a.childIds, unitType: a.unitType, totalUnits: a.totalUnits, start: a.startDate, end: a.endDate }],
      { calendar: { weekStart: "mon", schoolDays: [1, 2, 3, 4, 5] }, asOf: DEMO_ME.today });
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans });
    fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
    fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
    fakeApi.on("GET /api/assignments", 200, [a]);
    fakeApi.on("GET /api/blocked-ranges", 200, []);
    fakeApi.on("GET /api/events", 200, []);
    const user = userEvent.setup();
    renderAt("/timeline");
    await screen.findByRole("img", { name: "Year timeline" });
    expect(screen.queryByText("Nothing planned this month.")).toBeNull();
    await user.click(screen.getByRole("button", { name: "This month" }));
    expect(await screen.findByText("Nothing planned this month.")).toBeInTheDocument();
    // Next month has work: the line goes.
    await user.click(screen.getByRole("button", { name: "Next month" }));
    await waitFor(() => expect(screen.queryByText("Nothing planned this month.")).toBeNull());
  });

  it("the Zoom views sheet says Fall and Spring aren't in the dates when the plan doesn't span New Year", async () => {
    const a = { ...SAMPLE_ASSIGNMENTS[0]!, startDate: "2026-11-02", endDate: "2026-11-27", childIds: [SAMPLE_CHILDREN[0]!.id], weightPerUnit: null };
    const plans = planAll([{ id: a.id, subjectId: a.subjectId, childIds: a.childIds, unitType: a.unitType, totalUnits: a.totalUnits, start: a.startDate, end: a.endDate }],
      { calendar: { weekStart: "mon", schoolDays: [1, 2, 3, 4, 5] }, asOf: DEMO_ME.today });
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans });
    fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
    fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
    fakeApi.on("GET /api/assignments", 200, [a]);
    fakeApi.on("GET /api/blocked-ranges", 200, []);
    fakeApi.on("GET /api/events", 200, []);
    const user = userEvent.setup();
    renderAt("/timeline");
    await screen.findByRole("img", { name: "Year timeline" });
    await user.click(screen.getByRole("button", { name: "Edit views" }));
    const form = await screen.findByRole("form", { name: "Zoom views" });
    expect(within(form).getAllByText("Not in this year's dates")).toHaveLength(2);
  });
});

describe("a renamed and re-dated Fall or Spring (S9-06)", () => {
  const OV = { fall: { name: "Term 1", start: "2026-08-17", end: "2026-10-30" } };
  it("zoomRange follows the override's dates, clamped to the grid, and falls back to the whole grid with no overlap", () => {
    const [a, b] = zoomRange(model, "fall", null, [], OV)!;
    expect(model.dates[a]).toBe("2026-08-31");
    expect(model.dates[b]).toBe("2026-10-30");
    expect(zoomRange(model, "fall", null, [], { fall: { name: "X", start: "2030-01-01", end: "2030-02-01" } })).toEqual([0, last]);
    expect(zoomRange(model, "spring", null, [], OV)).toEqual(zoomRange(model, "spring")); // untouched
  });
  it("labels it with the family's name and says when nothing is planned in it", () => {
    expect(zoomLabel("fall", [], OV)).toBe("Term 1");
    expect(zoomLabel("spring", [], OV)).toBe("Spring");
    expect(viewWithoutPlan(model, "fall", [], OV)).toBeNull();
    expect(viewWithoutPlan(model, "fall", [], { fall: { name: "Later", start: "2030-01-01", end: "2030-02-01" } })?.name).toBe("Later");
  });
  it("offers a dated Fall or Spring even on a grid with no New Year in it", () => {
    const short = { dates: model.dates.slice(0, 40), today: model.today };
    expect(visibleZooms(short)).toEqual(["year", "month"]);
    expect(visibleZooms(short, { hidden: [], custom: [], overrides: OV })).toEqual(["year", "fall", "month"]);
  });
  it("the zoom row shows its name, and zooming to it draws just its dates", async () => {
    stub({ hidden: [], custom: [], overrides: OV });
    renderAt("/timeline");
    await screen.findByRole("img", { name: "Year timeline" });
    expect(row()).toEqual(["Year", "Term 1", "Spring", "This month"]);
    await userEvent.click(within(screen.getByRole("group", { name: "Zoom" })).getByRole("button", { name: "Term 1" }));
    const svg = await screen.findByRole("img", { name: "Term 1 timeline" });
    const months = [...svg.querySelectorAll("text.tl-axis-label")].map((t) => t.textContent);
    expect(months).not.toContain("Nov");
  });
});
