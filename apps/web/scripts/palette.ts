// Generates the Soft Paper design tokens (S8-01, which replaced the T-01 / T-01b palettes):
// plain CSS variables in src/styles/tokens.css (read by the SVG timeline and every screen) and a
// Tailwind v4 `@theme inline` map in src/styles/tokens.theme.css (read by the shadcn chrome).
// Run with `npm run tokens -w @hh/web`.
//   - Eight subject hues, each with a fill (14% toward its strong tone in light, 10% in dark), a strong
//     tone for rules, rings and badges, and a label colour (ink). Subjects are never told apart by colour
//     alone: every subject also has an icon (S8-11).
//   - Child steps (lighter / darker fill) for a subject drawn once per child on the Year timeline.
// culori is a dev-only dependency: nothing here ships to the browser, only the CSS it writes.
import { converter, formatHex, wcagContrast } from "culori";

export type ThemeName = "light" | "dark";
export type StepName = "base" | "light" | "dark";

export const THEME_NAMES: readonly ThemeName[] = ["light", "dark"];
export const STEP_NAMES: readonly StepName[] = ["base", "light", "dark"];
export const AA_TEXT = 4.5;
/** Strong tones and check rings against their fill (WCAG non-text contrast). */
export const AA_UI = 3;
/** Bars are solid: the pastel is already mixed toward the page, so no transparency is layered on top. */
export const BAR_OPACITY = 1;
/** S10-05 (mockup "Break band over bars"): the break band's fill opacity over the bars. */
export const WASH_OPACITY = { light: 0.72, dark: 0.5 } as const;
/** The bar's secondary text (the amount) is ink at this opacity; it must stay at 5.2:1 or better (dark fills are darker, so dark needs a little more ink). */
export const BAR_SECONDARY_OPACITY: Record<ThemeName, number> = { light: 0.78, dark: 0.86 };

export interface SubjectHue {
  name: string;
  light: { fill: string; strong: string };
  dark: { fill: string; strong: string };
}

/** The eight subject hues, in slot order (slot 1 is honey). Values are the mockup's (`design/mockups/soft-paper.html`). */
export const SUBJECT_HUES: readonly SubjectHue[] = [
  { name: "honey", light: { fill: "#F0D6A8", strong: "#A86A00" }, dark: { fill: "#5B4826", strong: "#F5C46B" } },
  { name: "sky", light: { fill: "#BDDCF0", strong: "#2A7DB0" }, dark: { fill: "#2A485D", strong: "#8FCBF0" } },
  { name: "mint", light: { fill: "#B5DFD1", strong: "#1F8063" }, dark: { fill: "#265044", strong: "#7FD3B6" } },
  { name: "butter", light: { fill: "#EAE2A5", strong: "#8A7A00" }, dark: { fill: "#565126", strong: "#E9DB6A" } },
  { name: "blue", light: { fill: "#C1D0EA", strong: "#3F64A8" }, dark: { fill: "#2E3E5D", strong: "#9DB7EA" } },
  { name: "coral", light: { fill: "#F0C8B4", strong: "#B4532A" }, dark: { fill: "#5E3728", strong: "#F2A786" } },
  { name: "lilac", light: { fill: "#E5C8DB", strong: "#9B4F80" }, dark: { fill: "#543649", strong: "#E0A6CB" } },
  { name: "sage", light: { fill: "#D1D5C9", strong: "#5F6B50" }, dark: { fill: "#41453B", strong: "#B6C0A6" } },
];
export const SUBJECT_COUNT = SUBJECT_HUES.length;

/**
 * Which hue each of the eight old subject colour swatches (`features/roster/palette.ts`) keeps, so a subject that
 * was blue stays blue-ish. The old swatch is still what the picker stores; this is what it draws as.
 */
export const SWATCH_TO_HUE: Readonly<Record<string, string>> = {
  "#2f6fb0": "blue",
  "#b0482f": "coral",
  "#2f8f6f": "mint",
  "#7a5cc2": "lilac",
  "#b08a2f": "honey",
  "#2f8fb0": "sky",
  "#c25c8a": "butter",
  "#5b6b7d": "sage",
};

/** Chrome colours: the shadcn/ui semantic set plus the timeline's extras. */
export const CHROME: Record<ThemeName, Record<string, string>> = {
  light: {
    background: "#FAF6EE",
    foreground: "#2F2A24",
    card: "#FFFDF8",
    "card-foreground": "#2F2A24",
    popover: "#FFFDF8",
    "popover-foreground": "#2F2A24",
    primary: "#3F6B5C",
    "primary-foreground": "#FFFFFF",
    "primary-soft": "#E3EEE8",
    secondary: "#F2ECE1",
    "secondary-foreground": "#2F2A24",
    muted: "#F2ECE1",
    "muted-foreground": "#6E655A",
    accent: "#E3EEE8",
    "accent-foreground": "#2F2A24",
    destructive: "#9B2C2C",
    "destructive-foreground": "#FFFFFF",
    "destructive-soft": "#F8E3DF",
    notice: "#F6EBCB",
    "notice-foreground": "#4A3A00",
    border: "#E8E0D2",
    input: "#9C917E",
    ring: "#3F6B5C",
    grid: "#E8E0D2",
    today: "#3F6B5C",
    hatch: "#DDD3C2",
    total: "#B8AE9E",
    scrim: "#14120E",
  },
  dark: {
    background: "#1C1A17",
    foreground: "#F1EBE1",
    card: "#26231F",
    "card-foreground": "#F1EBE1",
    popover: "#26231F",
    "popover-foreground": "#F1EBE1",
    primary: "#9CCBB8",
    "primary-foreground": "#1C1A17",
    "primary-soft": "#25342E",
    secondary: "#302C27",
    "secondary-foreground": "#F1EBE1",
    muted: "#302C27",
    "muted-foreground": "#B3A99B",
    accent: "#25342E",
    "accent-foreground": "#F1EBE1",
    destructive: "#F2A194",
    "destructive-foreground": "#1C1A17",
    "destructive-soft": "#3C2723",
    notice: "#3D3420",
    "notice-foreground": "#F1E3B5",
    border: "#3A352F",
    input: "#7A7266",
    ring: "#9CCBB8",
    grid: "#3A352F",
    today: "#9CCBB8",
    hatch: "#4A443C",
    total: "#6B6459",
    scrim: "#000000",
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
  ["muted-foreground", "card"],
  ["accent-foreground", "accent"],
  ["primary", "background"],
  ["primary", "card"],
  ["primary", "primary-soft"],
  ["destructive-foreground", "destructive"],
  ["destructive", "background"],
  ["destructive", "card"],
  ["destructive", "destructive-soft"],
  ["notice-foreground", "notice"],
];

const toRgb = converter("rgb");
const hex = (c: { r: number; g: number; b: number }): string =>
  formatHex({ mode: "rgb", r: Math.min(1, Math.max(0, c.r)), g: Math.min(1, Math.max(0, c.g)), b: Math.min(1, Math.max(0, c.b)) }).toUpperCase();

/** `a` mixed `amount` (0-1) of the way toward `b`, in sRGB, as a hex colour. */
export function mix(a: string, b: string, amount: number): string {
  const x = toRgb(a);
  const y = toRgb(b);
  if (!x || !y) throw new Error("Not a colour");
  return hex({ r: x.r + (y.r - x.r) * amount, g: x.g + (y.g - x.g) * amount, b: x.b + (y.b - x.b) * amount });
}

/** A colour drawn at `opacity` over `bg`, as the browser blends it (in sRGB). */
export const composite = (color: string, bg: string, opacity: number): string => mix(bg, color, opacity);

export const contrast = (a: string, b: string): number => wcagContrast(a, b);

export interface Swatch {
  subject: number; // 1-based
  step: StepName;
  color: string;
  label: string;
  strong: string;
}

/**
 * Every swatch for a theme. The base step is the design fill. A subject drawn once per child gets a lighter
 * (toward the page) and a darker (toward its strong tone) step so children stay apart in the same hue. The label is
 * the theme's ink on every step.
 */
export function swatches(theme: ThemeName): Swatch[] {
  const chrome = CHROME[theme];
  return SUBJECT_HUES.flatMap((h, i) =>
    STEP_NAMES.map((step) => {
      const { fill, strong } = h[theme];
      const color = step === "base" ? fill : step === "light" ? mix(fill, chrome.card!, theme === "light" ? 0.4 : 0.14) : mix(fill, strong, theme === "light" ? 0.16 : 0.1);
      return { subject: i + 1, step, color, label: chrome.foreground!, strong };
    }),
  );
}

/** The check-in tint and the This Week bar fill: the base fill. */
export const pastelOf = (subject: number, theme: ThemeName): string => SUBJECT_HUES[subject - 1]![theme].fill;

const swatchVar = (s: Pick<Swatch, "subject" | "step">): string => `subject-${s.subject}${s.step === "base" ? "" : `-${s.step}`}`;

function subjectLines(theme: ThemeName): string[] {
  const lines: string[] = [];
  for (const s of swatches(theme)) {
    lines.push(`  --tl-${swatchVar(s)}: ${s.color};`, `  --tl-${swatchVar(s)}-label: ${s.label};`);
    if (s.step === "base") lines.push(`  --tl-subject-${s.subject}-strong: ${s.strong};`, `  --tl-subject-${s.subject}-pastel: ${s.color};`);
  }
  return lines;
}

const chromeLines = (theme: ThemeName): string[] => Object.entries(CHROME[theme]).map(([name, c]) => `  --tl-${name}: ${c};`);

const HEADER = "/* Generated by apps/web/scripts/palette.ts (npm run tokens -w @hh/web). Do not edit by hand. */";

const darkBody = (indent: string): string[] => [...chromeLines("dark"), ...subjectLines("dark")].map((l) => indent + l);

/**
 * Plain CSS variables. Light is on :root. Dark applies under `[data-theme="dark"]`, and under the device's dark
 * setting unless the person chose Light (`data-theme="light"`); S8-02 sets `data-theme` before first paint.
 */
export function renderTokensCss(): string {
  return [
    HEADER,
    ":root {",
    ...chromeLines("light"),
    ...subjectLines("light"),
    '  --tl-font: "Nunito Sans Variable", "Nunito Sans", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;',
    '  --tl-font-display: "Fraunces Variable", Fraunces, Georgia, "Times New Roman", serif;',
    "  --tl-text-sm: 12px;",
    "  --tl-text-md: 14px;",
    "  --tl-text-lg: 20px;",
    "  --tl-numeric: tabular-nums;",
    "  --tl-radius: 14px;",
    "  --tl-radius-bar: 12px;",
    "  --tl-radius-sheet: 18px;",
    "  --tl-rule: 4px;",
    "  --tl-motion: 220ms;",
    `  --tl-bar-opacity: ${BAR_OPACITY};`,
    `  --tl-bar-secondary-opacity: ${BAR_SECONDARY_OPACITY.light};`,
    `  --tl-wash: ${WASH_OPACITY.light};`,
    "  --tl-sheet-shadow: 0 -8px 24px rgb(60 40 20 / 0.1);",
    "}",
    '[data-theme="dark"] {',
    ...darkBody(""),
    `  --tl-bar-secondary-opacity: ${BAR_SECONDARY_OPACITY.dark};`,
    `  --tl-wash: ${WASH_OPACITY.dark};`,
    "  --tl-sheet-shadow: 0 -8px 24px rgb(0 0 0 / 0.5);",
    "}",
    "@media (prefers-color-scheme: dark) {",
    '  :root:not([data-theme="light"]) {',
    ...darkBody("  "),
    `    --tl-bar-secondary-opacity: ${BAR_SECONDARY_OPACITY.dark};`,
    `    --tl-wash: ${WASH_OPACITY.dark};`,
    "    --tl-sheet-shadow: 0 -8px 24px rgb(0 0 0 / 0.5);",
    "  }",
    "}",
    "",
  ].join("\n");
}

/** Tailwind v4 theme map: utilities such as bg-subject-3-light, text-subject-3-label or bg-subject-3-pastel resolve to the --tl-* variables. */
export function renderThemeCss(): string {
  const subjects = swatches("light").flatMap((s) => [swatchVar(s), `${swatchVar(s)}-label`]);
  const extras = Array.from({ length: SUBJECT_COUNT }, (_, i) => [`subject-${i + 1}-pastel`, `subject-${i + 1}-strong`]).flat();
  const colors = [...subjects, ...extras, ...Object.keys(CHROME.light)];
  return [
    HEADER,
    "@theme inline {",
    ...colors.map((n) => `  --color-${n}: var(--tl-${n});`),
    "  --font-sans: var(--tl-font);",
    "  --font-display: var(--tl-font-display);",
    // Named sizes rather than remapping Tailwind's own scale, so text-sm keeps meaning what shadcn components expect.
    "  --text-label: var(--tl-text-sm);",
    "  --text-body: var(--tl-text-md);",
    "  --text-title: var(--tl-text-lg);",
    "  --radius-sm: calc(var(--tl-radius) - 6px);",
    "  --radius-md: calc(var(--tl-radius) - 2px);",
    "  --radius-lg: var(--tl-radius);",
    "}",
    "",
  ].join("\n");
}

async function main(): Promise<void> {
  const { writeFileSync } = await import("node:fs");
  const { fileURLToPath } = await import("node:url");
  const dir = fileURLToPath(new URL("../src/styles/", import.meta.url));
  writeFileSync(`${dir}tokens.css`, renderTokensCss());
  writeFileSync(`${dir}tokens.theme.css`, renderThemeCss());
  console.log(`Wrote ${dir}tokens.css and tokens.theme.css`);
}

if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, "/"))) void main();
