/** S10-05: breaks are a wash over the bars, and bars run straight through them. */
import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WASH_OPACITY } from "../scripts/palette";
import { layoutTimeline } from "../src/features/timeline/layout";
import { buildTimelineModel } from "../src/features/timeline/model";
import { bridgeBreaks } from "../src/features/timeline/smooth";
import { Timeline } from "../src/features/timeline/Timeline";
import { sampleInput } from "./helpers/timeline-fixtures";

const model = buildTimelineModel(sampleInput({ events: [] }));
const familyBreaks = model.breaks.filter((b) => b.childIds.length === 0);

describe("the wash token (S10-05)", () => {
  it("is 72 % in light and 50 % in dark, as in the mockup", () => {
    expect(WASH_OPACITY).toEqual({ light: 0.72, dark: 0.5 });
    const css = readFileSync("src/styles/tokens.css", "utf8");
    expect(css).toContain("--tl-wash: 0.72;");
    expect(css).toContain("--tl-wash: 0.5;");
  });
});

describe("bridgeBreaks", () => {
  const school = [true, true, true, true, true, true, true, true];
  it("fills a gap whose school days are all closed, easing between its neighbours", () => {
    expect(bridgeBreaks([2, 0, 0, 0, 6, 0, 0, 0], school, (i) => i >= 1 && i <= 3)).toEqual([2, 3, 4, 5, 6, 0, 0, 0]);
  });
  it("leaves a gap with an open school day, and the ends, alone", () => {
    expect(bridgeBreaks([0, 2, 0, 0, 2, 0], school, (i) => i === 2)).toEqual([0, 2, 0, 0, 2, 0]);
    expect(bridgeBreaks([0, 0, 2, 2, 0, 0], school, () => true)).toEqual([0, 0, 2, 2, 0, 0]);
  });
  it("ignores weekends inside the break, and never bridges a gap of only weekends", () => {
    const weekend = [true, false, false, true, true];
    expect(bridgeBreaks([1, 0, 0, 0, 1], weekend, (i) => i === 3)).toEqual([1, 1, 1, 1, 1]);
    expect(bridgeBreaks([1, 0, 0, 1, 1], weekend, () => true)).toEqual([1, 0, 0, 1, 1]);
  });
  it("passes over idle days (an event that skips the work) next to the break, but never bridges idle days alone (S10-05 fix)", () => {
    // Thu work, Fri piano (idle), Sat–Sun, Mon–Tue break, Wed work.
    const week = [true, true, false, false, true, true, true];
    const series = [2, 0, 0, 0, 0, 0, 2];
    const brk = (i: number) => i === 4 || i === 5;
    expect(bridgeBreaks(series, week, brk)).toEqual(series);
    expect(bridgeBreaks(series, week, brk, (i) => i === 1).every((v) => v > 0)).toBe(true);
    expect(bridgeBreaks([1, 0, 0, 0, 1], [true, true, false, false, true], () => false, (i) => i === 1)).toEqual([1, 0, 0, 0, 1]);
  });
});

describe("the Year view's breaks (S10-05)", () => {
  for (const width of [360, 1280]) {
    it(`no bar is split by a family-wide break, and some bar runs straight through one, at ${width} px`, () => {
      expect(familyBreaks.length).toBeGreaterThan(0);
      const l = layoutTimeline(model, { zoom: "year", width });
      const rects = l.breaks.filter((r) => familyBreaks.some((b) => b.id === r.breakId));
      let through = 0;
      for (const band of l.bands) {
        for (let k = 1; k < band.runs.length; k++) {
          const gap = { x0: band.runs[k - 1]!.x1, x1: band.runs[k]!.x0 };
          for (const r of rects) expect(gap.x0 >= r.x - 1 && gap.x1 <= r.x + r.width + 1).toBe(false);
        }
        for (const run of band.runs) for (const r of rects) if (run.x0 < r.x && run.x1 > r.x + r.width) through++;
      }
      expect(through).toBeGreaterThan(0);
    });
  }

  it("bars stay whole across breaks when a weekly event skips them on the day before (S10-05 fix, M1: Frank's piano)", () => {
    const withEvents = buildTimelineModel(sampleInput());
    const piano = withEvents.lanes.flatMap((s) => s.children).flatMap((c) => c.assignments).find((a) => a.childId === "frank" && a.assignmentId === "piano")!;
    expect(piano.idle?.some(Boolean)).toBe(true);
    const fam = withEvents.breaks.filter((b) => b.childIds.length === 0);
    const l = layoutTimeline(withEvents, { zoom: "year", width: 1280 });
    const rects = l.breaks.filter((r) => fam.some((b) => b.id === r.breakId));
    expect(rects.length).toBeGreaterThan(0);
    const split: string[] = [];
    for (const band of l.bands) {
      for (let k = 1; k < band.runs.length; k++) {
        const gap = { x0: band.runs[k - 1]!.x1, x1: band.runs[k]!.x0 };
        for (const r of rects) if (gap.x0 < r.x + r.width && gap.x1 > r.x) split.push(`${band.title} (${band.childId}) at ${r.breakId}`);
      }
    }
    expect(split).toEqual([]);
    const pianoBand = l.bands.find((b) => b.assignmentId === "piano" && b.childId === "frank")!;
    expect(pianoBand.runs).toHaveLength(1);
  });

  it("draws each break as a soft band under the bars and a wash over them, under Today and the names", () => {
    const l = layoutTimeline(model, { zoom: "year", width: 1280 });
    const { container } = render(<Timeline layout={l} label="t" subjects={[]} />);
    const svg = container.querySelector("svg.tl-svg")!;
    const order = [...svg.children].map((c) => c.getAttribute("class"));
    const at = (k: string) => order.indexOf(k);
    expect(at("tl-breaks")).toBeLessThan(at("tl-bands"));
    expect(at("tl-wash")).toBeGreaterThan(at("tl-bands"));
    expect(at("tl-wash")).toBeLessThan(at("tl-names"));
    if (l.todayX !== null) expect(at("tl-wash")).toBeLessThan(at("tl-today"));
    expect(svg.querySelectorAll(".tl-wash rect")).toHaveLength(l.breaks.length);
    expect(svg.querySelector("pattern")).toBeNull();
    const css = readFileSync("src/features/timeline/timeline.css", "utf8");
    expect(css).toMatch(/\.tl-wash rect \{[^}]*fill-opacity: var\(--tl-wash\)/);
  });
});
