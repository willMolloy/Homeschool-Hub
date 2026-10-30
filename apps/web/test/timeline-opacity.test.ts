import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BAR_OPACITY, CHROME, PALETTE_NAMES, THEME_NAMES, composite, contrast, swatches } from "../scripts/palette";

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

// T-11d: outside names are page text that dims with its bar; inside names stay full strength on a dimmed bar.
describe("name contrast while dimmed (T-11d)", () => {
  const css = readFileSync("src/features/timeline/timeline.css", "utf8");
  it("outside names use the page text colour", () => {
    expect(css).toMatch(/\.tl-outside-name\s*\{[^}]*fill:\s*var\(--tl-foreground\);/);
  });
  it.each(THEME_NAMES)("page text at the dim opacity meets AA on the page and on cards (%s)", (theme) => {
    for (const bg of [CHROME[theme].background!, CHROME[theme].card!]) {
      expect(contrast(composite(CHROME[theme].foreground!, bg, 0.65), bg)).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("a full-strength inside name on a dimmed bar fails AA far less often than a dimmed one (165 → 45 of 240)", () => {
    let full = 0;
    for (const p of PALETTE_NAMES) for (const t of THEME_NAMES) {
      let f = 0, d = 0;
      for (const s of swatches(p, t)) for (const bg of [CHROME[t].background!, CHROME[t].card!]) {
        const bar = composite(s.color, bg, BAR_OPACITY * 0.65);
        if (contrast(s.label, bar) < 4.5) f++;
        if (contrast(composite(s.label, bg, 0.65), bar) < 4.5) d++;
      }
      expect(f).toBeLessThan(d);
      if (p === "vivid") expect(f).toBe(0);
      full += f;
    }
    expect(full).toBeLessThanOrEqual(45);
  });
});
