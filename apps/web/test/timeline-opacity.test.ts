import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BAR_OPACITY } from "../scripts/palette";

// T-08c: bars halfway to opaque, dimmed bars halfway to opaque from T-08b's 0.3, selected stays solid.
describe("bar opacity (T-08c)", () => {
  const css = readFileSync("src/features/timeline/timeline.css", "utf8");
  it("unselected bars draw at 0.91", () => {
    expect(BAR_OPACITY).toBe(0.91);
    expect(readFileSync("src/styles/tokens.css", "utf8")).toContain("--tl-bar-opacity: 0.91;");
  });
  it("dimmed bars sit halfway between 0.3 and 1", () => {
    expect(css).toMatch(/\.tl-svg \.tl-dim\s*\{\s*opacity:\s*0\.65;/);
  });
  it("the selected bar stays fully opaque", () => {
    expect(css).toMatch(/\.tl-band\.tl-selected\s*\{\s*fill-opacity:\s*1;/);
  });
});
