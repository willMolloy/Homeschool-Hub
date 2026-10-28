// T-01: the generated timeline tokens. Colour maths only; nothing renders.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { converter, displayable } from "culori";
import { describe, expect, it } from "vitest";
import {
  AA_TEXT, CHROME, CHROME_TEXT_PAIRS, HUE_COUNT, REFERENCE_PALETTES, STEP_NAMES, THEMES, VISION,
  baseChroma, contrast, hues, minPairwiseDistance, renderThemeCss, renderTokensCss, swatches, type ThemeName,
} from "../scripts/palette";

const THEME_NAMES: ThemeName[] = ["light", "dark"];
const toRgb = converter("rgb");
const styles = (name: string) => readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/styles", name), "utf8");

describe("subject palette", () => {
  it("has 10 hues spaced evenly around the wheel", () => {
    const h = hues();
    expect(h).toHaveLength(HUE_COUNT);
    for (let i = 1; i < h.length; i++) expect((h[i]! - h[i - 1]! + 360) % 360).toBeCloseTo(360 / HUE_COUNT, 5);
  });

  it.each(THEME_NAMES)("%s: base swatches share one lightness and one chroma", (theme) => {
    const base = swatches(theme).filter((s) => s.step === "base");
    expect(base).toHaveLength(HUE_COUNT);
    expect(new Set(base.map((s) => s.color.l))).toEqual(new Set([THEMES[theme].steps.base]));
    expect(new Set(base.map((s) => s.color.c))).toEqual(new Set([baseChroma(theme)]));
    expect(baseChroma(theme)).toBeGreaterThan(0.05);
  });

  it.each(THEME_NAMES)("%s: each child step keeps its subject's hue at its own lightness", (theme) => {
    const all = swatches(theme);
    expect(all).toHaveLength(HUE_COUNT * STEP_NAMES.length);
    for (const s of all) {
      expect(s.color.h).toBe(hues()[s.subject - 1]);
      expect(s.color.l).toBe(THEMES[theme].steps[s.step]);
      expect(s.color.c).toBeLessThanOrEqual(baseChroma(theme));
    }
  });

  it.each(THEME_NAMES)("%s: every swatch is inside sRGB, so no browser has to gamut-map it", (theme) => {
    for (const s of swatches(theme)) {
      const rgb = toRgb(s.color);
      // The emitted values are rounded to 4 places; allow that much drift.
      for (const ch of [rgb.r, rgb.g, rgb.b]) {
        expect(ch).toBeGreaterThan(-1e-3);
        expect(ch).toBeLessThan(1 + 1e-3);
      }
    }
  });

  it.each(THEME_NAMES)("%s: the label colour meets WCAG AA (4.5:1) on every swatch", (theme) => {
    const label = THEMES[theme].label;
    const failures = swatches(theme)
      .map((s) => ({ s: `${s.subject}/${s.step}`, ratio: contrast(label, s.color) }))
      .filter((r) => r.ratio < AA_TEXT);
    expect(failures).toEqual([]);
  });

  it.each(THEME_NAMES)("%s: hues stay distinguishable for normal vision (regression floor)", (theme) => {
    const base = swatches(theme).filter((s) => s.step === "base").map((s) => s.color);
    expect(minPairwiseDistance(base)).toBeGreaterThan(0.04);
  });

  it("compares against Okabe–Ito and Paul Tol under every vision simulation", () => {
    // Reported, not gated: the Page fixes lightness, so colour-blind separation is lower than the
    // reference palettes by design and labels carry the meaning (see docs/progress/timeline.md).
    for (const sim of Object.values(VISION)) {
      for (const ref of Object.values(REFERENCE_PALETTES)) expect(minPairwiseDistance(ref, sim)).toBeGreaterThan(0);
    }
    expect(Object.keys(REFERENCE_PALETTES)).toEqual(["Okabe–Ito", "Paul Tol bright"]);
  });
});

describe("chrome colours", () => {
  it.each(THEME_NAMES)("%s: every text pair meets WCAG AA", (theme) => {
    const c = CHROME[theme];
    const failures = CHROME_TEXT_PAIRS.map(([fg, bg]) => ({ pair: `${fg} on ${bg}`, ratio: contrast(c[fg]!, c[bg]!) })).filter(
      (r) => r.ratio < AA_TEXT,
    );
    expect(failures).toEqual([]);
  });

  it("both themes define the same names, all displayable", () => {
    expect(Object.keys(CHROME.dark)).toEqual(Object.keys(CHROME.light));
    for (const t of THEME_NAMES) for (const v of Object.values(CHROME[t])) expect(displayable(v)).toBe(true);
  });
});

describe("generated CSS", () => {
  it("tokens.css and tokens.theme.css match the script (run `npm run tokens -w @hh/web` after changing it)", () => {
    expect(styles("tokens.css")).toBe(renderTokensCss());
    expect(styles("tokens.theme.css")).toBe(renderThemeCss());
  });

  it("light is on :root, dark is opt-in, and type sizes are 12 / 14 / 20 px with tabular numbers", () => {
    const css = renderTokensCss();
    expect(css).toMatch(/^:root \{$/m);
    expect(css).toMatch(/^\[data-theme="dark"\] \{$/m);
    expect(css).not.toMatch(/prefers-color-scheme/);
    for (const v of ["--tl-text-sm: 12px", "--tl-text-md: 14px", "--tl-text-lg: 20px", "--tl-numeric: tabular-nums"]) expect(css).toContain(v);
  });

  it("does not reuse the existing app's variable names", () => {
    // styles.css owns --muted (a text colour), --line, --danger…; everything new is --tl-*.
    const declared = [...renderTokensCss().matchAll(/^\s+(--[\w-]+):/gm)].map((m) => m[1]!);
    expect(declared.every((n) => n.startsWith("--tl-"))).toBe(true);
  });

  it("maps every swatch and chrome colour into Tailwind", () => {
    const theme = renderThemeCss();
    for (const n of ["subject-1", "subject-10-light", "subject-10-dark", "muted-foreground", "hatch"]) expect(theme).toContain(`--color-${n}: var(--tl-${n});`);
  });
});
