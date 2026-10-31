/** S7-04: a family's own zoom views and hidden built-ins on the timeline (zoom.ts, ZoomPresets, TimelinePage). */
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import type { ZoomViews } from "../src/api/types";
import { layoutTimeline } from "../src/features/timeline/layout";
import { buildTimelineModel } from "../src/features/timeline/model";
import { customZoom, visibleZooms, zoomLabel, zoomRange } from "../src/features/timeline/zoom";
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
