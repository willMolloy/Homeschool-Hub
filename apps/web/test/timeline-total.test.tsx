/** T-05b: the "All subjects" bar pinned above the lanes (layout.ts totals, Timeline.tsx). */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { layoutTimeline, TOTALS_HEIGHT_PX, totalsPxPerPoint } from "../src/features/timeline/layout";
import { buildTimelineModel } from "../src/features/timeline/model";
import { Timeline, TOTALS_LABEL } from "../src/features/timeline/Timeline";
import { availableZooms } from "../src/features/timeline/zoom";
import { SAMPLE_EVENTS, sampleInput } from "./helpers/timeline-fixtures";

const model = buildTimelineModel(sampleInput({ events: SAMPLE_EVENTS }));
/** Every y coordinate in a path (after a comma, or a V command). */
const ys = (d: string) => [...d.matchAll(/,(-?[\d.]+)|V(-?[\d.]+)/g)].map((m) => Number(m[1] ?? m[2]));
const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);

describe("sum and normalise", () => {
  it("scales so the family's heaviest point, daily or weekly, is the bar's full height", () => {
    expect(totalsPxPerPoint({ daily: [0, 4, 10, 2], weekly: [0, 5, 5, 5] })).toBe(TOTALS_HEIGHT_PX / 10);
    expect(totalsPxPerPoint({ daily: [0, 4], weekly: [0, 8] }, 30)).toBe(30 / 8);
    expect(totalsPxPerPoint({ daily: [0, 0], weekly: [0, 0] })).toBe(0);
    expect(TOTALS_HEIGHT_PX).toBeGreaterThanOrEqual(28);
    expect(TOTALS_HEIGHT_PX).toBeLessThanOrEqual(36);
  });

  it("is the sum of every lane at each point", () => {
    const subs = model.lanes.flatMap((l) => l.children);
    model.totals.daily.forEach((v, i) => expect(v).toBeCloseTo(sum(subs.map((c) => c.daily[i]!)), 9));
  });

  it("never draws thicker than its height, and reaches it at the peak, on one fixed centerline", () => {
    const peakDaily = Math.max(...model.totals.daily) >= Math.max(...model.totals.weekly);
    for (const zoom of availableZooms(model)) {
      const t = layoutTimeline(model, { zoom, width: 1280 }).totals;
      const y = ys(t.d);
      expect(Math.min(...y)).toBeGreaterThanOrEqual(t.y - 0.05);
      expect(Math.max(...y)).toBeLessThanOrEqual(t.y + t.height + 0.05);
      expect(t.cy).toBe(t.y + t.height / 2);
      if (zoom === "year" && !peakDaily) expect(Math.max(...y) - Math.min(...y)).toBeCloseTo(TOTALS_HEIGHT_PX, 0);
    }
  });
});

describe("pinned above the lanes", () => {
  it.each([360, 1280])("at %i px it sits under the axis and events, above every lane, never overlapping one", (width) => {
    for (const zoom of availableZooms(model)) {
      const l = layoutTimeline(model, { zoom, width });
      expect(l.totals.labelY).toBeGreaterThanOrEqual(Math.max(...l.events.map((e) => e.y + e.height)));
      expect(l.totals.y + l.totals.height).toBeLessThan(l.lanesTop);
      for (const r of l.rows) expect(r.y).toBeGreaterThanOrEqual(l.lanesTop);
      for (const lab of l.labels) expect(lab.y).toBeGreaterThanOrEqual(l.totals.y + l.totals.height);
    }
  });
});

describe("drawing", () => {
  it("renders at every zoom: one grey path labelled All subjects, first, with no other text", () => {
    for (const zoom of availableZooms(model)) {
      const { container, unmount } = render(<Timeline layout={layoutTimeline(model, { zoom, width: 1280 })} label="t" />);
      const totals = container.querySelectorAll("path.tl-totals");
      expect(totals).toHaveLength(1);
      expect(totals[0]!.getAttribute("d")).not.toBe("");
      expect(container.querySelector("text.tl-lane-label")!.textContent).toBe(TOTALS_LABEL);
      expect([...container.querySelectorAll("text")].filter((t) => t.textContent === TOTALS_LABEL)).toHaveLength(1);
      unmount();
    }
  });
});
