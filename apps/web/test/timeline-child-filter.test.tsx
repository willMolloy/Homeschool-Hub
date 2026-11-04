/** T-07c: the child filter (childFilter.ts, ChildFilter, `?child=` on the page). */
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import type { Child } from "../src/api/types";
import { filterChildren, forChild, shownChild } from "../src/features/timeline/childView";
import { layoutTimeline } from "../src/features/timeline/layout";
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

  it("S10-02: shows only the shown child's group, with no Together group, and scales its ribbon to that child alone", () => {
    const m = forChild(family, "margaret");
    expect(m.children.map((c) => c.childId)).toEqual(["margaret"]);
    const l = layoutTimeline(m, { zoom: "year", width: 1280 });
    expect(l.groups.map((g) => g.key)).toEqual(["margaret"]);
    const ribbonYs = (d: string) => [...d.matchAll(/,(-?[\d.]+)|V(-?[\d.]+)/g)].map((x) => Number(x[1] ?? x[2]));
    const ys = ribbonYs(l.groups[0]!.header.ribbon);
    // Her own heaviest point reaches the full ribbon height (14 px on desktop), centred in the header row.
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(l.metrics.ribbonMax, 5);
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
const groupKeys = () => [...document.querySelectorAll(".tl-group")].map((g) => g.getAttribute("data-group"));

describe("the child switch on the Year page (S8b-07: the one shared with Week and Track work)", () => {
  beforeEach(() => localStorage.clear());

  it("shows All children first, then each child, with All children chosen and nothing else in the row", async () => {
    stub();
    renderAt("/timeline");
    await screen.findByRole("img", { name: "Year timeline" });
    const group = screen.getByRole("group", { name: "Child" });
    const chips = within(group).getAllByRole("button");
    expect(chips.map((b) => b.textContent)).toEqual(["All children", "Frank", "Margaret"]);
    expect(chips.map((b) => b.getAttribute("aria-pressed"))).toEqual(["true", "false", "false"]);
  });

  it("narrows to one child, shows only that child's group (S10-02) and remembers the choice on the device", async () => {
    stub();
    const first = renderAt("/timeline");
    const svg = await screen.findByRole("img", { name: "Year timeline" });
    expect(svg).toBeTruthy();
    const before = groupKeys();
    expect(before).toEqual(["together", "frank", "margaret"]);
    await userEvent.click(within(screen.getByRole("group", { name: "Child" })).getByRole("button", { name: "Frank" }));
    const shown = screen.getByRole("img", { name: "Year timeline" });
    const frank = childOf("frank");
    expect(bandIds(shown).length).toBeGreaterThan(0);
    expect(bandIds(shown).every((id) => frank.has(id))).toBe(true);
    expect(groupKeys()).toEqual(["frank"]);
    expect(localStorage.getItem("hh.child")).toBe("frank");
    expect(screen.getByRole("button", { name: "Frank" })).toHaveAttribute("aria-pressed", "true");
    first.unmount();
    renderAt("/timeline");
    const again = await screen.findByRole("img", { name: "Year timeline" });
    expect(bandIds(again).every((id) => frank.has(id))).toBe(true);
    await userEvent.click(screen.getByRole("button", { name: "All children" }));
    expect(screen.getByRole("img", { name: "Year timeline" })).toBeTruthy();
    expect(groupKeys()).toEqual(before);
  });

  it("shares the choice with Week: what was picked there is what Year shows", async () => {
    stub();
    localStorage.setItem("hh.child", "margaret");
    renderAt("/timeline");
    const svg = await screen.findByRole("img", { name: "Year timeline" });
    expect(bandIds(svg).every((id) => childOf("margaret").has(id))).toBe(true);
    expect(screen.getByRole("button", { name: "Margaret" })).toHaveAttribute("aria-pressed", "true");
  });

  it("falls back to All children for a saved child the family doesn't have, and understands the old saved 'both'", async () => {
    stub();
    localStorage.setItem("hh.child", "nobody");
    const first = renderAt("/timeline");
    await screen.findByRole("img", { name: "Year timeline" });
    expect(screen.getByRole("button", { name: "All children" })).toHaveAttribute("aria-pressed", "true");
    first.unmount();
    localStorage.setItem("hh.child", "both");
    renderAt("/timeline");
    await screen.findByRole("img", { name: "Year timeline" });
    expect(screen.getByRole("button", { name: "All children" })).toHaveAttribute("aria-pressed", "true");
  });

  it("hides the switch entirely when the family has one child", async () => {
    stub(SAMPLE_CHILDREN.slice(0, 1));
    renderAt("/timeline");
    await screen.findByRole("img", { name: "Year timeline" });
    expect(screen.queryByRole("group", { name: "Child" })).toBeNull();
    expect(screen.queryByRole("button", { name: "All children" })).toBeNull();
  });
});
