/** T-06: names inside the bars (features/timeline/names.ts, layout.ts names, Timeline.tsx). T-10: labels past short bars. */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { layoutTimeline } from "../src/features/timeline/layout";
import { buildTimelineModel } from "../src/features/timeline/model";
import {
  ELLIPSIS, MIN_NAME_CHARS, NAME_INSET_PX, NAME_PAD_PX, NAME_PATCH_PX, estimateTextWidth, fitName, LATER_PIECE_NAME_FACTOR, placeName, placePieceName, placePieceNames,
  DESCENDER_PX, OUTSIDE_GAP_PX, OUTSIDE_NAME_PX, placeOutsideName,
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

describe("fitting a name", () => {
  it("keeps the whole title when it fits", () => {
    expect(fitName("Treasure Island", 15, perChar)).toBe("Treasure Island");
  });

  it("otherwise cuts it with an ellipsis, never splitting off a trailing space", () => {
    expect(fitName("Treasure Island", 10, perChar)).toBe(`Treasure${ELLIPSIS}`);
    expect(fitName("Treasure Island", 12, perChar)).toBe(`Treasure Is${ELLIPSIS}`);
  });

  it(`shows nothing unless at least ${MIN_NAME_CHARS} characters and the ellipsis fit`, () => {
    // T-11 (DeeDee): show what we can, down to one character and "…".
    expect(MIN_NAME_CHARS).toBe(1);
    expect(fitName("Robinson Crusoe", 5, perChar)).toBe(`Robi${ELLIPSIS}`);
    expect(fitName("Robinson Crusoe", 2, perChar)).toBe(`R${ELLIPSIS}`);
    expect(fitName("Robinson Crusoe", 1, perChar)).toBeNull();
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
  it("writes a thin piece's name just above it, from the piece's start, cut to its width (T-11d, T-11e)", () => {
    // Bar top at 48 (4 px thick about 50): the baseline sits 2 px above it, raised past descenders when there are any.
    const thin = [col(10, 40, 4), col(40, 70, 4)];
    expect(OUTSIDE_GAP_PX).toBe(2);
    expect(placeOutsideName("Treasure Island", thin, perChar)).toEqual({ text: "Treasure Island", x: 10, y: 46 - OUTSIDE_NAME_PX, width: 15, height: OUTSIDE_NAME_PX, textX: 10, textY: 46 });
    expect(placeOutsideName("Piano practice", thin, perChar)).toMatchObject({ y: 46 - OUTSIDE_NAME_PX, textY: 46 - DESCENDER_PX });
    expect(placeOutsideName("A Child's Garden of Verses", [col(10, 20, 4)], perChar)!.text).toBe(`A Child's${ELLIPSIS}`);
    expect(placeOutsideName("Heidi", [col(10, 11, 4)], perChar)).toBeNull();
    // With outside names on, the thin piece gets an outside name and the thick one stays inside; without, the thin one has none.
    const pieces = [[col(0, 40, 4)], [col(50, 100, 20)]];
    expect(placePieceNames("Heidi", pieces, 50, false, perChar, true).map((n) => [n.piece, n.outside])).toEqual([[0, true], [1, false]]);
    expect(placePieceNames("Heidi", pieces, 50, false, perChar).map((n) => n.piece)).toEqual([1]);
    // A thick piece too short for its name stays unnamed: only thin pieces go outside.
    expect(placePieceNames("Heidi", [[col(0, 6, 20)]], 50, false, perChar, true)).toEqual([]);
    // Zoomed out, the 2× rule still applies to later pieces.
    expect(placePieceNames("Heidi", [[col(0, 40, 4)], [col(50, 58, 4)]], 50, true, perChar, true).map((n) => n.piece)).toEqual([0]);
  });

  it(`leaves a piece thinner than ${NAME_PATCH_PX} px unnamed: with no patch, the text would spill onto the page (T-11c)`, () => {
    expect(placePieceName("The Hobbit", [col(0, 30, 6), col(30, 60, 6)], 50, perChar)).toBeNull();
    expect(placePieceName("The Hobbit", [col(0, 200, NAME_PATCH_PX - 1)], 50, perChar)).toBeNull();
    const p = placePieceName("The Hobbit", [col(0, 60, NAME_PATCH_PX)], 50, perChar)!;
    expect([p.x, p.y, p.height, p.textY]).toEqual([NAME_INSET_PX, 50 - NAME_PATCH_PX / 2, NAME_PATCH_PX, 50]);
  });

  it("cuts the name to fit the piece, and gives up below one character and the ellipsis", () => {
    const room = (n: number) => n + 2 * NAME_INSET_PX + 2 * NAME_PAD_PX;
    expect(placePieceName("Treasure Island", [col(0, room(5), 20)], 50, perChar)!.text).toBe(`Trea${ELLIPSIS}`);
    expect(placePieceName("Treasure Island", [col(0, room(2), 20)], 50, perChar)!.text).toBe(`T${ELLIPSIS}`);
    expect(placePieceName("Treasure Island", [col(0, room(1), 20)], 50, perChar)).toBeNull();
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
    it(`at ${zoom} / ${width} px every name sits inside one piece of its own bar, at most one per piece, never over another`, () => {
      const l = layoutTimeline(sample, { zoom, width, month: "2026-12" });
      const seen = new Set<string>();
      for (const n of l.names) {
        const band = l.bands.find((b) => b.rowKey === n.rowKey && b.assignmentId === n.assignmentId)!;
        const row = l.rows.find((r) => r.key === n.rowKey)!;
        expect(seen.has(`${band.rowKey}|${band.assignmentId}|${n.piece}`)).toBe(false);
        seen.add(`${band.rowKey}|${band.assignmentId}|${n.piece}`);
        // T-11: inside its piece (no labels past the bar), inside its row.
        const piece = band.runs[n.piece]!;
        expect(n.x).toBeGreaterThanOrEqual(piece.x0 - 0.01);
        expect(n.x + n.width).toBeLessThanOrEqual(piece.x1 + 0.01);
        if (n.outside) {
          // T-11d/T-11e: left-aligned with the piece, bottom edge just above the bar, never into the row above.
          expect(n.x).toBeCloseTo(piece.x0, 5);
          expect(n.height).toBe(OUTSIDE_NAME_PX);
          expect(n.textY).toBeLessThanOrEqual(n.y + n.height + 1e-9);
          expect(n.textY + OUTSIDE_GAP_PX).toBeLessThanOrEqual(band.cy);
          expect(n.y).toBeGreaterThanOrEqual(row.y - row.labelLane - 0.01);
        } else {
          expect(n.y).toBeGreaterThanOrEqual(row.y - 0.01);
          expect(n.y + n.height).toBeLessThanOrEqual(row.y + row.height + 0.01);
          expect(n.height).toBeGreaterThanOrEqual(NAME_PATCH_PX - 0.01);
          expect(n.y + n.height / 2).toBeCloseTo(band.cy, 5);
        }
        expect(n.text === band.title || (n.text.endsWith(ELLIPSIS) && band.title.startsWith(n.text.slice(0, -1)))).toBe(true);
        expect([n.paletteSlot, n.step]).toEqual([band.paletteSlot, band.step]);
        for (const m of l.names.filter((m) => m.rowKey === n.rowKey && m.outside === n.outside && m !== n)) expect(m.x >= n.x + n.width || m.x + m.width <= n.x).toBe(true);
      }
      if (width === 1280) expect(l.names.length).toBeGreaterThan(5);
      // T-11d: only rows holding an outside name get extra space.
      // T-11e: and only as much as its highest outside name needs (under 1 px to spare, from rounding up).
      for (const r of l.rows) {
        const outside = l.names.filter((n) => n.rowKey === r.key && n.outside);
        if (outside.length === 0) expect(r.labelLane).toBe(0);
        else if (r.labelLane > 0) expect(Math.min(...outside.map((n) => n.y)) - (r.y - r.labelLane)).toBeLessThan(1);
      }
    });
  }

  it("gives some thin pieces an outside name, and leaves most rows compact (T-11d)", () => {
    const l = layoutTimeline(sample, { zoom: "year", width: 1280 });
    expect(l.names.some((n) => n.outside)).toBe(true);
    expect(l.rows.filter((r) => r.labelLane === 0).length).toBeGreaterThan(0);
  });

  it("with daily detail, the piece right after a break gets its own name", () => {
    const l = layoutTimeline(sample, { zoom: "month", width: 1280, month: "2026-12" });
    const split = l.bands.filter((b) => b.runs.length > 1 && l.rows.find((r) => r.key === b.rowKey)!.height >= NAME_PATCH_PX);
    expect(split.length).toBeGreaterThan(0);
    for (const b of split) {
      const named = l.names.filter((n) => n.rowKey === b.rowKey && n.assignmentId === b.assignmentId).map((n) => n.piece);
      expect(named).toContain(1);
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
  it("outside names dim with their bar; inside names stay at full strength over the dimmed bar", () => {
    const layout = layoutTimeline(sample, { zoom: "year", width: 1280 });
    const outside = layout.names.find((n) => n.outside)!;
    const other = layout.names.find((n) => n.assignmentId !== outside.assignmentId)!.assignmentId;
    const { container } = render(<Timeline layout={layout} label="Year timeline" selectedId={other} />);
    for (const g of container.querySelectorAll(".tl-names [data-name-for]")) {
      const isOutside = !!g.querySelector("text.tl-outside-name");
      const mine = g.getAttribute("data-name-for") === other;
      expect(g.classList.contains("tl-dim")).toBe(isOutside && !mine);
      if (mine) expect(g.classList.contains("tl-selected")).toBe(true);
    }
    expect(container.querySelector(`[data-name-for="${outside.assignmentId}"] text.tl-outside-name`)!.parentElement).toHaveClass("tl-dim");
  });
});

describe("Black Beauty after Thanksgiving in Frank's Fall view (T-11b)", () => {
  it("names the piece after the break at 1280 px (a 912 px plot)", () => {
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
    // About what the page's canvas measures for the 11 px name font (Treasure Island's text is ~79 px there).
    const browserish = (t: string) => t.length * 5.3;
    const l = layoutTimeline(forChild(model, "frank"), { zoom: "fall", width: 912, measureText: browserish });
    const band = l.bands.find((b) => b.assignmentId === "beauty")!;
    expect(band.runs).toHaveLength(2);
    const names = l.names.filter((n) => n.assignmentId === "beauty");
    expect(names.map((n) => n.piece)).toEqual([0, 1]);
    const after = names[1]!;
    expect(after.text.startsWith("Bl")).toBe(true);
    // Wider than 2× its name but not 3×: this is the piece the old rule left blank.
    const w = band.runs[1]!.x1 - band.runs[1]!.x0;
    expect(w).toBeLessThan(3 * after.width);
  });
});
