// Generates the timeline design tokens (T-01): a 10-hue OKLCH subject palette with per-child
// steps, plus light and dark chrome colours, written as plain CSS variables to
// src/styles/tokens.css (read by the SVG timeline) and a Tailwind v4 `@theme inline` map to
// src/styles/tokens.theme.css (read by the chrome). Run with `npm run tokens -w @hh/web`.
// culori is a dev-only dependency: nothing here ships to the browser, only the CSS it writes.
import { clampChroma, converter, displayable, filterDeficiencyDeuter, filterDeficiencyProt, filterDeficiencyTrit, differenceEuclidean, wcagContrast, type Color, type Oklch } from "culori";

export type ThemeName = "light" | "dark";
export type StepName = "base" | "light" | "dark";

/** Lightness of each per-child step, per theme. A child's sub-lane is one step of its subject's hue. */
interface ThemeSpec {
  steps: Record<StepName, number>;
  /** Text drawn on top of every subject swatch in this theme. */
  label: Oklch;
  maxChroma: number;
}

export const HUE_COUNT = 10;
/** First hue in degrees (a warm red); the rest are spaced 360 / HUE_COUNT apart. */
export const HUE_START = 25;
export const STEP_NAMES: readonly StepName[] = ["base", "light", "dark"];
export const AA_TEXT = 4.5;

const oklch = (l: number, c: number, h: number): Oklch => ({ mode: "oklch", l, c, h });

export const THEMES: Record<ThemeName, ThemeSpec> = {
  // Light theme: pale bars, near-black labels.
  light: { steps: { base: 0.8, light: 0.87, dark: 0.73 }, label: oklch(0.22, 0.01, 260), maxChroma: 0.15 },
  // Dark theme: deep bars, near-white labels.
  dark: { steps: { base: 0.45, light: 0.52, dark: 0.38 }, label: oklch(0.97, 0.005, 85), maxChroma: 0.15 },
};

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
}

export const hues = (): number[] => Array.from({ length: HUE_COUNT }, (_, i) => round((HUE_START + (i * 360) / HUE_COUNT) % 360, 2));

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

/** The one chroma every hue can reach at the theme's base lightness (so chroma is held fixed across hues). */
export function baseChroma(theme: ThemeName): number {
  const spec = THEMES[theme];
  return Math.min(spec.maxChroma, ...hues().map((h) => maxChromaInGamut(spec.steps.base, h)));
}

/**
 * Every swatch for a theme. Base swatches share lightness and chroma; the lighter and darker
 * child steps keep the same chroma unless a hue can't reach it there, in which case it is
 * reduced just enough to stay in sRGB (hue and lightness never move).
 */
export function swatches(theme: ThemeName): Swatch[] {
  const spec = THEMES[theme];
  const c = baseChroma(theme);
  return hues().flatMap((h, i) =>
    STEP_NAMES.map((step) => ({
      subject: i + 1,
      step,
      color: roundOklch(clampChroma(oklch(spec.steps[step], c, h), "oklch") as Oklch),
    })),
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
const toOklch = converter("oklch");

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

function themeBlock(theme: ThemeName): string[] {
  const lines = [`  --tl-subject-label: ${css(THEMES[theme].label)};`];
  for (const s of swatches(theme)) lines.push(`  --tl-${swatchVar(s)}: ${css(s.color)};`);
  for (const [name, c] of Object.entries(CHROME[theme])) lines.push(`  --tl-${name}: ${css(c)};`);
  return lines;
}

const HEADER = "/* Generated by apps/web/scripts/palette.ts (npm run tokens -w @hh/web). Do not edit by hand. */";

/** Plain CSS variables: light on :root, dark under [data-theme="dark"] (opt-in; nothing sets it yet). */
export function renderTokensCss(): string {
  return [
    HEADER,
    ":root {",
    ...themeBlock("light"),
    "  --tl-font: system-ui, -apple-system, \"Segoe UI\", Roboto, sans-serif;",
    "  --tl-text-sm: 12px;",
    "  --tl-text-md: 14px;",
    "  --tl-text-lg: 20px;",
    "  --tl-numeric: tabular-nums;",
    "  --tl-radius: 0.5rem;",
    "}",
    '[data-theme="dark"] {',
    ...themeBlock("dark"),
    "}",
    "",
  ].join("\n");
}

/** Tailwind v4 theme map: utilities such as bg-subject-3-light or text-muted-foreground resolve to the --tl-* variables. */
export function renderThemeCss(): string {
  const colors = [
    "subject-label",
    ...swatches("light").map(swatchVar),
    ...Object.keys(CHROME.light),
  ];
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

/** A plain-text distinctness report: our base hues against the reference palettes, per vision type. */
export function renderReport(): string {
  const rows = Object.keys(VISION).map((v) => {
    const sim = VISION[v];
    const ours = (["light", "dark"] as const).map((t) => minPairwiseDistance(swatches(t).filter((s) => s.step === "base").map((s) => s.color), sim).toFixed(3));
    const refs = Object.values(REFERENCE_PALETTES).map((p) => minPairwiseDistance(p, sim).toFixed(3));
    return `${v.padEnd(13)} ours light ${ours[0]}  ours dark ${ours[1]}  ${Object.keys(REFERENCE_PALETTES).map((k, i) => `${k} ${refs[i]}`).join("  ")}`;
  });
  return ["Smallest OKLab distance between any two hues (higher = easier to tell apart):", ...rows].join("\n");
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
