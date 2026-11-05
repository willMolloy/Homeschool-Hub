/** S10-04b: bar labels that fit (inside → outside right, muted → "…" with ≥ 6 letters → none). */
import { render } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { layoutTimeline } from "../src/features/timeline/layout";
import { buildTimelineModel } from "../src/features/timeline/model";
import { ELLIPSIS, MIN_NAME_CHARS, NAME_FONT_PX, NAME_FONT_WEIGHT, OUTSIDE_CLEAR_PX, OUTSIDE_GAP_PX, placePieceNames } from "../src/features/timeline/names";
import type { BandColumn } from "../src/features/timeline/paths";
import { Timeline } from "../src/features/timeline/Timeline";
import { sampleInput } from "./helpers/timeline-fixtures";

const perChar = (t: string) => t.length;
const col = (x0: number, x1: number, h = 20, cy = 50): BandColumn => ({ x0, x1, top: cy - h / 2, bottom: cy + h / 2 });
/** About what a 12 px / 700 canvas measures in the app font. */
const browserish = (t: string) => t.length * 7;
const name = (title: string, piece: BandColumn[], limit: number) => placePieceNames(title, [piece], 50, false, perChar, [limit])[0];

describe("the four fallbacks, in order (S10-04b)", () => {
  // "Treasure Island" is 15 px with perChar; an inside name needs 15 + 2 × pad + 2 × inset = 27 px.
  it("1. inside, in full, when it fits", () => {
    expect(name("Treasure Island", [col(0, 40)], 400)).toMatchObject({ text: "Treasure Island", outside: false });
  });
  it("2. otherwise outside to the right, in full, when the row is free", () => {
    const n = name("Treasure Island", [col(0, 20)], 20 + OUTSIDE_GAP_PX + 15 + OUTSIDE_CLEAR_PX)!;
    expect(n).toMatchObject({ text: "Treasure Island", outside: true, x: 20 + OUTSIDE_GAP_PX, textY: 50 });
    // A thin bar (no room for text inside at all) goes outside too.
    expect(name("Treasure Island", [col(0, 200, 6)], 400)).toMatchObject({ outside: true, x: 206 });
  });
  it(`3. otherwise "…" inside, keeping at least ${MIN_NAME_CHARS} letters`, () => {
    // 22 px piece: 10 px of text room, the row blocked 1 px short of the outside name.
    const n = name("Treasure Island", [col(0, 22)], 22 + OUTSIDE_GAP_PX + 15 + OUTSIDE_CLEAR_PX - 1)!;
    expect(n).toMatchObject({ text: `Treasure${ELLIPSIS}`, outside: false });
    expect(n.text.length - 1).toBeGreaterThanOrEqual(MIN_NAME_CHARS);
  });
  it("4. otherwise no label", () => {
    // 18 px piece: 6 px of room is not six letters and "…"; the row is blocked right after the piece.
    expect(name("Treasure Island", [col(0, 18)], 30)).toBeUndefined();
    // Thin and blocked: nothing.
    expect(name("Treasure Island", [col(0, 200, 6)], 210)).toBeUndefined();
  });
});

describe("labels in the layout never overflow or overlap (S10-04b)", () => {
  const sample = buildTimelineModel(sampleInput({ events: [] }));
  for (const width of [320, 360, 1280]) for (const zoom of ["year", "month"] as const) {
    it(`${zoom} at ${width} px`, () => {
      const l = layoutTimeline(sample, { zoom, width, month: "2026-12", measureText: browserish });
      const right = l.plot.x + l.plot.width;
      for (const n of l.names) {
        const band = l.bands.find((b) => b.rowKey === n.rowKey && b.assignmentId === n.assignmentId)!;
        const piece = band.runs[n.piece]!;
        if (n.outside) {
          expect(n.x + n.width).toBeLessThanOrEqual(right - OUTSIDE_CLEAR_PX + 0.01);
          for (const b of l.bands.filter((b) => b.rowKey === n.rowKey)) for (const r of b.runs) {
            expect(r.x0 >= n.x + n.width || r.x1 <= n.x).toBe(true);
          }
        } else {
          expect(n.x).toBeGreaterThanOrEqual(piece.x0 - 0.01);
          expect(n.x + n.width).toBeLessThanOrEqual(piece.x1 + 0.01);
          if (n.text.endsWith(ELLIPSIS)) expect(n.text.length - 1).toBeGreaterThanOrEqual(MIN_NAME_CHARS);
        }
        for (const m of l.names) if (m !== n && m.rowKey === n.rowKey) expect(m.x >= n.x + n.width || m.x + m.width <= n.x).toBe(true);
      }
    });
  }
});

describe("drawing labels (S10-04b)", () => {
  const css = readFileSync("src/features/timeline/timeline.css", "utf8");
  it("inside labels are 12 px / 700 (mockup); outside ones 12 px / 600 in muted text with a page-colour halo", () => {
    expect([NAME_FONT_PX, NAME_FONT_WEIGHT]).toEqual([12, 700]);
    expect(css).toMatch(/\.tl-name\s*\{[^}]*font-size:\s*12px;\s*font-weight:\s*700;/);
    expect(css).toMatch(/\.tl-outside-name\s*\{[^}]*font-size:\s*12px;\s*font-weight:\s*600;\s*fill:\s*var\(--tl-muted-foreground\);[^}]*stroke:\s*var\(--tl-background\);/);
  });
  it("outside labels are centred on their row", () => {
    const sample = buildTimelineModel(sampleInput({ events: [] }));
    const layout = layoutTimeline(sample, { zoom: "year", width: 360, measureText: browserish });
    const { container } = render(<Timeline layout={layout} label="Year timeline" />);
    const outside = [...container.querySelectorAll("text.tl-outside-name")];
    expect(outside.length).toBe(layout.names.filter((n) => n.outside).length);
    for (const t of outside) expect(t).toHaveAttribute("dominant-baseline", "central");
  });
});

describe("a stopped bar always says Stopped (S13-00, N1)", () => {
  const bounds = { left: 40, right: 300 };
  const stopped = (piece: BandColumn[], limit: number, b = bounds) => placePieceNames("Black Beauty · Stopped", [piece], 50, false, perChar, [limit], b);
  it("keeps the full name with the word when it fits", () => {
    expect(stopped([col(60, 120)], 300)[0]).toMatchObject({ text: "Black Beauty · Stopped" });
  });
  it("a stub too short for the name (a cut name would lose the word) shows 'Stopped' outside it", () => {
    // 45 px piece: the full name is 22 px + padding inside; the cut name has no word. Outside, "Black Beauty · Stopped" is 22 px and fits too, so block it.
    const n = stopped([col(60, 70)], 70 + OUTSIDE_GAP_PX + 7 + OUTSIDE_CLEAR_PX)!;
    expect(n).toHaveLength(1);
    expect(n[0]).toMatchObject({ text: "Stopped", outside: true, x: 70 + OUTSIDE_GAP_PX });
  });
  it("when the next bar is close, 'Stopped' goes left of the stub, never over the next bar's label (S14-00, N1)", () => {
    const n = stopped([col(60, 70)], 72);
    expect(n[0]).toMatchObject({ text: "Stopped", outside: true });
    expect(n[0]!.x + n[0]!.width).toBeLessThanOrEqual(60);
  });
  it("with a bar on each side the word is dropped rather than drawn over either (S14-00, N1)", () => {
    expect(stopped([col(60, 70)], 72, { left: Number.POSITIVE_INFINITY, right: 300 })).toEqual([]);
  });
  it("at the plot's right edge it goes to the left of the stub", () => {
    const n = stopped([col(290, 298)], 300);
    expect(n[0]).toMatchObject({ text: "Stopped", outside: true });
    expect(n[0]!.x + n[0]!.width).toBeLessThanOrEqual(290);
  });
  it("is never a bare stub: a thin bar (no room inside) also gets the word", () => {
    expect(stopped([col(60, 64, 4)], 64 + 1)).toHaveLength(1);
  });
  it("open and finished bars are untouched by this rule", () => {
    expect(placePieceNames("Treasure Island", [[col(0, 18)]], 50, false, perChar, [30])).toEqual([]);
  });
});

describe("S14-00: Sprint 13 layout leftovers are in the style sheets (N2, N3)", () => {
  const read = (p: string) => readFileSync(new URL(p, import.meta.url), "utf8");
  it("the review footer scrolls with the page on a short phone, and the empty-child line shrinks the card (N2)", () => {
    const css = read("../src/features/review/review.css");
    expect(css).toMatch(/@media \(max-height: 640px\) \{ \.review-foot \{ position: static; \} \}/);
    expect(css).toMatch(/\.review-body\.has-empty-line \.review-card \{ width: min\(100%, calc\(\(100dvh - 430px\)/);
  });
  it("Records' action row sizes the Term in review link like Log and Export (N3)", () => {
    expect(read("../src/features/records/records.css")).toMatch(/\.records-actions \.btn \{ box-sizing: border-box; flex: none; white-space: nowrap; \}/);
  });
});
