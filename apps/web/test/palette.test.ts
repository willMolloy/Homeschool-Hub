// S8-01: the generated Soft Paper tokens. Colour maths only; nothing renders.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "tailwindcss";
import { describe, expect, it } from "vitest";
import {
  AA_TEXT, AA_UI, BAR_SECONDARY_OPACITY, CHROME, CHROME_TEXT_PAIRS, STEP_NAMES, SUBJECT_COUNT, SUBJECT_HUES, SWATCH_TO_HUE, THEME_NAMES,
  composite, contrast, mix, renderThemeCss, renderTokensCss, swatches,
} from "../scripts/palette";
import { PALETTE, PALETTE_NAMES, SWATCH_SLOTS, nextUnusedColor, slotOfColor } from "../src/features/roster/palette";

const styles = (name: string) => readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/styles", name), "utf8");

describe("subject hues", () => {
  it("are the eight Soft Paper hues, with Will's stronger light fills, then (S10-11) rose, leaf, aqua and plum", () => {
    expect(SUBJECT_HUES.map((h) => h.name)).toEqual(["honey", "sky", "mint", "butter", "blue", "coral", "lilac", "sage", "rose", "leaf", "aqua", "plum"]);
    expect(SUBJECT_HUES.slice(0, 8).map((h) => h.light.fill)).toEqual(["#F0D6A8", "#BDDCF0", "#B5DFD1", "#EAE2A5", "#C1D0EA", "#F0C8B4", "#E5C8DB", "#D1D5C9"]);
    expect(SUBJECT_COUNT).toBe(12);
  });

  it.each(THEME_NAMES)("%s: S10-11: every fill is distinct from every other (no two hues the same colour)", (theme) => {
    const fills = SUBJECT_HUES.map((h) => h[theme].fill);
    expect(new Set(fills).size).toBe(12);
    expect(new Set(SUBJECT_HUES.map((h) => h[theme].strong)).size).toBe(12);
  });

  it.each(THEME_NAMES)("%s: the ink is at least 9:1 on every light fill (6.5:1 on dark, the mockup's own values), and the bar's amount (ink at 78% light, 86% dark) at least 5.2:1", (theme) => {
    const ink = CHROME[theme].foreground!;
    for (const h of SUBJECT_HUES) {
      const fill = h[theme].fill;
      expect(contrast(ink, fill), `${h.name} ink`).toBeGreaterThanOrEqual(theme === "light" ? 9 : 6.5);
      expect(contrast(composite(ink, fill, BAR_SECONDARY_OPACITY[theme]), fill), `${h.name} amount`).toBeGreaterThanOrEqual(5.2);
    }
  });

  it.each(THEME_NAMES)("%s: the strong tone reads against its fill (3:1) and against the page and a card", (theme) => {
    for (const h of SUBJECT_HUES) {
      const { fill, strong } = h[theme];
      expect(contrast(strong, fill), `${h.name} on fill`).toBeGreaterThanOrEqual(AA_UI);
    }
  });

  it.each(THEME_NAMES)("%s: every step's label meets AA on its swatch", (theme) => {
    const all = swatches(theme);
    expect(all).toHaveLength(SUBJECT_COUNT * STEP_NAMES.length);
    expect(all.filter((s) => contrast(s.label, s.color) < AA_TEXT).map((s) => `${s.subject}/${s.step}`)).toEqual([]);
  });

  it.each(THEME_NAMES)("%s: a subject's child steps stay apart from each other", (theme) => {
    for (let i = 1; i <= SUBJECT_COUNT; i++) {
      const c = (step: string) => swatches(theme).find((s) => s.subject === i && s.step === step)!.color;
      expect(c("light")).not.toBe(c("base"));
      expect(c("dark")).not.toBe(c("base"));
    }
  });

  it("the twelve swatches each keep one distinct hue (the recorded mapping), the new four in slots 9-12", () => {
    expect(PALETTE).toHaveLength(12);
    expect(Object.keys(SWATCH_TO_HUE).sort()).toEqual([...PALETTE].sort());
    expect(new Set(Object.values(SWATCH_TO_HUE)).size).toBe(12);
    expect(PALETTE.slice(8).map((c) => SWATCH_SLOTS[c])).toEqual([9, 10, 11, 12]);
    for (const c of PALETTE) expect(PALETTE_NAMES[c], c).toBeTruthy();
    for (const [hex, hue] of Object.entries(SWATCH_TO_HUE)) expect(SUBJECT_HUES[SWATCH_SLOTS[hex]! - 1]!.name).toBe(hue);
  });

  it("mix() is a straight sRGB blend", () => {
    expect(mix("#000000", "#FFFFFF", 0.5)).toBe("#808080");
    expect(composite("#FFFFFF", "#000000", 1)).toBe("#FFFFFF");
  });
});

describe("S10-11: nextUnusedColor", () => {
  it("finds every unused colour in order, and only cycles once all twelve are used", () => {
    const used: string[] = [];
    for (let i = 0; i < 12; i++) {
      const next = nextUnusedColor(used);
      expect(used).not.toContain(next);
      used.push(next);
    }
    expect(new Set(used.map(slotOfColor)).size).toBe(12);
    expect(PALETTE).toContain(nextUnusedColor(used));
  });

  it("skips colours already taken in any case, and treats null as no colour", () => {
    expect(nextUnusedColor([PALETTE[0]!.toUpperCase(), null])).toBe(PALETTE[1]);
    expect(nextUnusedColor(PALETTE.slice(0, 11))).toBe(PALETTE[11]);
  });

  it("a colour that is not a swatch is still drawn as the nearest of the first eight (no family's colour changes hue)", () => {
    expect(slotOfColor("#5c8a2f")).toBe(3); // the old demo Art green stays mint, not leaf
    expect(slotOfColor("#4a8a3a")).toBe(10); // the leaf swatch itself
  });
});

describe("chrome colours", () => {
  it.each(THEME_NAMES)("%s: every text pair meets WCAG AA", (theme) => {
    const c = CHROME[theme];
    const failures = CHROME_TEXT_PAIRS.map(([fg, bg]) => ({ pair: `${fg} on ${bg}`, ratio: contrast(c[fg]!, c[bg]!) })).filter((r) => r.ratio < AA_TEXT);
    expect(failures).toEqual([]);
  });

  it.each(THEME_NAMES)("%s: field borders, the focus ring and the today line read against the card (3:1)", (theme) => {
    const c = CHROME[theme];
    for (const n of ["input", "ring", "today"]) expect(contrast(c[n]!, c.card!), n).toBeGreaterThanOrEqual(AA_UI);
  });

  it("matches the mockup's page, card, ink, secondary, accent and hairline", () => {
    expect(CHROME.light).toMatchObject({ background: "#FAF6EE", card: "#FFFDF8", foreground: "#2F2A24", "muted-foreground": "#6E655A", primary: "#3F6B5C", border: "#E8E0D2" });
    expect(CHROME.dark).toMatchObject({ background: "#1C1A17", card: "#26231F", foreground: "#F1EBE1", primary: "#9CCBB8" });
  });

  it("both themes define the same names", () => {
    expect(Object.keys(CHROME.dark)).toEqual(Object.keys(CHROME.light));
  });
});

describe("generated CSS", () => {
  const css = renderTokensCss();
  const block = (selector: string) => {
    const start = css.indexOf(`${selector} {`);
    expect(start).toBeGreaterThanOrEqual(0);
    return css.slice(start, css.indexOf("\n}", start));
  };
  const names = (text: string) => [...text.matchAll(/^\s+(--tl-[\w-]+):/gm)].map((m) => m[1]!);

  it("tokens.css and tokens.theme.css match the script (run `npm run tokens -w @hh/web` after changing it)", () => {
    expect(styles("tokens.css")).toBe(renderTokensCss());
    expect(styles("tokens.theme.css")).toBe(renderThemeCss());
  });

  it("light is on :root; dark is [data-theme=dark] and the device's dark setting unless Light was chosen", () => {
    expect(css).toMatch(/^:root \{$/m);
    expect(css).toMatch(/^\[data-theme="dark"\] \{$/m);
    expect(css).toContain("@media (prefers-color-scheme: dark) {\n  :root:not([data-theme=\"light\"]) {");
  });

  it("the dark blocks redefine every colour the light block does", () => {
    const colours = (text: string) => names(text).filter((n) => !/radius|font|text-|numeric|rule|motion|bar-|shadow/.test(n));
    const light = colours(block(":root"));
    expect(colours(block('[data-theme="dark"]'))).toEqual(light);
    expect(colours(css.slice(css.indexOf("@media")))).toEqual(light);
    expect(light).toContain("--tl-subject-8-strong");
    expect(light).toContain("--tl-subject-12-strong");
    expect(light).toContain("--tl-subject-12-dark-label");
  });

  it("every colour is a hex value (so tests and screens can read them)", () => {
    for (const m of css.matchAll(/^\s+--tl-(?:[a-z0-9-]+): (#[0-9A-F]{6});$/gm)) expect(m[1]).toMatch(/^#[0-9A-F]{6}$/);
  });

  it("type sizes are 12 / 14 / 20 px, tabular numbers, 14 / 12 px radii, and the fonts are bundled", () => {
    for (const v of ["--tl-text-sm: 12px", "--tl-text-md: 14px", "--tl-text-lg: 20px", "--tl-numeric: tabular-nums", "--tl-radius: 14px", "--tl-radius-bar: 12px"]) expect(css).toContain(v);
    expect(css).toContain("Nunito Sans Variable");
    expect(css).toContain("Fraunces Variable");
    const entry = styles("tailwind.css");
    expect(entry).toContain("@fontsource-variable/fraunces");
    expect(entry).toContain("@fontsource-variable/nunito-sans");
    expect(entry).not.toMatch(/https?:\/\//);
  });

  it("uses only --tl-* names", () => {
    const declared = [...css.matchAll(/^\s+(--[\w-]+):/gm)].map((m) => m[1]!);
    expect(declared.every((n) => n.startsWith("--tl-"))).toBe(true);
  });

  it("Tailwind maps every token, and opacity modifiers still work", async () => {
    const theme = renderThemeCss();
    for (const n of ["subject-1", "subject-8-light", "subject-12", "subject-12-pastel", "subject-8-dark-label", "subject-7-pastel", "subject-3-strong", "muted-foreground", "primary-soft"]) {
      expect(theme).toContain(`--color-${n}: var(--tl-${n});`);
    }
    const tw = await compile(`${theme}\n@tailwind utilities;`, { base: process.cwd() });
    const out = tw.build(["bg-subject-1/50", "bg-subject-2-pastel", "text-subject-3-label", "border-subject-4-strong"]);
    expect(out).toContain("color-mix(in oklab, var(--tl-subject-1) 50%, transparent)");
    expect(out).toContain("background-color: var(--tl-subject-2-pastel)");
    expect(out).toContain("color: var(--tl-subject-3-label)");
  });
});
