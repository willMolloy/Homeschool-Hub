/** T-04: the static Year timeline (routes/TimelinePage, features/timeline/Timeline, range, useTimelineData). */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import { layoutTimeline } from "../src/features/timeline/layout";
import { buildTimelineModel } from "../src/features/timeline/model";
import { emptyCalendarRange, fetchRange, schoolYearOf, shownRange } from "../src/features/timeline/range";
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
    // Planned days nowhere in range (plans exist, all empty): the whole fetched year, as before.
    const blank = samplePlans().map((p) => ({ ...p, days: p.days.map((d) => ({ ...d, thickness: 0 })) }));
    expect(shownRange(fetched, blank, "2026-10-28", "mon")).toEqual(fetched);
  });

  it("S6b-09: with no plans at all it is today's month through ten months on, week-aligned (not the school year)", () => {
    const fetched = fetchRange("2026-10-28", "mon");
    expect(emptyCalendarRange("2026-10-28", "mon")).toEqual({ from: "2026-09-28", to: "2027-09-05" });
    expect(shownRange(fetched, [], "2026-10-28", "mon")).toEqual({ from: "2026-09-28", to: "2027-09-05" });
    expect(emptyCalendarRange("2026-10-28", "sun")).toEqual({ from: "2026-09-27", to: "2027-09-04" });
    // Across the year end: December through the October after (ten months on), whose last day is a Sunday.
    expect(emptyCalendarRange("2026-12-31", "mon")).toEqual({ from: "2026-11-30", to: "2027-10-31" });
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

  it("marks breaks with a faint plain tint at Year (T-05c), months along the top, and today with the one strong line and pill", async () => {
    stubSample();
    const { svg } = await openTimeline();
    const hatchId = svg.querySelector("pattern")!.id;
    const breaks = svg.querySelectorAll(".tl-breaks rect");
    expect(breaks.length).toBeGreaterThan(0);
    expect(breaks[0]).toHaveClass("tl-break-quiet");
    expect(breaks[0]).not.toHaveAttribute("fill", `url(#${hatchId})`);
    const months = [...svg.querySelectorAll("text.tl-axis-label")].map((t) => t.textContent);
    // T-05c: a phone shows every other month label, so the axis stays calm.
    expect(months).toEqual(["Sep", "Nov", "Jan", "Mar", "May"]);
    const today = svg.querySelector("[data-today]")!;
    expect(today.querySelectorAll("line")).toHaveLength(1);
    expect(today.textContent).toBe("Today");
  });

  it("stays under 300 SVG nodes at Year zoom, at 360 px and with events, which Year hides (T-05c)", async () => {
    stubSample({ events: SAMPLE_EVENTS });
    const { svg } = await openTimeline();
    expect(svg.querySelectorAll("*").length).toBeLessThan(300);
    expect(svg.querySelectorAll("path.tl-event").length).toBe(0);
  });

  it("lists every lane and its assignments for screen readers", async () => {
    stubSample();
    await openTimeline();
    const list = document.querySelector("ul.sr-only")!;
    expect(list.textContent).toContain("Literature, Frank: Aesop's Fables, Aug 31, 2026");
  });

  it("shows only what's essential: the title, the zoom presets, the child chips and the picture, no helper text or badges", async () => {
    stubSample();
    await openTimeline();
    const main = screen.getByRole("main");
    // The visible buttons: add (T-10), the presets and the quiet Edit that ends the row (S7-05), then the child chips (T-07c). (T-07: the lanes list's pick buttons are visually hidden until focused.)
    const visible = within(main).getAllByRole("button").filter((b) => !b.closest(".sr-only"));
    expect(visible.map((b) => b.textContent)).toEqual(["+ Add assignment", "Year", "Fall", "Spring", "This month", "Edit", "All", "Frank", "Margaret"]);
    expect(within(main).getAllByRole("heading").map((h) => h.textContent)).toEqual(["Timeline"]);
    // Below the title: the picture, and the lane list that only screen readers get. Nothing else.
    const bleed = main.querySelector(".timeline-bleed")!;
    expect([...bleed.children].map((e) => `${e.tagName.toLowerCase()}.${e.getAttribute("class")}`)).toEqual(["div.tl-stage", "ul.sr-only tl-lanes-list"]);
    expect(bleed.querySelectorAll("svg")).toHaveLength(1);
  });

  it("S6b-09: with nothing planned it still draws the calendar (months, today) with one quiet line and Add assignment", async () => {
    stubSample({ plans: [], assignments: [] });
    renderAt("/timeline");
    const svg = await screen.findByRole("img", { name: "Year timeline" });
    expect(svg.querySelectorAll("path.tl-band")).toHaveLength(0);
    expect(svg.querySelector("[data-today]")).not.toBeNull();
    const months = [...svg.querySelectorAll("text.tl-axis-label")].map((t) => t.textContent);
    expect(months.length).toBeGreaterThan(2);
    expect(svg.querySelectorAll("text.tl-lane-label")).toHaveLength(0);
    expect(screen.getByText("Nothing planned yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Add assignment" })).toBeInTheDocument();
    // The plan is still fetched for the school year (nothing to fetch for, but the range is one rule).
    expect(plansPath()).toEqual(["/api/plan?from=2026-07-27&to=2027-07-04"]);
  });

  it("S6b-09: the zoom presets work on the empty calendar", async () => {
    stubSample({ plans: [], assignments: [] });
    renderAt("/timeline");
    await screen.findByRole("img", { name: "Year timeline" });
    const user = userEvent.setup();
    expect(screen.getByRole("button", { name: "This month" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "This month" }));
    expect(await screen.findByRole("img", { name: /timeline$/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Next month" })).toBeInTheDocument();
    expect(screen.getByText("Nothing planned yet.")).toBeInTheDocument();
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
