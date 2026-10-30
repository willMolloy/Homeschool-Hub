/** T-11: gaps between assignments, connectors within one assignment, rounded caps (features/timeline/pieces.ts). */
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { layoutTimeline } from "../src/features/timeline/layout";
import { buildTimelineModel } from "../src/features/timeline/model";
import { CORNER_RADIUS_PX, smoothRunPath, type BandColumn } from "../src/features/timeline/paths";
import { ASSIGNMENT_GAP_PX, connectorsOf, insetEnds, piecesOf } from "../src/features/timeline/pieces";
import { Timeline } from "../src/features/timeline/Timeline";
import { sampleInput } from "./helpers/timeline-fixtures";

const col = (x0: number, x1: number, h = 10, cy = 50): BandColumn => ({ x0, x1, top: cy - h / 2, bottom: cy + h / 2 });
const sample = buildTimelineModel(sampleInput({ events: [] }));
const views = [["year", 1280], ["fall", 1280], ["month", 1280], ["year", 390], ["month", 390], ["year", 320]] as const;

describe("pulling an assignment's ends in", () => {
  it("moves only the outer edges, by half the gap, and keeps break gaps as they are", () => {
    const out = insetEnds([null, col(0, 10), col(10, 20), null, col(40, 50), null]);
    expect(out[1]!.x0).toBe(ASSIGNMENT_GAP_PX / 2);
    expect(out[2]).toEqual(col(10, 20));
    expect(out[4]!.x0).toBe(40);
    expect(out[4]!.x1).toBe(50 - ASSIGNMENT_GAP_PX / 2);
    expect([out[0], out[3], out[5]]).toEqual([null, null, null]);
  });

  it("drops end columns the inset swallows, and never shrinks a bar below 1 px", () => {
    const out = insetEnds([col(0, 1), col(1, 20)]);
    expect(out[0]).toBeNull();
    expect(out[1]!.x0).toBe(ASSIGNMENT_GAP_PX / 2);
    const tiny = insetEnds([col(0, 2)]);
    expect(tiny[0]!.x1 - tiny[0]!.x0).toBeCloseTo(1, 5);
  });
});

describe("connectors", () => {
  it("join consecutive pieces of one assignment, and only those", () => {
    const pieces = piecesOf([col(0, 10), col(10, 20), null, null, col(40, 50), null, col(60, 70)]);
    expect(pieces).toHaveLength(3);
    expect(connectorsOf(pieces)).toEqual([{ x0: 20, x1: 40 }, { x0: 50, x1: 60 }]);
    expect(connectorsOf(piecesOf([col(0, 10)]))).toEqual([]);
  });
});

describe("in the layout", () => {
  for (const [zoom, width] of views) {
    it(`at ${zoom} / ${width} px neighbouring assignments never touch, and connectors stay inside their own assignment`, () => {
      const l = layoutTimeline(sample, { zoom, width, month: "2026-12" });
      for (const row of l.rows) {
        const bands = l.bands.filter((b) => b.rowKey === row.key && b.runs.length > 0);
        const spans = bands.map((b) => ({ b, x0: b.runs[0]!.x0, x1: b.runs.at(-1)!.x1 })).sort((a, z) => a.x0 - z.x0);
        for (let i = 1; i < spans.length; i++) expect(spans[i]!.x0 - spans[i - 1]!.x1).toBeGreaterThanOrEqual(ASSIGNMENT_GAP_PX - 0.01);
        for (const { b, x0, x1 } of spans) {
          expect(b.connectors).toHaveLength(b.runs.length - 1);
          for (const c of b.connectors) {
            expect(c.x0).toBeGreaterThanOrEqual(x0);
            expect(c.x1).toBeLessThanOrEqual(x1);
            for (const o of spans.filter((o) => o.b !== b)) expect(o.x0 >= c.x1 || o.x1 <= c.x0).toBe(true);
          }
        }
      }
    });
  }

  it("year view connects across the winter break; This month across every break", () => {
    const year = layoutTimeline(sample, { zoom: "year", width: 1280 });
    expect(year.bands.some((b) => b.connectors.length > 0)).toBe(true);
    const month = layoutTimeline(sample, { zoom: "month", width: 1280, month: "2026-12" });
    const split = month.bands.filter((b) => b.runs.length > 1);
    expect(split.length).toBeGreaterThan(0);
    for (const b of split) expect(b.connectors).toHaveLength(b.runs.length - 1);
  });

  it("draws connectors as faint centre lines in the bar's colour", () => {
    const layout = layoutTimeline(sample, { zoom: "year", width: 1280 });
    const { container } = render(<Timeline layout={layout} label="Year timeline" />);
    const lines = [...container.querySelectorAll("line.tl-connector")] as SVGLineElement[];
    expect(lines.length).toBe(layout.bands.reduce((n, b) => n + b.connectors.length, 0));
    for (const line of lines) {
      const own = layout.bands.filter((b) => b.assignmentId === line.dataset.connectorFor && b.connectors.length > 0);
      expect(own.map((b) => String(b.cy))).toContain(line.getAttribute("y1"));
      expect(line.style.stroke).toMatch(/^var\(--tl-subject-\d+(-light|-dark)?\)$/);
    }
  });
});

describe("end caps", () => {
  it("round the ends of a smooth bar", () => {
    const d = smoothRunPath([col(0, 40, 20)]);
    expect(d.startsWith(`M0,${50 - 10 + CORNER_RADIUS_PX} Q0,40 ${CORNER_RADIUS_PX},40`)).toBe(true);
    expect(d).toContain(`Q40,40 40,${40 + CORNER_RADIUS_PX}`);
  });
});
