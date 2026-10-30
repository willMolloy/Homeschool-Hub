// T-01 / T-01b: the generated timeline tokens. Colour maths only; nothing renders.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { compile } from "tailwindcss";
import { converter, displayable } from "culori";
import { describe, expect, it } from "vitest";
import {
  AA_TEXT, BAR_OPACITY, CHROME, CVD_MIN_DISTANCE_AT_BAR_OPACITY, composite, CHROME_TEXT_PAIRS, CVD_MIN_DISTANCE, DEFAULT_PALETTE, LABEL_INK, LABEL_PAPER, PALETTE_NAMES, REFERENCE_PALETTES,
  SAFE_AA_NUDGE, STEP_NAMES, SUBJECT_COUNT, THEME_NAMES, VISION, VIVID, baseColors, safeDesignBase, contrast, minPairwiseDistance, pastel, renderThemeCss,
  renderTokensCss, swatches, vividChroma, vividHues,
} from "../scripts/palette";

const toRgb = converter("rgb");
const styles = (name: string) => readFileSync(join(dirname(fileURLToPath(import.meta.url)), "../src/styles", name), "utf8");
/** Inside sRGB, allowing for the 4-decimal rounding of the emitted values. */
const inGamut = (c: Parameters<typeof toRgb>[0]) => {
  const rgb = toRgb(c);
  return rgb !== undefined && [rgb.r, rgb.g, rgb.b].every((ch) => ch > -1e-3 && ch < 1 + 1e-3);
};
const COMBOS = PALETTE_NAMES.flatMap((p) => THEME_NAMES.map((t) => [p, t] as const));
const SIMULATED = Object.entries(VISION).filter(([name]) => name !== "normal");

describe("safe palette (the default)", () => {
  it("is the default", () => expect(DEFAULT_PALETTE).toBe("safe"));

  it("starts from Okabe–Ito's seven colours, then adds three", () => {
    const ref = REFERENCE_PALETTES["Okabe–Ito"]!.slice(0, 7);
    const ours = safeDesignBase().slice(0, 7);
    // Lightness may be nudged by at most 0.01 (to keep child steps readable); hue is unchanged.
    ours.forEach((c, i) => {
      const r = converter("oklch")(ref[i]!)!;
      expect(Math.abs(c.l - r.l)).toBeLessThanOrEqual(0.0101);
      expect(Math.abs((c.h ?? 0) - (r.h ?? 0))).toBeLessThan(0.5);
    });
    expect(baseColors("safe", "light")).toHaveLength(SUBJECT_COUNT);
  });

  it.each(THEME_NAMES)("%s: no two subjects get the same lightness band, so they differ in more than hue", (theme) => {
    const ls = baseColors("safe", theme).map((c) => c.l);
    expect(Math.max(...ls) - Math.min(...ls)).toBeGreaterThan(0.3);
  });

  it.each(THEME_NAMES.flatMap((t) => SIMULATED.map(([v, sim]) => [t, v, sim] as const)))(
    `%s, %s: every pair of subjects stays at least ${CVD_MIN_DISTANCE} apart (OKLab)`,
    (theme, _v, sim) => {
      expect(minPairwiseDistance(baseColors("safe", theme), sim)).toBeGreaterThanOrEqual(CVD_MIN_DISTANCE);
    },
  );

  it.each(THEME_NAMES)(`%s: normal vision is at least ${CVD_MIN_DISTANCE} apart too`, (theme) => {
    expect(minPairwiseDistance(baseColors("safe", theme))).toBeGreaterThanOrEqual(CVD_MIN_DISTANCE);
  });

  it("is at least as far apart as the vivid set under every simulation", () => {
    for (const [, sim] of SIMULATED) {
      for (const t of THEME_NAMES) expect(minPairwiseDistance(baseColors("safe", t), sim)).toBeGreaterThan(minPairwiseDistance(baseColors("vivid", t), sim));
    }
  });

  it("child steps sit 0.07 lighter and darker, same hue, apart from the T-11c AA nudges", () => {
    for (const t of THEME_NAMES) {
      const base = safeDesignBase();
      for (const s of swatches("safe", t)) {
        const b = base[s.subject - 1]!;
        const nudge = SAFE_AA_NUDGE[t][`${s.subject}/${s.step}`] ?? 0;
        expect(s.color.h).toBeCloseTo(b.h ?? 0, 1);
        expect(s.color.l).toBeCloseTo(b.l + (s.step === "light" ? 0.07 : s.step === "dark" ? -0.07 : 0) + nudge, 3);
      }
    }
  });

  it("T-11c nudges stay small, and every child's steps stay in order at least 0.042 apart", () => {
    for (const t of THEME_NAMES) {
      for (const n of Object.values(SAFE_AA_NUDGE[t])) expect(Math.abs(n)).toBeLessThanOrEqual(0.05);
      const all = swatches("safe", t);
      for (let i = 1; i <= SUBJECT_COUNT; i++) {
        const l = (step: string) => all.find((s) => s.subject === i && s.step === step)!.color.l;
        expect(l("light") - l("base")).toBeGreaterThanOrEqual(0.042 - 1e-4);
        expect(l("base") - l("dark")).toBeGreaterThanOrEqual(0.042 - 1e-4);
      }
    }
  });
});

describe("vivid palette (opt-in, the T-01 hues)", () => {
  it("has 10 hues spaced evenly around the wheel", () => {
    const h = vividHues();
    expect(h).toHaveLength(SUBJECT_COUNT);
    for (let i = 1; i < h.length; i++) expect((h[i]! - h[i - 1]! + 360) % 360).toBeCloseTo(360 / SUBJECT_COUNT, 5);
  });

  it.each(THEME_NAMES)("%s: base swatches share one lightness and one chroma; steps keep the hue", (theme) => {
    const all = swatches("vivid", theme);
    const base = all.filter((s) => s.step === "base");
    expect(new Set(base.map((s) => s.color.l))).toEqual(new Set([VIVID[theme].steps.base]));
    expect(new Set(base.map((s) => s.color.c))).toEqual(new Set([vividChroma(theme)]));
    for (const s of all) {
      expect(s.color.h).toBe(vividHues()[s.subject - 1]);
      expect(s.color.l).toBe(VIVID[theme].steps[s.step]);
    }
  });

  it.each(THEME_NAMES)("%s: hues stay distinguishable for normal vision (regression floor)", (theme) => {
    expect(minPairwiseDistance(baseColors("vivid", theme))).toBeGreaterThan(0.04);
  });
});

describe.each(COMBOS)("%s palette, %s theme", (palette, theme) => {
  const all = swatches(palette, theme);

  it(`has ${SUBJECT_COUNT} subjects × ${STEP_NAMES.length} steps, all inside sRGB`, () => {
    expect(all).toHaveLength(SUBJECT_COUNT * STEP_NAMES.length);
    expect(all.filter((s) => !inGamut(s.color)).map((s) => `${s.subject}/${s.step}`)).toEqual([]);
  });

  it("each swatch's label colour is the better of ink and paper, and meets WCAG AA (4.5:1)", () => {
    const failures = all.filter((s) => contrast(s.label, s.color) < AA_TEXT).map((s) => `${s.subject}/${s.step}`);
    expect(failures).toEqual([]);
    for (const s of all) expect([LABEL_INK, LABEL_PAPER]).toContainEqual(s.label);
  });

  it("pastel tints keep the subject's hue, and body text on them meets WCAG AA", () => {
    const fg = CHROME[theme].foreground!;
    baseColors(palette, theme).forEach((b) => {
      const p = pastel(b, theme);
      expect(inGamut(p)).toBe(true);
      if (b.c > 0.02) expect(p.h).toBeCloseTo(b.h ?? 0, 1);
      expect(contrast(fg, p)).toBeGreaterThanOrEqual(AA_TEXT);
      expect(contrast(CHROME[theme]["muted-foreground"]!, p)).toBeGreaterThanOrEqual(AA_TEXT);
    });
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

  it("the reference palettes run through every vision simulation", () => {
    for (const sim of Object.values(VISION)) for (const ref of Object.values(REFERENCE_PALETTES)) expect(minPairwiseDistance(ref, sim)).toBeGreaterThan(0);
  });
});

describe("generated CSS", () => {
  const css = renderTokensCss();
  const block = (selector: string) => {
    const start = css.indexOf(`${selector} {`);
    expect(start).toBeGreaterThanOrEqual(0);
    return css.slice(start, css.indexOf("}", start));
  };
  const names = (text: string) => [...text.matchAll(/^\s+(--tl-subject-[\w-]+):/gm)].map((m) => m[1]!).sort();

  it("tokens.css and tokens.theme.css match the script (run `npm run tokens -w @hh/web` after changing it)", () => {
    expect(styles("tokens.css")).toBe(renderTokensCss());
    expect(styles("tokens.theme.css")).toBe(renderThemeCss());
  });

  it("safe is on :root; dark and vivid are opt-in attributes; nothing follows the OS setting", () => {
    expect(css).toMatch(/^:root \{$/m);
    expect(css).toMatch(/^\[data-theme="dark"\] \{$/m);
    expect(css).toMatch(/^\[data-palette="vivid"\] \{$/m);
    expect(css).toContain('[data-theme="dark"][data-palette="vivid"],\n[data-theme="dark"] [data-palette="vivid"],\n[data-palette="vivid"] [data-theme="dark"] {');
    expect(css).not.toMatch(/prefers-color-scheme/);
  });

  it("every palette block declares the same subject token names, so components don't change", () => {
    const root = names(block(":root"));
    expect(root).toHaveLength(SUBJECT_COUNT * (STEP_NAMES.length * 2 + 1)); // swatch + label per step, plus a pastel
    for (const sel of ['[data-theme="dark"]', '[data-palette="vivid"]', '[data-palette="vivid"] [data-theme="dark"]']) expect(names(block(sel))).toEqual(root);
    expect(root).toContain("--tl-subject-10-pastel");
    expect(root).toContain("--tl-subject-10-dark-label");
  });

  it("the vivid blocks only override subject colours (chrome stays per theme)", () => {
    for (const sel of ['[data-palette="vivid"]', '[data-palette="vivid"] [data-theme="dark"]']) {
      const decls = [...block(sel).matchAll(/^\s+(--[\w-]+):/gm)].map((m) => m[1]!);
      expect(decls.every((n) => n.startsWith("--tl-subject-"))).toBe(true);
    }
  });

  it("type sizes are 12 / 14 / 20 px with tabular numbers", () => {
    for (const v of ["--tl-text-sm: 12px", "--tl-text-md: 14px", "--tl-text-lg: 20px", "--tl-numeric: tabular-nums"]) expect(css).toContain(v);
  });

  it("does not reuse the existing app's variable names", () => {
    // styles.css owns --muted (a text colour), --line, --danger…; everything new is --tl-*.
    const declared = [...css.matchAll(/^\s+(--[\w-]+):/gm)].map((m) => m[1]!);
    expect(declared.every((n) => n.startsWith("--tl-"))).toBe(true);
  });

  it("Tailwind maps every token, and opacity modifiers still work (semi-transparent bars)", async () => {
    const theme = renderThemeCss();
    for (const n of ["subject-1", "subject-10-light", "subject-10-dark-label", "subject-7-pastel", "muted-foreground", "hatch"]) {
      expect(theme).toContain(`--color-${n}: var(--tl-${n});`);
    }
    const tw = await compile(`${theme}\n@tailwind utilities;`, { base: process.cwd() });
    const out = tw.build(["bg-subject-1/50", "fill-subject-4/40", "bg-subject-2-pastel", "text-subject-3-label"]);
    expect(out).toContain("color-mix(in oklab, var(--tl-subject-1) 50%, transparent)");
    expect(out).toContain("color-mix(in oklab, var(--tl-subject-4) 40%, transparent)");
    expect(out).toContain("background-color: var(--tl-subject-2-pastel)");
    expect(out).toContain("color: var(--tl-subject-3-label)");
  });
});

describe("bar opacity (T-03: one token, a bit more transparent)", () => {
  const backgrounds = (t: (typeof THEME_NAMES)[number]) => [CHROME[t].background!, CHROME[t].card!];

  it("is one token on :root, halfway from T-03's 0.82 to opaque (T-08c)", () => {
    expect(BAR_OPACITY).toBe(0.91);
    expect(BAR_OPACITY).toBeCloseTo((0.82 + 1) / 2, 6);
    const css = renderTokensCss();
    expect(css.match(/--tl-bar-opacity:/g)).toHaveLength(1);
    expect(css.slice(0, css.indexOf("}"))).toContain(`--tl-bar-opacity: ${BAR_OPACITY};`);
    expect(styles("tokens.css")).toContain(`--tl-bar-opacity: ${BAR_OPACITY};`);
  });

  it.each(THEME_NAMES.flatMap((t) => Object.entries(VISION).map(([v, sim]) => [t, v, sim] as const)))(
    `safe, %s, %s: bars as drawn stay at least ${CVD_MIN_DISTANCE_AT_BAR_OPACITY} apart on the page and on cards`,
    (theme, _v, sim) => {
      for (const bg of backgrounds(theme)) {
        const drawn = baseColors("safe", theme).map((c) => composite(c, bg, BAR_OPACITY));
        expect(minPairwiseDistance(drawn, sim)).toBeGreaterThanOrEqual(CVD_MIN_DISTANCE_AT_BAR_OPACITY);
      }
    },
  );

  it("as drawn, the safe set stays within 0.01 of Okabe–Ito's own seven colours at the same opacity", () => {
    for (const t of THEME_NAMES) {
      const bg = CHROME[t].background!;
      for (const [, sim] of Object.entries(VISION)) {
        const ours = minPairwiseDistance(baseColors("safe", t).map((c) => composite(c, bg, BAR_OPACITY)), sim);
        const oi = minPairwiseDistance(REFERENCE_PALETTES["Okabe–Ito"]!.slice(0, 7).map((c) => composite(c, bg, BAR_OPACITY)), sim);
        expect(ours).toBeGreaterThan(oi - 0.01);
      }
    }
  });

  it("every label meets AA on its bar as drawn, over the page and over cards, in every palette and theme (T-11c: no patch)", () => {
    const checked: string[] = [];
    const failures: string[] = [];
    for (const [p, t] of COMBOS) {
      for (const bg of backgrounds(t)) {
        for (const s of swatches(p, t)) {
          checked.push(`${p}/${t}/${s.subject}/${s.step}`);
          if (contrast(s.label, composite(s.color, bg, BAR_OPACITY)) < AA_TEXT) failures.push(`${p}/${t}/${s.subject}/${s.step}`);
        }
      }
    }
    expect(checked).toHaveLength(240);
    expect(failures).toEqual([]);
  });

  it("selected bars draw at opacity 1, where every label meets AA too", () => {
    for (const [p, t] of COMBOS) for (const s of swatches(p, t)) expect(contrast(s.label, s.color)).toBeGreaterThanOrEqual(AA_TEXT);
  });
});
