/** T-06: names inside the bars (features/timeline/names.ts, layout.ts names, Timeline.tsx). T-10: labels past short bars. */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { layoutTimeline } from "../src/features/timeline/layout";
import { buildTimelineModel } from "../src/features/timeline/model";
import {
  ELLIPSIS, MIN_NAME_CHARS, NAME_INSET_PX, NAME_PAD_PX, NAME_PATCH_PX, estimateTextWidth, fitName, LATER_PIECE_NAME_FACTOR, placeName, placePieceName, placePieceNames,
  NAME_FONT_PX, OUTSIDE_CLEAR_PX, OUTSIDE_GAP_PX, placeRightName,
} from "../src/features/timeline/names";
import type { BandColumn } from "../src/features/timeline/paths";
import { Timeline } from "../src/features/timeline/Timeline";
import { planAll } from "@hh/engine";
import type { BlockedRange } from "../src/api/types";
import { DEMO_FAMILY } from "../../../db/demo-family";
import { forChild } from "../src/features/timeline/childView";
import { sampleInput } from "./helpers/timeline-fixtures";

/** 1 px per character, so rooms read as character counts. */
const perChar = (t: string) => t.length;
const col = (x0: number, x1: number, h: number, cy = 50): BandColumn => ({ x0, x1, top: cy - h / 2, bottom: cy + h / 2 });
const sample = buildTimelineModel(sampleInput({ events: [] }));
/** S10-04: bars are now scaled to the view, so the sample's lightest work is still fairly thick; for the outside-name
 * tests, make the first lane's assignments very light so they draw near BAR_H_MIN. */
const withThin = {
  ...sample,
  lanes: sample.lanes.map((lane, li) => li !== 0 ? lane : {
    ...lane,
    children: lane.children.map((c) => ({
      ...c,
      assignments: c.assignments.map((a) => ({ ...a, daily: a.daily.map((v) => v * 0.02), weekly: a.weekly.map((v) => v * 0.02) })),
    })),
  }),
};

describe("fitting a name", () => {
  it("keeps the whole title when it fits", () => {
    expect(fitName("Treasure Island", 15, perChar)).toBe("Treasure Island");
  });

  it("otherwise cuts it with an ellipsis, never splitting off a trailing space", () => {
    expect(fitName("Treasure Island", 10, perChar)).toBe(`Treasure${ELLIPSIS}`);
    expect(fitName("Treasure Island", 12, perChar)).toBe(`Treasure Is${ELLIPSIS}`);
  });

  it(`shows nothing unless at least ${MIN_NAME_CHARS} characters and the ellipsis fit`, () => {
    // S10-04b (mockup): a cut name keeps at least six letters.
    expect(MIN_NAME_CHARS).toBe(6);
    expect(fitName("Robinson Crusoe", 7, perChar)).toBe(`Robins${ELLIPSIS}`);
    expect(fitName("Robinson Crusoe", 6, perChar)).toBeNull();
    expect(fitName("Robinson Crusoe", 6, perChar, true)).toBeNull();
    expect(fitName("Robinson Crusoe", 15, perChar, true)).toBe("Robinson Crusoe");
    expect(fitName("   ", 100, perChar)).toBeNull();
  });

  it("the fallback measure over-estimates, so a name never overflows its box", () => {
    expect(estimateTextWidth("Math 5")).toBeGreaterThan(6 * 11 * 0.55);
  });
});

describe("placing a name inside its bar", () => {
  it("pins it to the bar's left edge, its box inside the bar", () => {
    const p = placeName("Math 5", [col(0, 20, 20), col(20, 40, 20)], 50, perChar)!;
    expect(p.text).toBe("Math 5");
    expect(p.x).toBe(NAME_INSET_PX);
    expect(p.textX).toBe(NAME_INSET_PX + NAME_PAD_PX);
    expect(p.width).toBe(6 + 2 * NAME_PAD_PX);
    // The box spans the bar's thickness under it.
    expect([p.y, p.y + p.height]).toEqual([40, 60]);
    expect(p.textY).toBe(50);
  });

  it("never pokes out where the bar thins under the name", () => {
    const p = placeName("Math 5", [col(0, 5, 30), col(5, 40, 16)], 50, perChar)!;
    expect([p.y, p.height]).toEqual([42, 16]);
  });

  it(`skips bars thinner than ${NAME_PATCH_PX} px, and stretches too short for a name`, () => {
    expect(placeName("Math 5", [col(0, 200, NAME_PATCH_PX - 1)], 50, perChar)).toBeNull();
    // Too short at the start, a thin gap, then a long thick stretch: the name goes in the first stretch that holds it.
    const p = placeName("History", [col(0, 8, 20), col(8, 16, 4), col(16, 60, 20)], 50, perChar)!;
    expect(p.x).toBe(16 + NAME_INSET_PX);
    // Columns that don't touch are separate stretches.
    expect(placeName("History", [col(0, 10, 20), null, col(10, 20, 20)], 50, perChar)).toBeNull();
  });
});

describe("naming each piece of a bar (T-11)", () => {
  it("writes a name that doesn't fit inside in full to the right of its piece, centred on the row, when the row is free (S10-04b)", () => {
    const thin = [col(10, 40, 4), col(40, 70, 4)];
    expect([OUTSIDE_GAP_PX, OUTSIDE_CLEAR_PX]).toEqual([6, 4]);
    expect(placeRightName("Treasure Island", thin, 50, 200, perChar)).toEqual({ text: "Treasure Island", x: 76, y: 50 - NAME_FONT_PX / 2, width: 15, height: NAME_FONT_PX, textX: 76, textY: 50 });
    // Exactly enough room (gap + text + clearance), then one pixel short: never cut outside.
    expect(placeRightName("Heidi", thin, 50, 70 + 6 + 5 + 4, perChar)).not.toBeNull();
    expect(placeRightName("Heidi", thin, 50, 70 + 6 + 5 + 3, perChar)).toBeNull();
    // With limits, the thin piece gets an outside name and the thick one stays inside; without, the thin one has none.
    const pieces = [[col(0, 40, 4)], [col(50, 100, 20)]];
    expect(placePieceNames("Heidi", pieces, 50, false, perChar, [60, 300]).map((n) => [n.piece, n.outside])).toEqual([[0, true], [1, false]]);
    expect(placePieceNames("Heidi", pieces, 50, false, perChar).map((n) => n.piece)).toEqual([1]);
    // Zoomed out, the 2× rule still applies to later pieces.
    expect(placePieceNames("Heidi", [[col(0, 40, 4)], [col(50, 58, 4)]], 50, true, perChar, [60, 300]).map((n) => n.piece)).toEqual([0]);
  });

  it(`leaves a piece thinner than ${NAME_PATCH_PX} px unnamed: with no patch, the text would spill onto the page (T-11c)`, () => {
    expect(placePieceName("The Hobbit", [col(0, 30, 6), col(30, 60, 6)], 50, perChar)).toBeNull();
    expect(placePieceName("The Hobbit", [col(0, 200, NAME_PATCH_PX - 1)], 50, perChar)).toBeNull();
    const p = placePieceName("The Hobbit", [col(0, 60, NAME_PATCH_PX)], 50, perChar)!;
    expect([p.x, p.y, p.height, p.textY]).toEqual([NAME_INSET_PX, 50 - NAME_PATCH_PX / 2, NAME_PATCH_PX, 50]);
  });

  it("cuts the name to fit the piece, and gives up below six letters and the ellipsis (S10-04b)", () => {
    const room = (n: number) => n + 2 * NAME_INSET_PX + 2 * NAME_PAD_PX;
    expect(placePieceName("Treasure Island", [col(0, room(9), 20)], 50, perChar)!.text).toBe(`Treasure${ELLIPSIS}`);
    expect(placePieceName("Treasure Island", [col(0, room(7), 20)], 50, perChar)!.text).toBe(`Treasu${ELLIPSIS}`);
    expect(placePieceName("Treasure Island", [col(0, room(6), 20)], 50, perChar)).toBeNull();
  });

  it("names every piece with daily detail; zoomed out, later pieces only when at least 2× their name (T-11b)", () => {
    expect(LATER_PIECE_NAME_FACTOR).toBe(2);
    const pieces = [[col(0, 40, 20)], [col(60, 80, 20)], [col(100, 130, 20)], [col(150, 250, 20)]];
    expect(placePieceNames("Math", pieces, 50, false, perChar).map((n) => n.piece)).toEqual([0, 1, 2, 3]);
    // "Math" is 4 + 2 × pad = 12 px wide: piece 1 (20 px) is under 2×; piece 2 (30 px) is over 2× (under the old 3×).
    expect(placePieceNames("Math", pieces, 50, true, perChar).map((n) => n.piece)).toEqual([0, 2, 3]);
  });
});

describe("names in the layout", () => {

  const views = [["year", 1280], ["fall", 1280], ["spring", 1280], ["month", 1280], ["year", 390], ["month", 390], ["year", 360], ["year", 320]] as const;
  for (const [zoom, width] of views) {
    it(`at ${zoom} / ${width} px every name sits on (or just right of) one piece of its own bar, at most one per piece, never over another`, () => {
      const l = layoutTimeline(sample, { zoom, width, month: "2026-12" });
      const seen = new Set<string>();
      for (const n of l.names) {
        const band = l.bands.find((b) => b.rowKey === n.rowKey && b.assignmentId === n.assignmentId)!;
        const row = l.rows.find((r) => r.key === n.rowKey)!;
        expect(seen.has(`${band.rowKey}|${band.assignmentId}|${n.piece}`)).toBe(false);
        seen.add(`${band.rowKey}|${band.assignmentId}|${n.piece}`);
        const piece = band.runs[n.piece]!;
        if (n.outside) {
          // S10-04b: just right of the piece, centred on the row, clear of every other piece in the row and the plot edge.
          expect(n.x).toBeCloseTo(piece.x1 + OUTSIDE_GAP_PX, 5);
          expect(n.textY).toBeCloseTo(band.cy, 5);
          expect(n.text).toBe(band.title);
          expect(n.x + n.width).toBeLessThanOrEqual(l.plot.x + l.plot.width - OUTSIDE_CLEAR_PX + 0.01);
          for (const other of l.bands.filter((b) => b.rowKey === n.rowKey)) {
            for (const run of other.runs) expect(run.x0 >= n.x + n.width + OUTSIDE_CLEAR_PX - 0.01 || run.x1 <= n.x + 0.01).toBe(true);
          }
        } else {
          // T-11: inside its piece, inside its row.
          expect(n.x).toBeGreaterThanOrEqual(piece.x0 - 0.01);
          expect(n.x + n.width).toBeLessThanOrEqual(piece.x1 + 0.01);
          expect(n.y).toBeGreaterThanOrEqual(row.y - 0.01);
          expect(n.y + n.height).toBeLessThanOrEqual(row.y + row.height + 0.01);
          expect(n.height).toBeGreaterThanOrEqual(NAME_PATCH_PX - 0.01);
          expect(n.y + n.height / 2).toBeCloseTo(band.cy, 5);
        }
        expect(n.text === band.title || (n.text.endsWith(ELLIPSIS) && band.title.startsWith(n.text.slice(0, -1)))).toBe(true);
        expect([n.paletteSlot, n.step]).toEqual([band.paletteSlot, band.step]);
        for (const m of l.names.filter((m) => m.rowKey === n.rowKey && m !== n)) expect(m.x >= n.x + n.width || m.x + m.width <= n.x).toBe(true);
      }
      if (width === 1280) expect(l.names.length).toBeGreaterThan(5);
      // S10-04b: names never need extra space above a row any more.
      for (const r of l.rows) expect(r.labelLane).toBe(0);
    });
  }

  it("gives some thin pieces an outside name to their right (T-11d, S10-04b)", () => {
    const l = layoutTimeline(withThin, { zoom: "year", width: 1280 });
    expect(l.names.some((n) => n.outside)).toBe(true);
  });

  it("with daily detail, the piece right after a break gets its own name", () => {
    const l = layoutTimeline(sample, { zoom: "month", width: 1280, month: "2026-12" });
    const split = l.bands.filter((b) => b.runs.length > 1 && l.rows.find((r) => r.key === b.rowKey)!.height >= NAME_PATCH_PX);
    expect(split.length).toBeGreaterThan(0);
    for (const b of split) {
      const named = l.names.filter((n) => n.rowKey === b.rowKey && n.assignmentId === b.assignmentId).map((n) => n.piece);
      // S19-06: weekends are columns at This month, so the piece after a break is not always index 1. A later piece is still named.
      expect(named.some((i) => i > 0)).toBe(true);
    }
  });

  it("uses the measure it's given (the page passes a cached canvas measure)", () => {
    const wide = layoutTimeline(sample, { zoom: "year", width: 1280, measureText: (t) => t.length * 1000 });
    expect(wide.names).toEqual([]);
  });
});

describe("drawing names", () => {
  it("draws each name straight on its bar, with no patch, in its swatch's AA label colour, hidden from screen readers (T-11c)", () => {
    const layout = layoutTimeline(sample, { zoom: "year", width: 1280 });
    const { container } = render(<Timeline layout={layout} label="Year timeline" />);
    const group = container.querySelector("g.tl-names")!;
    expect(group).toHaveAttribute("aria-hidden", "true");
    const drawn = [...group.querySelectorAll("[data-name-for]")];
    expect(drawn).toHaveLength(layout.names.length);
    expect(container.querySelectorAll("rect.tl-name-patch, .tl-names rect")).toHaveLength(0);
    for (const [i, g] of drawn.entries()) {
      expect(g.children).toHaveLength(1);
      if (layout.names[i]!.outside) {
        // T-11d: page text (its colour comes from .tl-outside-name), not the swatch's label colour.
        const text = g.querySelector("text.tl-outside-name") as SVGTextElement;
        expect(text.style.fill).toBe("");
        continue;
      }
      const text = g.querySelector("text.tl-name") as SVGTextElement;
      expect(text.style.fill).toMatch(/^var\(--tl-subject-\d+(-light|-dark)?-label\)$/);
    }
    expect(container.querySelector("svg")!.querySelectorAll("*").length).toBeLessThan(300);
  });
});

describe("names while another bar is selected (T-11d)", () => {
  it("names stay at full strength while their bar dims: inside ones gain contrast, outside (muted) ones keep AA (S10-04b)", () => {
    const layout = layoutTimeline(withThin, { zoom: "year", width: 1280 });
    const outside = layout.names.find((n) => n.outside)!;
    const other = layout.names.find((n) => n.assignmentId !== outside.assignmentId)!.assignmentId;
    const { container } = render(<Timeline layout={layout} label="Year timeline" selectedId={other} />);
    for (const g of container.querySelectorAll(".tl-names [data-name-for]")) {
      const isOutside = !!g.querySelector("text.tl-outside-name");
      const mine = g.getAttribute("data-name-for") === other;
      expect(g.classList.contains("tl-dim")).toBe(false);
      void isOutside;
      if (mine) expect(g.classList.contains("tl-selected")).toBe(true);
    }
    expect(container.querySelector(`[data-name-for="${outside.assignmentId}"] text.tl-outside-name`)!.parentElement).not.toHaveClass("tl-dim");
  });
});

describe("Black Beauty after Thanksgiving in Frank's Fall view (T-11b)", () => {
  it("runs through the break and is named once at 1280 px (a 912 px plot)", () => {
    const f = DEMO_FAMILY;
    const plans = planAll(f.assignments, { calendar: f.calendar, events: f.events, blocked: f.blocked, overrides: f.overrides,
      checkIns: f.checkIns, subjectWeights: f.subjectWeights, asOf: "2026-10-30" });
    const model = buildTimelineModel(sampleInput({
      today: "2026-10-30", plans,
      assignments: f.assignments.map((a) => ({ id: a.id, subjectId: a.subjectId, title: (a as { title?: string }).title ?? a.id, unitType: a.unitType,
        totalUnits: a.totalUnits, weightPerUnit: a.weightPerUnit ?? null, startDate: a.start, endDate: a.end, childIds: [...a.childIds], archived: false, weekdays: null })),
      subjects: f.subjects.map((s, i) => ({ id: s.key, name: s.name, color: null, sortOrder: i, archived: false, defaultWeight: null, defaultWeekdays: null })),
      blocked: f.blocked.map((b) => ({ id: b.id, label: b.label, kind: (b.kind ?? "vacation") as BlockedRange["kind"], startDate: b.start, endDate: b.end, childIds: [...(b.childIds ?? [])] })),
      events: [],
    }));
    // About what the page's canvas measured for the old 11 px name font (Treasure Island's text is ~79 px there).
    const browserish = (t: string) => t.length * 5.3;
    const l = layoutTimeline(forChild(model, "frank"), { zoom: "fall", width: 912, measureText: browserish });
    const band = l.bands.find((b) => b.assignmentId === "beauty")!;
    // S10-05: the bar runs straight through Thanksgiving under the wash, so it is one piece named in full.
    expect(band.runs).toHaveLength(1);
    const names = l.names.filter((n) => n.assignmentId === "beauty");
    expect(names.map((n) => [n.piece, n.text])).toEqual([[0, "Black Beauty"]]);
  });
});
