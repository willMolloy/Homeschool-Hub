/** S10-02: Year lanes grouped by child, a Together group for shared work, sticky header rows with load ribbons. */
import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { forChild } from "../src/features/timeline/childView";
import {
  SMOOTH_DEADBAND_PX,
  DESKTOP_METRICS, PHONE_METRICS, TOGETHER_KEY, initialOf, layoutTimeline, sharedAssignmentIds, togetherAssignments, togetherInitials,
} from "../src/features/timeline/layout";
import { buildTimelineModel, type SubjectLane, type TimelineAssignment } from "../src/features/timeline/model";
import { Timeline } from "../src/features/timeline/Timeline";
import { sampleInput } from "./helpers/timeline-fixtures";

const family = buildTimelineModel(sampleInput());
const css = readFileSync("src/features/timeline/timeline.css", "utf8");
const ys = (d: string) => [...d.matchAll(/,(-?[\d.]+)|V(-?[\d.]+)/g)].map((m) => Number(m[1] ?? m[2]));

describe("groups", () => {
  it("All children: Together first, then each child in order; shared work is drawn once, in Together, with initials", () => {
    const l = layoutTimeline(family, { zoom: "year", width: 1280 });
    expect(l.groups.map((g) => [g.key, g.name, g.initial])).toEqual([[TOGETHER_KEY, "Together", ""], ["frank", "Frank", "F"], ["margaret", "Margaret", "M"]]);
    const shared = sharedAssignmentIds(family);
    expect(shared.size).toBeGreaterThan(0);
    for (const id of shared) {
      const bands = l.bands.filter((b) => b.assignmentId === id);
      expect(bands).toHaveLength(1);
      expect(bands[0]!.title).toMatch(/ · F M$/);
      expect(l.rows.find((r) => r.key === bands[0]!.rowKey)!.groupKey).toBe(TOGETHER_KEY);
    }
    // Each child's group holds only their own work.
    for (const r of l.rows.filter((x) => x.groupKey !== TOGETHER_KEY)) expect(r.childId).toBe(r.groupKey);
  });

  it("one child shown: no Together group, and the shared work sits in that child's lanes", () => {
    const m = forChild(family, "frank");
    const l = layoutTimeline(m, { zoom: "year", width: 360 });
    expect(l.groups.map((g) => g.key)).toEqual(["frank"]);
    for (const id of sharedAssignmentIds(family)) expect(l.bands.filter((b) => b.assignmentId === id).every((b) => !b.title.includes(" · "))).toBe(true);
    expect(l.bands.some((b) => sharedAssignmentIds(family).has(b.assignmentId))).toBe(true);
  });

  it("groups stack top to bottom with the group gap between them, a group rule in the middle of each gap, lane rules from the gutter", () => {
    for (const [width, m] of [[360, PHONE_METRICS], [1280, DESKTOP_METRICS]] as const) {
      const l = layoutTimeline(family, { zoom: "year", width });
      for (let i = 1; i < l.groups.length; i++) {
        expect(l.groups[i]!.top - l.groups[i - 1]!.bottom).toBe(m.groupGap);
        expect(l.rules.filter((r) => r.kind === "group").map((r) => r.y)).toContain(l.groups[i]!.top - m.groupGap / 2);
      }
      for (const r of l.rules.filter((x) => x.kind === "lane")) expect(r.x0).toBe(m.gutter);
      for (const g of l.groups) expect(g.header.height).toBe(m.header);
      expect(l.lanesBottom).toBe(l.groups.at(-1)!.bottom);
    }
  });
});

describe("load ribbons", () => {
  it("each child's header carries a ribbon of their whole load (shared work included), all on one scale; Together has none", () => {
    const l = layoutTimeline(family, { zoom: "year", width: 1280 });
    const together = l.groups.find((g) => g.key === TOGETHER_KEY)!;
    expect(together.header.ribbon).toBe("");
    const spans = l.groups.filter((g) => g.kind === "child").map((g) => { const v = ys(g.header.ribbon); return [Math.min(...v), Math.max(...v)] as const; });
    // Centred in the header row, and the busiest child reaches the full ribbon height (S10-04: within the smooth
    // look's dead band, never above it).
    for (const [lo, hi] of spans) expect((lo + hi) / 2).toBeCloseTo(DESKTOP_METRICS.header / 2, 0);
    const busiest = Math.max(...spans.map(([lo, hi]) => hi - lo));
    expect(busiest).toBeLessThanOrEqual(DESKTOP_METRICS.ribbonMax + 1e-6);
    expect(busiest).toBeGreaterThan(DESKTOP_METRICS.ribbonMax - SMOOTH_DEADBAND_PX);
  });
});

describe("Together bars", () => {
  const a = (childId: string, daily: number[], first: number, last: number): TimelineAssignment => ({
    assignmentId: "spine", childId, title: "History spine", daily, weekly: daily, first, last, end: "2026-09-10", plannedEnd: "2026-09-10",
    estimated: false, complete: false, warnings: [],
  });
  const lane = (kids: string[], dailies: number[][]): SubjectLane => ({
    subjectId: "hist", name: "History", paletteSlot: 3,
    children: kids.map((k, i) => ({ key: `hist:${k}`, subjectId: "hist", childId: k, childName: k, step: "base", assignments: [a(k, dailies[i]!, 0, 2)], daily: [], weekly: [] })),
  });

  it("takes the larger of the children's plans on each day, and names them by initial", () => {
    const out = togetherAssignments(lane(["f", "m"], [[1, 0, 3], [2, 2, 0]]), new Set(["spine"]), new Map([["f", "F"], ["m", "M"]]));
    expect(out).toHaveLength(1);
    expect(out[0]!.daily).toEqual([2, 2, 3]);
    expect(out[0]!.title).toBe("History spine · F M");
  });

  it("names four children, then +N", () => {
    expect(togetherInitials(["A", "B"])).toBe("A B");
    expect(togetherInitials(["A", "B", "C", "D"])).toBe("A B C D");
    expect(togetherInitials(["A", "B", "C", "D", "E", "F"])).toBe("A B C D +2");
    expect(initialOf(" margaret")).toBe("M");
  });
});

describe("drawing", () => {
  it("draws a header per group (initial, name, ribbon) that sticks to the top while its lanes scroll", () => {
    const layout = layoutTimeline(family, { zoom: "year", width: 360 });
    const { container } = render(<Timeline layout={layout} label="t" subjects={[]} />);
    const groups = [...container.querySelectorAll(".tl-group")];
    expect(groups.map((g) => g.getAttribute("data-group"))).toEqual(["together", "frank", "margaret"]);
    expect(groups.map((g) => g.querySelector(".tl-group-name")!.textContent)).toEqual(["Together", "Frank", "Margaret"]);
    expect(groups[1]!.querySelector(".tl-group-avatar")!.textContent).toBe("F");
    expect(groups[1]!.querySelector(".tl-ribbon path")).not.toBeNull();
    expect(groups[0]!.querySelector(".tl-ribbon path")).toBeNull();
    expect(container.querySelectorAll("line.tl-rule-group")).toHaveLength(2);
    expect(css).toMatch(/\.tl-group-head \{[^}]*position: sticky;/);
    expect(css).toMatch(/\.tl-group \{[^}]*pointer-events: none;/);
  });
});
