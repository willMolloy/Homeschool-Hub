/** T-06: names inside the bars (features/timeline/names.ts, layout.ts names, Timeline.tsx). */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { layoutTimeline } from "../src/features/timeline/layout";
import { buildTimelineModel } from "../src/features/timeline/model";
import {
  ELLIPSIS, MIN_NAME_CHARS, NAME_INSET_PX, NAME_PAD_PX, NAME_PATCH_PX, estimateTextWidth, fitName, placeName,
} from "../src/features/timeline/names";
import type { BandColumn } from "../src/features/timeline/paths";
import { Timeline } from "../src/features/timeline/Timeline";
import { sampleInput } from "./helpers/timeline-fixtures";

/** 1 px per character, so rooms read as character counts. */
const perChar = (t: string) => t.length;
const col = (x0: number, x1: number, h: number, cy = 50): BandColumn => ({ x0, x1, top: cy - h / 2, bottom: cy + h / 2 });
const sample = buildTimelineModel(sampleInput({ events: [] }));

describe("fitting a name", () => {
  it("keeps the whole title when it fits", () => {
    expect(fitName("Treasure Island", 15, perChar)).toBe("Treasure Island");
  });

  it("otherwise cuts it with an ellipsis, never splitting off a trailing space", () => {
    expect(fitName("Treasure Island", 10, perChar)).toBe(`Treasure${ELLIPSIS}`);
    expect(fitName("Treasure Island", 12, perChar)).toBe(`Treasure Is${ELLIPSIS}`);
  });

  it(`shows nothing unless at least ${MIN_NAME_CHARS} characters and the ellipsis fit`, () => {
    expect(fitName("Robinson Crusoe", MIN_NAME_CHARS + 1, perChar)).toBe(`Robi${ELLIPSIS}`);
    expect(fitName("Robinson Crusoe", MIN_NAME_CHARS, perChar)).toBeNull();
    expect(fitName("   ", 100, perChar)).toBeNull();
  });

  it("the fallback measure over-estimates, so a name never overflows its patch", () => {
    expect(estimateTextWidth("Math 5")).toBeGreaterThan(6 * 11 * 0.55);
  });
});

describe("placing a name inside its bar", () => {
  it("pins it to the bar's left edge, on a patch inside the bar", () => {
    const p = placeName("Math 5", [col(0, 20, 20), col(20, 40, 20)], 50, perChar)!;
    expect(p.text).toBe("Math 5");
    expect(p.x).toBe(NAME_INSET_PX);
    expect(p.textX).toBe(NAME_INSET_PX + NAME_PAD_PX);
    expect(p.width).toBe(6 + 2 * NAME_PAD_PX);
    // The patch fills the bar's thickness under it (so it reads as part of the bar, not a badge).
    expect([p.y, p.y + p.height]).toEqual([40, 60]);
    expect(p.textY).toBe(50);
  });

  it("never pokes out where the bar thins under the patch", () => {
    const p = placeName("Math 5", [col(0, 5, 30), col(5, 40, 16)], 50, perChar)!;
    expect([p.y, p.height]).toEqual([42, 16]);
  });

  it(`skips bars thinner than the ${NAME_PATCH_PX} px patch, and stretches too short for a name`, () => {
    expect(placeName("Math 5", [col(0, 200, NAME_PATCH_PX - 1)], 50, perChar)).toBeNull();
    // Too short at the start, a thin gap, then a long thick stretch: the name goes in the first stretch that holds it.
    const p = placeName("History", [col(0, 8, 20), col(8, 16, 4), col(16, 60, 20)], 50, perChar)!;
    expect(p.x).toBe(16 + NAME_INSET_PX);
    // Columns that don't touch are separate stretches.
    expect(placeName("History", [col(0, 10, 20), null, col(10, 20, 20)], 50, perChar)).toBeNull();
  });
});

describe("names in the layout", () => {
  for (const [zoom, width] of [["year", 1280], ["fall", 1280], ["year", 360]] as const) {
    it(`at ${zoom} / ${width} px every name sits inside its own bar, one at most per bar`, () => {
      const l = layoutTimeline(sample, { zoom, width });
      const seen = new Set<string>();
      for (const n of l.names) {
        const band = l.bands.find((b) => b.rowKey === n.rowKey && b.assignmentId === n.assignmentId)!;
        expect(seen.has(band.assignmentId + band.rowKey)).toBe(false);
        seen.add(band.assignmentId + band.rowKey);
        expect(band.runs.some((r) => n.x >= r.x0 && n.x + n.width <= r.x1 + 0.01)).toBe(true);
        expect(n.height).toBeGreaterThanOrEqual(NAME_PATCH_PX - 0.01);
        expect(n.y + n.height / 2).toBeCloseTo(band.cy, 5);
        expect(n.text === band.title || (n.text.endsWith(ELLIPSIS) && band.title.startsWith(n.text.slice(0, -1)))).toBe(true);
        expect([n.paletteSlot, n.step]).toEqual([band.paletteSlot, band.step]);
      }
      if (width === 1280) expect(l.names.length).toBeGreaterThan(5);
    });
  }

  it("uses the measure it's given (the page passes a cached canvas measure)", () => {
    const wide = layoutTimeline(sample, { zoom: "year", width: 1280, measureText: (t) => t.length * 1000 });
    expect(wide.names).toEqual([]);
  });
});

describe("drawing names", () => {
  it("draws each name on a solid patch of its swatch in that swatch's AA label colour, hidden from screen readers", () => {
    const layout = layoutTimeline(sample, { zoom: "year", width: 1280 });
    const { container } = render(<Timeline layout={layout} label="Year timeline" />);
    const group = container.querySelector("g.tl-names")!;
    expect(group).toHaveAttribute("aria-hidden", "true");
    const drawn = [...group.querySelectorAll("[data-name-for]")];
    expect(drawn).toHaveLength(layout.names.length);
    for (const g of drawn) {
      const patch = g.querySelector("rect.tl-name-patch") as SVGRectElement;
      const text = g.querySelector("text.tl-name") as SVGTextElement;
      expect(patch.style.fill).toMatch(/^var\(--tl-subject-\d+(-light|-dark)?\)$/);
      expect(text.style.fill).toBe(patch.style.fill.replace(")", "-label)"));
    }
    expect(container.querySelector("svg")!.querySelectorAll("*").length).toBeLessThan(300);
  });
});
