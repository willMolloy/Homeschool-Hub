/** S10-19: the small carry-overs that are not CSV (records-export / log-setup tests cover R1, R2, R5): R4 the zoom row's
 *  scroll cue, L10 stacked date pairs on narrow screens. The smoke-script parts (R7, L6, L7) are run in the browser. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ZoomPresets } from "../src/features/timeline/ZoomPresets";

const css = (p: string) => readFileSync(join(process.cwd(), p), "utf8");

describe("R4: a zoom row with more past its edge says so with a caret, not only a fade", () => {
  afterEach(() => vi.restoreAllMocks());
  it("shows a caret at the end while there is more to the right, and none when it all fits", () => {
    const sw = vi.spyOn(HTMLElement.prototype, "scrollWidth", "get").mockReturnValue(500);
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(240);
    const { container, unmount } = render(<ZoomPresets zooms={["year", "fall", "spring"]} value="year" onChange={() => {}} onEdit={() => {}} />);
    expect(container.querySelector(".tl-zoom")).toHaveAttribute("data-more", "end");
    const caret = container.querySelector(".tl-zoom-more-end")!;
    expect(caret).not.toBeNull();
    expect(caret).toHaveAttribute("aria-hidden", "true");
    expect(container.querySelector(".tl-zoom-more-start")).toBeNull();
    expect(container.querySelector(".tl-zoom-row")).toHaveAttribute("data-edit");
    unmount();
    sw.mockReturnValue(240);
    const fits = render(<ZoomPresets zooms={["year", "fall", "spring"]} value="year" onChange={() => {}} />);
    expect(fits.container.querySelector(".tl-zoom-more")).toBeNull();
  });
  it("the caret sits over the fade (beside the pencil), takes no taps, and a phone chip is at most 7.5rem", () => {
    const t = css("src/features/timeline/timeline.css");
    expect(t).toMatch(/\.tl-zoom-more \{ position: absolute;[^}]*pointer-events: none; \}/);
    expect(t).toMatch(/\.tl-zoom-row\[data-edit\] \.tl-zoom-more-end \{ right: 48px; \}/);
    expect(t).toMatch(/@media \(max-width: 639px\) \{[^@]*\.tl-zoom button \{ padding: 0 10px; max-width: 7\.5rem; \}/);
  });
});

describe("L10: a start / end pair of date fields stacks under 480 px", () => {
  it("one column below 480 px (side by side the boxes clipped the dates at 360-390)", () => {
    expect(css("src/ui/date-field.css")).toMatch(/@media \(max-width: 479px\) \{\s*\.field-row:has\(\.date-field\) \{ grid-template-columns: 1fr; \}\s*\}/);
  });
});
