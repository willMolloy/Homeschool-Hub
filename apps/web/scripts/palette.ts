// Generates the timeline design tokens (T-01, T-01b): two 10-subject palettes with per-child
// steps, pastel tints, contrast-aware label colours and light and dark chrome colours, written
// as plain CSS variables to src/styles/tokens.css (read by the SVG timeline) and a Tailwind v4
// `@theme inline` map to src/styles/tokens.theme.css (read by the chrome).
// Run with `npm run tokens -w @hh/web`.
//   - "safe" (the default): Okabe–Ito plus three extra colours, with lightness varied by subject
//     so lanes stay apart under protan, deutan and tritan simulation.
//   - "vivid" (opt-in, data-palette="vivid"): the T-01 hues, fixed lightness and chroma.
// culori is a dev-only dependency: nothing here ships to the browser, only the CSS it writes.
import { clampChroma, converter, displayable, filterDeficiencyDeuter, filterDeficiencyProt, filterDeficiencyTrit, differenceEuclidean, wcagContrast, type Color, type Oklch } from "culori";

export type ThemeName = "light" | "dark";
export type PaletteName = "safe" | "vivid";
export type StepName = "base" | "light" | "dark";

export const THEME_NAMES: readonly ThemeName[] = ["light", "dark"];
export const PALETTE_NAMES: readonly PaletteName[] = ["safe", "vivid"];
export const DEFAULT_PALETTE: PaletteName = "safe";
export const SUBJECT_COUNT = 10;
export const STEP_NAMES: readonly StepName[] = ["base", "light", "dark"];
export const AA_TEXT = 4.5;
/** The safe palette's floor: smallest OKLab distance between any two subjects under every vision simulation. Okabe–Ito itself is 0.086. */
export const CVD_MIN_DISTANCE = 0.08;
/**
 * Bars are semi-transparent (agreed), emitted as the one token `--tl-bar-opacity`. 0.82 is 18 points
 * below the prototype's opaque bars (DeeDee asked for a bit more transparency; product owner approved
 * 0.82 as the starting value, 2026-10-28).
 */
export const BAR_OPACITY = 0.82;
/**
 * The floor for bars as seen on the page (composited at BAR_OPACITY). Transparency pulls every colour
 * toward the background, so distances shrink: Okabe–Ito's own seven colours fall from 0.086 to 0.069.
 */
export const CVD_MIN_DISTANCE_AT_BAR_OPACITY = 0.065;

const oklch = (l: number, c: number, h: number): Oklch => ({ mode: "oklch", l, c, h });
const toOklch = converter("oklch");
const toRgb = converter("rgb");

/** A colour drawn at `opacity` over `bg`, as the browser blends it (in sRGB). */
export function composite(color: Color | string, bg: Color | string, opacity: number): Oklch {
  const c = toRgb(color);
  const b = toRgb(bg);
  if (!c || !b) throw new Error("Not a colour");
  const mix = (x: number, y: number) => x * opacity + y * (1 - opacity);
  return toOklch({ mode: "rgb", r: mix(c.r, b.r), g: mix(c.g, b.g), b: mix(c.b, b.b) }) as Oklch;
}

/** The two label colours; each swatch takes whichever contrasts more with it. */
export const LABEL_INK = oklch(0.2, 0.01, 260);
export const LABEL_PAPER = oklch(0.985, 0.002, 250);

/** How far the lighter and darker child steps sit from the subject's base lightness. */
const SAFE_STEP = 0.07;

/**
 * Safe palette, subjects 1–7: Okabe–Ito's seven colours (black left out: it disappears on the
 * dark theme), each nudged in lightness only where a ±SAFE_STEP child step would otherwise fall
 * where neither label colour reaches 4.5:1. Subjects 8–10 were chosen by a search over sRGB
 * (lightness 0.45–0.90) for the colour farthest from all the others under every simulation.
 */
const OKABE_ITO_BASE: ReadonlyArray<{ hex: string; name: string; dL: number }> = [
  { hex: "#E69F00", name: "orange", dL: 0 },
  { hex: "#56B4E9", name: "sky blue", dL: 0 },
  { hex: "#009E73", name: "bluish green", dL: -0.01 },
  { hex: "#F0E442", name: "yellow", dL: 0 },
  { hex: "#0072B2", name: "blue", dL: 0 },
  { hex: "#D55E00", name: "vermillion", dL: 0 },
  { hex: "#CC79A7", name: "reddish purple", dL: 0.01 },
];
const SAFE_EXTRAS: readonly Oklch[] = [oklch(0.45, 0.18, 0), oklch(0.89, 0.12, 188), oklch(0.63, 0.24, 304)];

function safeBase(): Oklch[] {
  const oi = OKABE_ITO_BASE.map(({ hex, dL }) => {
    const c = toOklch(hex);
    if (!c) throw new Error(`Bad colour ${hex}`);
    return roundOklch(clampChroma({ ...c, l: c.l + dL }, "oklch") as Oklch);
  });
  return [...oi, ...SAFE_EXTRAS];
}

/** Vivid palette (T-01): fixed lightness and chroma, hue evenly spaced, steps per theme. */
export const VIVID_HUE_START = 25;
export const VIVID: Record<ThemeName, { steps: Record<StepName, number>; maxChroma: number }> = {
  light: { steps: { base: 0.8, light: 0.87, dark: 0.73 }, maxChroma: 0.15 },
  dark: { steps: { base: 0.45, light: 0.52, dark: 0.38 }, maxChroma: 0.15 },
};

export const vividHues = (): number[] =>
  Array.from({ length: SUBJECT_COUNT }, (_, i) => round((VIVID_HUE_START + (i * 360) / SUBJECT_COUNT) % 360, 2));

/** Largest chroma that keeps oklch(l, c, h) inside sRGB, to 0.001. */
export function maxChromaInGamut(l: number, h: number): number {
  let lo = 0;
  let hi = 0.4;
  while (hi - lo > 0.0005) {
    const mid = (lo + hi) / 2;
    if (displayable(oklch(l, mid, h))) lo = mid;
    else hi = mid;
  }
  return Math.floor(lo * 1000) / 1000;
}

/** The one chroma every vivid hue can reach at the theme's base lightness. */
export function vividChroma(theme: ThemeName): number {
  const spec = VIVID[theme];
  return Math.min(spec.maxChroma, ...vividHues().map((h) => maxChromaInGamut(spec.steps.base, h)));
}

/** The base colour of every subject, 1–10, for a palette and theme. */
export function baseColors(palette: PaletteName, theme: ThemeName): Oklch[] {
  if (palette === "safe") return safeBase(); // the same colours on light and dark: separation doesn't depend on the background
  const c = vividChroma(theme);
  return vividHues().map((h) => oklch(VIVID[theme].steps.base, c, h));
}

function stepLightness(palette: PaletteName, theme: ThemeName, base: Oklch, step: StepName): number {
  if (palette === "vivid") return VIVID[theme].steps[step];
  return base.l + (step === "light" ? SAFE_STEP : step === "dark" ? -SAFE_STEP : 0);
}

/** Pastel tints (T-01b, for the This Week screens): the subject's hue, very light (or very deep in dark). */
export const PASTEL: Record<ThemeName, { l: number; c: number }> = {
  light: { l: 0.95, c: 0.035 },
  dark: { l: 0.32, c: 0.035 },
};

export const pastel = (base: Oklch, theme: ThemeName): Oklch =>
  roundOklch(clampChroma(oklch(PASTEL[theme].l, Math.min(PASTEL[theme].c, base.c), base.h ?? 0), "oklch") as Oklch);

/** Text colour for a swatch: whichever label colour contrasts more. */
export const labelFor = (bg: Oklch): Oklch => (contrast(LABEL_INK, bg) >= contrast(LABEL_PAPER, bg) ? LABEL_INK : LABEL_PAPER);

/** Chrome colours (the shadcn/ui semantic set plus timeline extras), as foreground/background pairs where text sits on them. */
export const CHROME: Record<ThemeName, Record<string, Oklch>> = {
  light: {
    background: oklch(0.975, 0.003, 250),
    foreground: oklch(0.22, 0.01, 260),
    card: oklch(1, 0, 0),
    "card-foreground": oklch(0.22, 0.01, 260),
    popover: oklch(1, 0, 0),
    "popover-foreground": oklch(0.22, 0.01, 260),
    primary: oklch(0.36, 0.07, 255),
    "primary-foreground": oklch(0.985, 0.002, 250),
    secondary: oklch(0.94, 0.006, 250),
    "secondary-foreground": oklch(0.25, 0.01, 260),
    muted: oklch(0.94, 0.006, 250),
    "muted-foreground": oklch(0.47, 0.02, 255),
    accent: oklch(0.93, 0.012, 250),
    "accent-foreground": oklch(0.25, 0.01, 260),
    destructive: oklch(0.48, 0.17, 27),
    "destructive-foreground": oklch(0.985, 0.002, 250),
    border: oklch(0.9, 0.008, 250),
    input: oklch(0.86, 0.01, 250),
    ring: oklch(0.77, 0.16, 75),
    grid: oklch(0.9, 0.008, 250),
    today: oklch(0.55, 0.2, 27),
    hatch: oklch(0.82, 0.008, 250),
    total: oklch(0.74, 0.008, 250),
  },
  dark: {
    background: oklch(0.2, 0.01, 260),
    foreground: oklch(0.95, 0.005, 85),
    card: oklch(0.24, 0.01, 260),
    "card-foreground": oklch(0.95, 0.005, 85),
    popover: oklch(0.24, 0.01, 260),
    "popover-foreground": oklch(0.95, 0.005, 85),
    primary: oklch(0.8, 0.08, 250),
    "primary-foreground": oklch(0.2, 0.02, 260),
    secondary: oklch(0.3, 0.012, 260),
    "secondary-foreground": oklch(0.95, 0.005, 85),
    muted: oklch(0.3, 0.012, 260),
    "muted-foreground": oklch(0.75, 0.015, 255),
    accent: oklch(0.32, 0.015, 260),
    "accent-foreground": oklch(0.95, 0.005, 85),
    destructive: oklch(0.7, 0.16, 25),
    "destructive-foreground": oklch(0.2, 0.01, 260),
    border: oklch(0.34, 0.012, 260),
    input: oklch(0.4, 0.012, 260),
    ring: oklch(0.8, 0.15, 80),
    grid: oklch(0.32, 0.012, 260),
    today: oklch(0.72, 0.17, 25),
    hatch: oklch(0.38, 0.012, 260),
    total: oklch(0.56, 0.01, 260),
  },
};

/** Text/background pairs in CHROME that must meet WCAG AA for body text. */
export const CHROME_TEXT_PAIRS: ReadonlyArray<readonly [fg: string, bg: string]> = [
  ["foreground", "background"],
  ["card-foreground", "card"],
  ["popover-foreground", "popover"],
  ["primary-foreground", "primary"],
  ["secondary-foreground", "secondary"],
  ["muted-foreground", "muted"],
  ["muted-foreground", "background"],
  ["accent-foreground", "accent"],
  ["destructive-foreground", "destructive"],
  ["destructive", "background"],
];

/** Published reference palettes the subject palette is compared against. */
export const REFERENCE_PALETTES: Record<string, readonly string[]> = {
  "Okabe–Ito": ["#E69F00", "#56B4E9", "#009E73", "#F0E442", "#0072B2", "#D55E00", "#CC79A7", "#000000"],
  "Paul Tol bright": ["#4477AA", "#EE6677", "#228833", "#CCBB44", "#66CCEE", "#AA3377", "#BBBBBB"],
};

export interface Swatch {
  subject: number; // 1-based
  step: StepName;
  color: Oklch;
  label: Oklch;
}

/**
 * Every swatch for a palette and theme. A lighter or darker child step keeps the subject's hue
 * and chroma unless that hue can't reach it there, in which case chroma is reduced just enough
 * to stay in sRGB (hue and lightness never move).
 */
export function swatches(palette: PaletteName, theme: ThemeName): Swatch[] {
  return baseColors(palette, theme).flatMap((base, i) =>
    STEP_NAMES.map((step) => {
      const color = roundOklch(clampChroma(oklch(stepLightness(palette, theme, base, step), base.c, base.h ?? 0), "oklch") as Oklch);
      return { subject: i + 1, step, color, label: labelFor(color) };
    }),
  );
}

export const contrast = (a: Oklch | string, b: Oklch | string): number => wcagContrast(a, b);

/** Smallest OKLab distance between any two colours, optionally after a colour-vision-deficiency simulation. */
export function minPairwiseDistance(colors: ReadonlyArray<Oklch | string>, simulate?: Simulation): number {
  const diff = differenceEuclidean("oklab");
  const seen = colors.map((c) => {
    const parsed = toOklch(c);
    if (!parsed) throw new Error(`Not a colour: ${String(c)}`);
    return simulate ? simulate(parsed) : parsed;
  });
  let min = Infinity;
  for (let i = 0; i < seen.length; i++) for (let j = i + 1; j < seen.length; j++) min = Math.min(min, diff(seen[i]!, seen[j]!));
  return min;
}

type Simulation = (c: Color) => Color;

export const VISION: Record<string, Simulation | undefined> = {
  normal: undefined,
  deuteranopia: filterDeficiencyDeuter(1),
  protanopia: filterDeficiencyProt(1),
  tritanopia: filterDeficiencyTrit(1),
};

const round = (n: number, places: number): number => Math.round(n * 10 ** places) / 10 ** places;
const roundOklch = (c: Oklch): Oklch => oklch(round(c.l, 4), round(c.c, 4), round(c.h ?? 0, 2));
export const css = (c: Oklch): string => `oklch(${round(c.l, 4)} ${round(c.c, 4)} ${round(c.h ?? 0, 2)})`;

const swatchVar = (s: Pick<Swatch, "subject" | "step">): string => `subject-${s.subject}${s.step === "base" ? "" : `-${s.step}`}`;

/** The subject variables for one palette and theme. Both palettes declare the same names. */
function subjectLines(palette: PaletteName, theme: ThemeName): string[] {
  const lines: string[] = [];
  for (const s of swatches(palette, theme)) {
    lines.push(`  --tl-${swatchVar(s)}: ${css(s.color)};`, `  --tl-${swatchVar(s)}-label: ${css(s.label)};`);
  }
  baseColors(palette, theme).forEach((b, i) => lines.push(`  --tl-subject-${i + 1}-pastel: ${css(pastel(b, theme))};`));
  return lines;
}

const chromeLines = (theme: ThemeName): string[] => Object.entries(CHROME[theme]).map(([name, c]) => `  --tl-${name}: ${css(c)};`);

const HEADER = "/* Generated by apps/web/scripts/palette.ts (npm run tokens -w @hh/web). Do not edit by hand. */";

/** Selectors for the vivid palette on the dark theme, whichever element carries which attribute. */
const VIVID_DARK = '[data-theme="dark"][data-palette="vivid"],\n[data-theme="dark"] [data-palette="vivid"],\n[data-palette="vivid"] [data-theme="dark"]';

/**
 * Plain CSS variables. Light theme + safe palette on :root; [data-theme="dark"] and
 * [data-palette="vivid"] are opt-in attributes (src/lib/timelinePalette.ts sets the palette one).
 */
export function renderTokensCss(): string {
  return [
    HEADER,
    ":root {",
    ...chromeLines("light"),
    ...subjectLines("safe", "light"),
    "  --tl-font: system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif;",
    "  --tl-text-sm: 12px;",
    "  --tl-text-md: 14px;",
    "  --tl-text-lg: 20px;",
    "  --tl-numeric: tabular-nums;",
    "  --tl-radius: 0.5rem;",
    `  --tl-bar-opacity: ${BAR_OPACITY};`,
    "}",
    '[data-theme="dark"] {',
    ...chromeLines("dark"),
    ...subjectLines("safe", "dark"),
    "}",
    '[data-palette="vivid"] {',
    ...subjectLines("vivid", "light"),
    "}",
    `${VIVID_DARK} {`,
    ...subjectLines("vivid", "dark"),
    "}",
    "",
  ].join("\n");
}

/** Tailwind v4 theme map: utilities such as bg-subject-3-light, text-subject-3-light-label or bg-subject-3-pastel resolve to the --tl-* variables. */
export function renderThemeCss(): string {
  const subjects = swatches(DEFAULT_PALETTE, "light").flatMap((s) => [swatchVar(s), `${swatchVar(s)}-label`]);
  const pastels = Array.from({ length: SUBJECT_COUNT }, (_, i) => `subject-${i + 1}-pastel`);
  const colors = [...subjects, ...pastels, ...Object.keys(CHROME.light)];
  return [
    HEADER,
    "@theme inline {",
    ...colors.map((n) => `  --color-${n}: var(--tl-${n});`),
    "  --font-sans: var(--tl-font);",
    // Named sizes rather than remapping Tailwind's own scale, so text-sm keeps meaning what shadcn components expect.
    "  --text-label: var(--tl-text-sm);",
    "  --text-body: var(--tl-text-md);",
    "  --text-title: var(--tl-text-lg);",
    "  --radius-sm: calc(var(--tl-radius) - 4px);",
    "  --radius-md: calc(var(--tl-radius) - 2px);",
    "  --radius-lg: var(--tl-radius);",
    "}",
    "",
  ].join("\n");
}

const baseMin = (palette: PaletteName, theme: ThemeName, sim: Simulation | undefined): number => minPairwiseDistance(baseColors(palette, theme), sim);

/** A plain-text distinctness report: both palettes against the reference palettes, per vision type. */
export function renderReport(): string {
  const rows = Object.entries(VISION).map(([v, sim]) => {
    const ours = PALETTE_NAMES.flatMap((p) => THEME_NAMES.map((t) => `${p} ${t} ${baseMin(p, t, sim).toFixed(3)}`));
    const refs = Object.entries(REFERENCE_PALETTES).map(([k, pal]) => `${k} ${minPairwiseDistance(pal, sim).toFixed(3)}`);
    return `${v.padEnd(13)} ${[...ours, ...refs].join("  ")}`;
  });
  const bars = Object.entries(VISION).map(([v, sim]) => {
    const ours = THEME_NAMES.map((t) => `safe ${t} ${minPairwiseDistance(baseColors("safe", t).map((c) => composite(c, CHROME[t].background!, BAR_OPACITY)), sim).toFixed(3)}`);
    return `${v.padEnd(13)} ${ours.join("  ")}`;
  });
  return [
    "Smallest OKLab distance between any two subjects (higher = easier to tell apart):",
    ...rows,
    `As drawn, at --tl-bar-opacity ${BAR_OPACITY} over the page background:`,
    ...bars,
  ].join("\n");
}

async function main(): Promise<void> {
  const { writeFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const dir = fileURLToPath(new URL("../src/styles/", import.meta.url));
  writeFileSync(`${dir}tokens.css`, renderTokensCss());
  writeFileSync(`${dir}tokens.theme.css`, renderThemeCss());
  console.log(`Wrote ${dir}tokens.css and tokens.theme.css`);
  console.log(renderReport());
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) void main();
