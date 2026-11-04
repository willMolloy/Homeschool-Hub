/** S10-03: Today in a sticky two-line axis: months on line 1, the pill on line 2, a dashed line through every lane. */
import { readFileSync } from "node:fs";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { DESKTOP_METRICS, PHONE_METRICS, layoutTimeline } from "../src/features/timeline/layout";
import { buildTimelineModel } from "../src/features/timeline/model";
import { Timeline } from "../src/features/timeline/Timeline";
import { sampleInput } from "./helpers/timeline-fixtures";

const model = buildTimelineModel(sampleInput());
const css = readFileSync("src/features/timeline/timeline.css", "utf8");
const rule = (sel: string) => css.match(new RegExp(`(^|\\n)${sel.replace(/[.]/g, "\\.")} \\{([^}]*)\\}`))?.[2] ?? "";

describe("S10-03 the sticky two-line axis", () => {
  for (const [width, m] of [[360, PHONE_METRICS], [1280, DESKTOP_METRICS]] as const) {
    it(`at ${width} px: months on line 1, the Today pill on line 2 below them, and the group headers stick under the axis`, () => {
      const layout = layoutTimeline(model, { zoom: "year", width });
      expect(layout.todayX).not.toBeNull();
      const { container } = render(<Timeline layout={layout} label="t" subjects={[]} />);
      const axis = container.querySelector<HTMLElement>(".tl-axis")!;
      expect(axis.style.height).toBe(`${m.axis}px`);
      expect(axis.style.marginBottom).toBe(`-${m.axis}px`); // it lies over the room the layout leaves at the top
      const labels = [...axis.querySelectorAll("text.tl-axis-label")];
      expect(labels.length).toBeGreaterThan(2);
      const baseline = Math.max(...labels.map((t) => Number(t.getAttribute("y"))));
      const pill = axis.querySelector("[data-today-pill] rect")!;
      const pillTop = Number(pill.getAttribute("y"));
      expect(pillTop).toBeGreaterThan(baseline); // never on top of a month label: it has its own line
      expect(pillTop + Number(pill.getAttribute("height"))).toBeLessThanOrEqual(m.axis);
      expect(container.querySelector("svg.tl-svg text.tl-axis-label")).toBeNull();
      expect((container.querySelector(".tl-wrap") as HTMLElement).style.getPropertyValue("--tl-sticky-top")).toBe(`${m.axis}px`);
    });
  }

  it("the axis sticks to the top, above the lanes and their headers' layer", () => {
    expect(rule(".tl-axis")).toMatch(/position: sticky/);
    expect(rule(".tl-axis")).toMatch(/top: 0/);
    expect(rule(".tl-axis")).toMatch(/z-index: var\(--z-raised\)/);
    expect(rule(".tl-axis")).toMatch(/background: var\(--tl-background\)/);
    expect(rule(".tl-group-head")).toMatch(/top: var\(--tl-sticky-top/);
  });

  it("the dashed Today line runs from the axis through every lane, over the bars and under the names, which carry a 3 px halo", () => {
    const layout = layoutTimeline(model, { zoom: "year", width: 360 });
    const { container } = render(<Timeline layout={layout} label="t" subjects={[]} />);
    const line = container.querySelector("svg.tl-svg [data-today] line")!;
    expect(Number(line.getAttribute("y1"))).toBe(PHONE_METRICS.axis);
    expect(Number(line.getAttribute("y2"))).toBe(layout.lanesBottom);
    for (const g of layout.groups) { expect(g.top).toBeGreaterThanOrEqual(PHONE_METRICS.axis); expect(g.bottom).toBeLessThanOrEqual(layout.lanesBottom); }
    const order = [...container.querySelectorAll("svg.tl-svg > g")].map((g) => g.getAttribute("class"));
    expect(order.indexOf("tl-today")).toBeGreaterThan(order.indexOf("tl-bands"));
    expect(order.indexOf("tl-today")).toBeLessThan(order.indexOf("tl-names"));
    for (const sel of [".tl-name", ".tl-outside-name"]) {
      expect(rule(sel)).toMatch(/paint-order: stroke/);
      expect(rule(sel)).toMatch(/stroke-width: 3px/);
    }
    expect(rule(".tl-today line")).toMatch(/stroke-dasharray/);
  });
});
