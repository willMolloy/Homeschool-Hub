import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BAR_OPACITY, CHROME, THEME_NAMES, composite, contrast, swatches } from "../scripts/palette";

// S8-01: Soft Paper bars are solid pastel fills (T-08c's 0.91 is gone); dimmed bars sit at 0.7 (was 0.65, so the page text on them keeps AA).
const DIM = 0.7;
describe("bar opacity (S8-01)", () => {
  const css = readFileSync("src/features/timeline/timeline.css", "utf8");
  it("unselected bars draw solid", () => {
    expect(BAR_OPACITY).toBe(1);
    expect(readFileSync("src/styles/tokens.css", "utf8")).toContain("--tl-bar-opacity: 1;");
  });
  it("dimmed bars draw at 0.7", () => {
    expect(css).toMatch(/\.tl-svg \.tl-dim\s*\{\s*opacity:\s*0\.7;/);
  });
  it("the selected bar stays fully opaque", () => {
    expect(css).toMatch(/\.tl-band\.tl-selected\s*\{\s*fill-opacity:\s*1;/);
  });
});

// T-11d: outside names are page text that dims with its bar; inside names stay full strength on a dimmed bar.
describe("name contrast while dimmed (T-11d)", () => {
  const css = readFileSync("src/features/timeline/timeline.css", "utf8");
  // S10-04b (mockup): outside names are muted page text, and no longer dim with their bar (muted text at 0.7 would miss AA).
  it("outside names use the muted text colour", () => {
    expect(css).toMatch(/\.tl-outside-name\s*\{[^}]*fill:\s*var\(--tl-muted-foreground\);/);
  });
  it.each(THEME_NAMES)("muted outside names at full strength meet AA on the page and on cards (%s)", (theme) => {
    for (const bg of [CHROME[theme].background!, CHROME[theme].card!]) {
      expect(contrast(CHROME[theme]["muted-foreground"]!, bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it.each(THEME_NAMES)("page text at the dim opacity meets AA on the page and on cards (%s)", (theme) => {
    for (const bg of [CHROME[theme].background!, CHROME[theme].card!]) {
      expect(contrast(composite(CHROME[theme].foreground!, bg, DIM), bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it.each(THEME_NAMES)("a full-strength inside name on a dimmed bar meets AA on every swatch (%s)", (t) => {
    const failures: string[] = [];
    for (const s of swatches(t)) for (const bg of [CHROME[t].background!, CHROME[t].card!]) {
      if (contrast(s.label, composite(s.color, bg, BAR_OPACITY * DIM)) < 4.5) failures.push(`${s.subject}/${s.step}`);
    }
    expect(failures).toEqual([]);
  });
});
