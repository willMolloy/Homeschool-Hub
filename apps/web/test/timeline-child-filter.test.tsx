/** T-07c: the child filter (childFilter.ts, ChildFilter, `?child=` on the page). */
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import type { Child } from "../src/api/types";
import { filterChildren, forChild, shownChild } from "../src/features/timeline/childView";
import { layoutTimeline, TOTALS_HEIGHT_PX, totalsPxPerPoint } from "../src/features/timeline/layout";
import { buildTimelineModel } from "../src/features/timeline/model";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import {
  SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_EVENTS, SAMPLE_SUBJECTS, sampleInput, samplePlans,
} from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const childOf = (id: string) => new Set(SAMPLE_ASSIGNMENTS.filter((a) => a.childIds.includes(id)).map((a) => a.id));

describe("forChild", () => {
  const family = buildTimelineModel(sampleInput());

  it("is the family model unchanged for All", () => {
    expect(forChild(family, null)).toBe(family);
  });

  it("keeps only that child's sub-lanes, breaks and events, and recomputes the totals from them", () => {
    const m = forChild(family, "margaret");
    const subs = m.lanes.flatMap((l) => l.children);
    expect(subs.length).toBeGreaterThan(0);
    expect(subs.every((c) => c.childId === "margaret")).toBe(true);
    expect(m.lanes.every((l) => l.children.length > 0)).toBe(true);
    expect(m.events.every((e) => e.childIds.length === 0 || e.childIds.includes("margaret"))).toBe(true);
    expect(m.events.some((e) => e.childIds.includes("frank") && !e.childIds.includes("margaret"))).toBe(false);
    m.totals.daily.forEach((v, i) => expect(v).toBeCloseTo(sum(subs.map((c) => c.daily[i]!)), 9));
    m.totals.weekly.forEach((v, i) => expect(v).toBeCloseTo(sum(subs.map((c) => c.weekly[i]!)), 9));
    expect(sum(m.totals.daily)).toBeLessThan(sum(family.totals.daily));
    // Palette slots and the grid stay put, so colours don't shift between views.
    for (const l of m.lanes) expect(l.paletteSlot).toBe(family.lanes.find((f) => f.subjectId === l.subjectId)!.paletteSlot);
    expect(m.dates).toBe(family.dates);
  });

  it("normalizes the All subjects bar to the shown child's heaviest point", () => {
    const m = forChild(family, "margaret");
    const peak = Math.max(...m.totals.daily, ...m.totals.weekly);
    const familyPeak = Math.max(...family.totals.daily, ...family.totals.weekly);
    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThan(familyPeak);
    expect(totalsPxPerPoint(m.totals)).toBeCloseTo(TOTALS_HEIGHT_PX / peak, 9);
    expect(layoutTimeline(m, { zoom: "year", width: 1280 }).totals.height).toBe(TOTALS_HEIGHT_PX);
  });

  it("only offers children on the timeline, and only accepts one of them from the URL", () => {
    const extra: Child[] = [...SAMPLE_CHILDREN, { id: "ruth", name: "Ruth", color: null, sortOrder: 2, archived: false },
      { id: "old", name: "Old", color: null, sortOrder: 3, archived: true }];
    expect(filterChildren(extra, family).map((c) => c.id)).toEqual(["frank", "margaret"]);
    expect(shownChild("frank", SAMPLE_CHILDREN)).toBe("frank");
    expect(shownChild("ruth", SAMPLE_CHILDREN)).toBeNull();
    expect(shownChild(null, SAMPLE_CHILDREN)).toBeNull();
    expect(shownChild("frank", SAMPLE_CHILDREN.slice(0, 1))).toBeNull();
  });
});

function stub(children: Child[] = SAMPLE_CHILDREN) {
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
  fakeApi.on("GET /api/children", 200, children);
  fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
  fakeApi.on("GET /api/assignments", 200, SAMPLE_ASSIGNMENTS);
  fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
  fakeApi.on("GET /api/events", 200, SAMPLE_EVENTS);
}

const bandIds = (svg: Element) => [...svg.querySelectorAll("path.tl-band")].map((b) => b.getAttribute("data-assignment")!);
const totalsD = (svg: Element) => svg.querySelector("path.tl-totals")?.getAttribute("d");

describe("the child filter on the page", () => {
  it("shows All, then each child, with All chosen and nothing else in the row", async () => {
    stub();
    renderAt("/timeline");
    await screen.findByRole("img", { name: "Year timeline" });
    const group = screen.getByRole("group", { name: "Child" });
    const chips = within(group).getAllByRole("button");
    expect(chips.map((b) => b.textContent)).toEqual(["All", "Frank", "Margaret"]);
    expect(chips.map((b) => b.getAttribute("aria-pressed"))).toEqual(["true", "false", "false"]);
    expect(group.textContent).toBe("AllFrankMargaret");
  });

  it("narrows to one child, recomputes the All subjects bar and remembers the choice in ?child=", async () => {
    stub();
    const { router } = renderAt("/timeline");
    const svg = await screen.findByRole("img", { name: "Year timeline" });
    const before = totalsD(svg);
    await userEvent.click(within(screen.getByRole("group", { name: "Child" })).getByRole("button", { name: "Frank" }));
    const shown = screen.getByRole("img", { name: "Year timeline" });
    const frank = childOf("frank");
    expect(bandIds(shown).length).toBeGreaterThan(0);
    expect(bandIds(shown).every((id) => frank.has(id))).toBe(true);
    expect(totalsD(shown)).not.toBe(before);
    expect(router.state.location.search).toBe("?child=frank");
    expect(screen.getByRole("button", { name: "Frank" })).toHaveAttribute("aria-pressed", "true");
    await userEvent.click(screen.getByRole("button", { name: "All" }));
    expect(router.state.location.search).toBe("");
    expect(totalsD(screen.getByRole("img", { name: "Year timeline" }))).toBe(before);
  });

  it("opens on the child named in the URL (survives a reload), and on All for an unknown one", async () => {
    stub();
    renderAt("/timeline?child=margaret");
    const svg = await screen.findByRole("img", { name: "Year timeline" });
    const margaret = childOf("margaret");
    expect(bandIds(svg).every((id) => margaret.has(id))).toBe(true);
    expect(screen.getByRole("button", { name: "Margaret" })).toHaveAttribute("aria-pressed", "true");
  });

  it("falls back to All for a child the family doesn't have", async () => {
    stub();
    renderAt("/timeline?child=nobody");
    await screen.findByRole("img", { name: "Year timeline" });
    expect(screen.getByRole("button", { name: "All" })).toHaveAttribute("aria-pressed", "true");
  });

  it("hides the row entirely when the family has one child", async () => {
    stub(SAMPLE_CHILDREN.slice(0, 1));
    renderAt("/timeline");
    await screen.findByRole("img", { name: "Year timeline" });
    expect(screen.queryByRole("group", { name: "Child" })).toBeNull();
    expect(screen.queryByRole("button", { name: "All" })).toBeNull();
  });
});
