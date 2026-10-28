/** T-04: the static Year timeline (routes/TimelinePage, features/timeline/Timeline, range, useTimelineData). */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import { layoutTimeline } from "../src/features/timeline/layout";
import { buildTimelineModel } from "../src/features/timeline/model";
import { fetchRange, schoolYearOf, shownRange } from "../src/features/timeline/range";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import {
  SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_EVENTS, SAMPLE_SUBJECTS, sampleInput, samplePlans,
} from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

const plansPath = () => fakeApi.calls.filter((c) => c.path.startsWith("/api/plan")).map((c) => c.path);

function stubSample(over: { plans?: unknown[]; assignments?: unknown[]; events?: unknown[] } = {}) {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: over.plans ?? samplePlans() });
  fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
  fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
  fakeApi.on("GET /api/assignments", 200, over.assignments ?? SAMPLE_ASSIGNMENTS);
  fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
  fakeApi.on("GET /api/events", 200, over.events ?? []);
}

async function openTimeline() {
  const r = renderAt("/timeline");
  const svg = await screen.findByRole("img", { name: "Year timeline" });
  return { ...r, svg };
}

describe("which days the Year view covers", () => {
  it("is the Aug 1 – Jun 30 school year holding today; July already belongs to the coming year", () => {
    expect(schoolYearOf("2026-10-28")).toEqual({ from: "2026-08-01", to: "2027-06-30" });
    expect(schoolYearOf("2027-03-01")).toEqual({ from: "2026-08-01", to: "2027-06-30" });
    expect(schoolYearOf("2027-06-30")).toEqual({ from: "2026-08-01", to: "2027-06-30" });
    expect(schoolYearOf("2026-07-01")).toEqual({ from: "2026-08-01", to: "2027-06-30" });
  });

  it("fetches whole weeks of it, well inside the API's 400-day cap", () => {
    expect(fetchRange("2026-10-28", "mon")).toEqual({ from: "2026-07-27", to: "2027-07-04" });
    expect(fetchRange("2026-10-28", "sun")).toEqual({ from: "2026-07-26", to: "2027-07-03" });
  });

  it("shows only the planned weeks plus today, so empty summer weeks take no room", () => {
    const fetched = fetchRange("2026-10-28", "mon");
    expect(shownRange(fetched, samplePlans(), "2026-10-28", "mon")).toEqual({ from: "2026-08-31", to: "2027-05-23" });
    // Today before anything starts still shows.
    expect(shownRange(fetched, samplePlans(), "2026-08-05", "mon").from).toBe("2026-08-03");
    // Nothing planned: the whole fetched year.
    expect(shownRange(fetched, [], "2026-10-28", "mon")).toEqual(fetched);
  });
});

describe("the Year timeline page", () => {
  it("is in the main nav and fetches the plan for the school year", async () => {
    stubSample();
    await openTimeline();
    const nav = screen.getByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Timeline" })).toHaveAttribute("aria-current", "page");
    expect(plansPath()).toEqual(["/api/plan?from=2026-07-27&to=2027-07-04"]);
  });

  it("draws one path per band, in its subject's colour step, with a label above each lane", async () => {
    stubSample();
    const { svg } = await openTimeline();
    const expected = layoutTimeline(buildTimelineModel(sampleInput({ today: DEMO_ME.today, events: [] })), { zoom: "year", width: 360 });
    const paths = svg.querySelectorAll("path.tl-band");
    expect(paths.length).toBe(expected.bands.filter((b) => b.d).length);
    expect(paths.length).toBeGreaterThan(10);
    for (const p of paths) expect((p as SVGPathElement).style.fill).toMatch(/^var\(--tl-subject-\d+(-light|-dark)?\)$/);
    const labels = [...svg.querySelectorAll("text.tl-lane-label")].map((t) => t.textContent);
    expect(labels).toEqual(["All subjects", ...expected.labels.map((l) => l.text)]);
    expect(labels).toContain("Literature · Frank");
    expect(svg.querySelector("path.tl-totals")).not.toBeNull();
  });

  it("marks breaks with a hatch, months along the top, and today with the one strong line and pill", async () => {
    stubSample();
    const { svg } = await openTimeline();
    const hatchId = svg.querySelector("pattern")!.id;
    const breaks = svg.querySelectorAll(".tl-breaks rect");
    expect(breaks.length).toBeGreaterThan(0);
    expect(breaks[0]).toHaveAttribute("fill", `url(#${hatchId})`);
    const months = [...svg.querySelectorAll("text.tl-axis-label")].map((t) => t.textContent);
    expect(months).toEqual(expect.arrayContaining(["Sep", "Oct", "Jan", "May"]));
    const today = svg.querySelector("[data-today]")!;
    expect(today.querySelectorAll("line")).toHaveLength(1);
    expect(today.textContent).toBe("Today");
  });

  it("stays under 300 SVG nodes at Year zoom, at 360 px and with events", async () => {
    stubSample({ events: SAMPLE_EVENTS });
    const { svg } = await openTimeline();
    expect(svg.querySelectorAll("*").length).toBeLessThan(300);
    expect(svg.querySelectorAll("path.tl-event").length).toBe(SAMPLE_EVENTS.length);
  });

  it("lists every lane and its assignments for screen readers", async () => {
    stubSample();
    await openTimeline();
    const list = document.querySelector("ul.sr-only")!;
    expect(list.textContent).toContain("Literature, Frank: Aesop's Fables, Aug 31, 2026");
  });

  it("shows only what's essential: the title, the zoom presets and the picture, no helper text or badges", async () => {
    stubSample();
    await openTimeline();
    const main = screen.getByRole("main");
    expect(within(main).getAllByRole("button").map((b) => b.textContent)).toEqual(["Year", "Fall", "Spring"]);
    expect(within(main).getAllByRole("heading").map((h) => h.textContent)).toEqual(["Timeline"]);
    // Below the title: the picture, and the lane list that only screen readers get. Nothing else.
    const bleed = main.querySelector(".timeline-bleed")!;
    expect([...bleed.children].map((e) => `${e.tagName.toLowerCase()}.${e.getAttribute("class")}`)).toEqual(["div.tl-stage", "ul.sr-only"]);
    expect(bleed.querySelectorAll("svg")).toHaveLength(1);
  });

  it("says so when nothing is planned", async () => {
    stubSample({ plans: [], assignments: [] });
    renderAt("/timeline");
    expect(await screen.findByText("Nothing planned yet.")).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: "Year timeline" })).toBeNull();
  });

  it("offers Retry when a fetch fails, and refetches only what failed", async () => {
    stubSample();
    fakeApi.on("GET /api/plan", 500, { error: "boom", message: "boom" });
    renderAt("/timeline");
    const alert = await screen.findByRole("alert");
    stubSample();
    await userEvent.click(within(alert).getByRole("button", { name: "Retry" }));
    await screen.findByRole("img", { name: "Year timeline" });
    await waitFor(() => expect(plansPath()).toHaveLength(2));
    expect(fakeApi.calls.filter((c) => c.path === "/api/children")).toHaveLength(1);
  });
});
