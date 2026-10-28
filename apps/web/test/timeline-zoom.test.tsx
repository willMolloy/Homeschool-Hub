/** T-05/T-05c: zoom presets Year / Fall / Spring / This month with a short crossfade (routes/TimelinePage, useZoomFade, zoom). */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import { layoutTimeline } from "../src/features/timeline/layout";
import { buildTimelineModel } from "../src/features/timeline/model";
import { FADE_MS } from "../src/features/timeline/useZoomFade";
import { availableZooms } from "../src/features/timeline/zoom";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import {
  SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_SUBJECTS, sampleInput, samplePlans,
} from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

function stubSample() {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
  fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
  fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
  fakeApi.on("GET /api/assignments", 200, SAMPLE_ASSIGNMENTS);
  fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
  fakeApi.on("GET /api/events", 200, []);
}

function reducedMotion(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: matches && query.includes("reduce"), media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  }));
}
afterEach(() => vi.unstubAllGlobals());

const model = () => buildTimelineModel(sampleInput({ today: DEMO_ME.today, events: [] }));
const zoomGroup = () => screen.getByRole("group", { name: "Zoom" });
const todayX = (svg: Element) => Number(svg.querySelector("[data-today] line")!.getAttribute("x1"));

async function open() {
  stubSample();
  renderAt("/timeline");
  return screen.findByRole("img", { name: "Year timeline" });
}

describe("which zooms are offered", () => {
  it("offers Year, Fall, Spring and This month when the year spans New Year, and only Year and This month otherwise", () => {
    expect(availableZooms(model())).toEqual(["year", "fall", "spring", "month"]);
    const fallOnly = buildTimelineModel(sampleInput({ from: "2026-08-31", to: "2026-12-20", today: DEMO_ME.today, events: [] }));
    expect(availableZooms(fallOnly)).toEqual(["year", "month"]);
    expect(availableZooms({ dates: [] })).toEqual(["year"]);
  });
});

describe("zoom presets", () => {
  it("starts at Year, with four toggle buttons beside the title", async () => {
    await open();
    const buttons = within(zoomGroup()).getAllByRole("button");
    expect(buttons.map((b) => [b.textContent, b.getAttribute("aria-pressed")])).toEqual([
      ["Year", "true"], ["Fall", "false"], ["Spring", "false"], ["This month", "false"],
    ]);
    expect(zoomGroup().closest("header")!.querySelector("h1")!.textContent).toBe("Timeline");
  });

  it("Fall draws the layout's Fall zoom (smooth: over 8 weeks), with Today at its date", async () => {
    await open();
    await userEvent.click(within(zoomGroup()).getByRole("button", { name: "Fall" }));
    const svg = await screen.findByRole("img", { name: "Fall timeline" });
    const expected = layoutTimeline(model(), { zoom: "fall", width: 360 });
    expect(svg.querySelectorAll("path.tl-band").length).toBe(expected.bands.filter((b) => b.d).length);
    expect(expected.todayX).not.toBeNull();
    expect(todayX(svg)).toBeCloseTo(expected.todayX!, 3);
    expect(within(zoomGroup()).getByRole("button", { name: "Fall" })).toHaveAttribute("aria-pressed", "true");
    const months = [...svg.querySelectorAll("text.tl-axis-label")].map((t) => t.textContent);
    expect(months).not.toContain("Jan");
  });

  it("Spring shows January on, with no Today mark while today is in the fall", async () => {
    await open();
    await userEvent.click(within(zoomGroup()).getByRole("button", { name: "Spring" }));
    const svg = await screen.findByRole("img", { name: "Spring timeline" });
    expect([...svg.querySelectorAll("text.tl-axis-label")].map((t) => t.textContent)).toContain("Jan");
    expect(svg.querySelector("[data-today]")).toBeNull();
  });

  it("keeps Today at the same date going Year → Fall → Year", async () => {
    const year = await open();
    const yearX = todayX(year);
    expect(yearX).toBeCloseTo(layoutTimeline(model(), { zoom: "year", width: 360 }).todayX!, 3);
    await userEvent.click(within(zoomGroup()).getByRole("button", { name: "Fall" }));
    await screen.findByRole("img", { name: "Fall timeline" });
    await userEvent.click(within(zoomGroup()).getByRole("button", { name: "Year" }));
    expect(todayX(await screen.findByRole("img", { name: "Year timeline" }))).toBeCloseTo(yearX, 3);
  });

  it("crossfades: the old zoom fades out over the new one, hidden from assistive tech, then goes", async () => {
    expect(FADE_MS).toBeLessThan(250);
    await open();
    await userEvent.click(within(zoomGroup()).getByRole("button", { name: "Fall" }));
    const leaving = document.querySelector(".tl-leaving")!;
    expect(leaving).toHaveAttribute("aria-hidden", "true");
    expect(document.querySelector(".tl-entering svg")).toHaveAccessibleName("Fall timeline");
    expect(screen.getAllByRole("img")).toHaveLength(1);
    await waitFor(() => expect(document.querySelector(".tl-leaving")).toBeNull());
    expect(document.querySelectorAll(".tl-stage svg")).toHaveLength(1);
  });

  it("changes instantly with reduced motion: no fade", async () => {
    reducedMotion(true);
    await open();
    await userEvent.click(within(zoomGroup()).getByRole("button", { name: "Fall" }));
    await screen.findByRole("img", { name: "Fall timeline" });
    expect(document.querySelector(".tl-leaving")).toBeNull();
    expect(document.querySelector(".tl-entering")).toBeNull();
  });

  it("pressing the current zoom does nothing", async () => {
    await open();
    await userEvent.click(within(zoomGroup()).getByRole("button", { name: "Year" }));
    expect(document.querySelector(".tl-leaving")).toBeNull();
  });

  it("leaves the screen-reader lane list the same at every zoom", async () => {
    await open();
    const before = document.querySelector("ul.sr-only")!.textContent;
    await userEvent.click(within(zoomGroup()).getByRole("button", { name: "Spring" }));
    await screen.findByRole("img", { name: "Spring timeline" });
    expect(document.querySelector("ul.sr-only")!.textContent).toBe(before);
  });
});
