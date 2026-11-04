/** S10-15: every Year badge takes taps through a 44 x 44 px zone; where zones overlap, the nearest badge centre wins. */
import { fireEvent, render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { BADGE_HIT_PX, layoutTimeline, nearestBadge } from "../src/features/timeline/layout";
import { buildTimelineModel } from "../src/features/timeline/model";
import { Timeline } from "../src/features/timeline/Timeline";
import { sampleInput } from "./helpers/timeline-fixtures";

const model = buildTimelineModel(sampleInput());

function mount(width: number) {
  const layout = layoutTimeline(model, { zoom: "year", width });
  const r = render(<Timeline layout={layout} label="t" subjects={[]} />);
  const buttons = [...r.container.querySelectorAll<HTMLElement>("button.tl-badge")];
  // jsdom has no layout: give each zone its box, with the timeline at the page origin so clientY is the layout's y.
  for (const b of buttons) {
    const top = parseFloat(b.style.top), height = parseFloat(b.style.height), width = parseFloat(b.style.width);
    b.getBoundingClientRect = () => ({ top, left: 0, right: width, bottom: top + height, width, height, x: 0, y: top, toJSON: () => ({}) });
  }
  const pressed = () => buttons.findIndex((b) => b.getAttribute("aria-pressed") === "true");
  return { ...r, layout, buttons, pressed };
}

describe("S10-15 badge tap zones", () => {
  for (const width of [320, 360, 390, 1280]) {
    it(`at ${width} px every badge's zone is at least 44 x 44 and centred on its badge`, () => {
      const { layout, buttons } = mount(width);
      expect(buttons).toHaveLength(layout.badges.length);
      buttons.forEach((b, i) => {
        const top = parseFloat(b.style.top), h = parseFloat(b.style.height), w = parseFloat(b.style.width);
        expect(h).toBeGreaterThanOrEqual(BADGE_HIT_PX);
        expect(w).toBeGreaterThanOrEqual(BADGE_HIT_PX);
        expect(top + h / 2).toBeCloseTo(layout.badges[i]!.cy, 5);
        expect(w).toBeGreaterThanOrEqual(layout.metrics.gutter); // it reaches a little over the grid on the right
      });
    });
  }

  it("where two zones overlap, the tap goes to the nearer badge centre", () => {
    const { layout, buttons, pressed } = mount(360);
    const i = layout.badges.findIndex((b, k) => k > 0 && b.cy - layout.badges[k - 1]!.cy < BADGE_HIT_PX);
    expect(i).toBeGreaterThan(0); // the sample has neighbours closer than 44 px
    const a = layout.badges[i - 1]!, b = layout.badges[i]!;
    // A point inside both zones, nearer the lower badge: it wins even though the upper button got the tap.
    const y = (a.cy + b.cy) / 2 + 1;
    expect(y).toBeLessThan(a.cy + BADGE_HIT_PX / 2);
    fireEvent.click(buttons[i - 1]!, { clientY: y, detail: 1 });
    expect(pressed()).toBe(i);
    fireEvent.click(buttons[i]!, { clientY: (a.cy + b.cy) / 2 - 1, detail: 1 });
    expect(pressed()).toBe(i - 1);
  });

  it("a tap just beside the badge, over the grid, still selects that badge and names the subject", () => {
    const { layout, buttons, pressed, container } = mount(360);
    const b = layout.badges[2]!;
    fireEvent.click(buttons[2]!, { clientX: layout.metrics.gutter + 3, clientY: b.cy + 4, detail: 1 });
    expect(pressed()).toBe(2);
    expect(container.querySelector(".tl-lane-pop")!.textContent).toBe(b.text);
  });

  it("a keyboard press selects the focused badge itself", () => {
    const { buttons, pressed } = mount(1280);
    fireEvent.click(buttons[1]!, { detail: 0 });
    expect(pressed()).toBe(1);
  });

  it("nearestBadge picks the closest centre", () => {
    expect(nearestBadge([{ cy: 10 }, { cy: 46 }, { cy: 82 }], 29)!.cy).toBe(46);
    expect(nearestBadge([{ cy: 10 }, { cy: 46 }], 27)!.cy).toBe(10);
    expect(nearestBadge([], 5)).toBeNull();
  });
});
