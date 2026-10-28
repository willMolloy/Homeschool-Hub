// Hand-test fixes: "black text on a dark gray background". Two guards so it can't come back:
//   1. The app is light-only, so it says so (color-scheme: light). Without it, a dark OS or browser
//      theme can draw native fields and buttons dark while our text stays dark.
//   2. Every app CSS rule that paints a solid background pairs it with text that reads on it
//      (WCAG AA 4.5:1). A rule without its own `color` inherits the page text, so it is checked
//      against that. The timeline tokens (light and dark) are checked in palette.test.ts.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { AA_TEXT, contrast } from "../scripts/palette";

const WEB = join(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = join(WEB, "src");
/** Generated token files and the Tailwind entry are covered by palette.test.ts. */
const SKIP = new Set(["styles/tokens.css", "styles/tokens.theme.css", "styles/tailwind.css"]);

/** Backgrounds that never sit behind text (bars, swatches, skeletons, the dialog backdrop). */
const NON_TEXT = new Set([
  ".thickness-reference",
  ".thickness-chosen",
  ".progress-bar",
  ".skeleton .color-dot",
  ".confirm-dialog::backdrop",
  ".swatch-chip",
]);
/** Translucent backgrounds, with the colour they sit on. */
const TRANSLUCENT_ON: Record<string, string> = { '.shell-nav a[aria-current="page"]': "var(--brand)" };

function cssFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return cssFiles(p);
    return p.endsWith(".css") && !SKIP.has(relative(SRC, p)) ? [p] : [];
  });
}

interface Rule { file: string; selector: string; decls: Record<string, string> }
function rules(file: string): Rule[] {
  const text = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "");
  const out: Rule[] = [];
  for (const m of text.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1]!.trim();
    if (selector.startsWith("@") || /^(from|to|\d+%)$/.test(selector)) continue;
    const decls: Record<string, string> = {};
    for (const d of m[2]!.split(";")) {
      const i = d.indexOf(":");
      if (i > 0) decls[d.slice(0, i).trim()] = d.slice(i + 1).trim();
    }
    out.push({ file: relative(SRC, file), selector, decls });
  }
  return out;
}

const root = rules(join(SRC, "styles.css")).find((r) => r.selector === ":root")!;
const vars: Record<string, string> = Object.fromEntries(Object.entries(root.decls).filter(([k]) => k.startsWith("--")));
const PAGE_TEXT = root.decls.color!;
const PAGE_BG = root.decls.background!;

/** A concrete colour, or null for anything that isn't one (gradients, currentColor, none…). */
function resolve(v: string | undefined): string | null {
  if (!v) return null;
  const m = v.match(/^var\((--[\w-]+)(?:,\s*([^)]+))?\)$/);
  if (m) return resolve(vars[m[1]!] ?? m[2]);
  if (/^#[0-9a-f]{3,8}$/i.test(v) || /^rgba?\([^)]*\)$/i.test(v) || v === "white" || v === "black") return v;
  return null;
}
const alphaOf = (c: string) => {
  const m = c.match(/^rgba\([^)]*,\s*([\d.]+)\s*\)$/i);
  return m ? Number(m[1]) : 1;
};
/** Paint `c` (rgba) over the opaque `under` (hex). */
function over(c: string, under: string): string {
  const [r, g, b, a] = c.match(/[\d.]+/g)!.map(Number) as [number, number, number, number];
  const h = under.replace("#", "");
  const u = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mix = [r, g, b].map((v, i) => Math.round(v * a + u[i]! * (1 - a)));
  return `rgb(${mix.join(", ")})`;
}

const all = cssFiles(SRC).flatMap(rules);

describe("app CSS contrast", () => {
  it("declares the app light-only, in CSS and in index.html", () => {
    expect(root.decls["color-scheme"]).toBe("light");
    expect(readFileSync(join(WEB, "index.html"), "utf8")).toMatch(/<meta name="color-scheme" content="light"/);
  });

  it("gives native fields their own text and background colours", () => {
    const fields = rules(join(SRC, "styles.css")).find((r) => /^input\b.*, select, textarea$/.test(r.selector.replace(/\s+/g, " ")));
    expect(fields, "an `input…, select, textarea` rule in styles.css").toBeDefined();
    expect(contrast(resolve(fields!.decls.color)!, resolve(fields!.decls["background-color"])!)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("page text reads on the page", () => {
    expect(contrast(PAGE_TEXT, PAGE_BG)).toBeGreaterThanOrEqual(AA_TEXT);
  });

  it("every solid background has readable text (its own colour, or the page text it inherits)", () => {
    const failures: string[] = [];
    let checked = 0;
    for (const r of all) {
      const raw = r.decls["background-color"] ?? r.decls.background;
      let bg = resolve(raw);
      if (!bg || NON_TEXT.has(r.selector)) continue;
      if (alphaOf(bg) < 1) {
        const under = resolve(TRANSLUCENT_ON[r.selector]);
        if (!under) {
          failures.push(`${r.file} ${r.selector}: translucent background ${bg} with no known colour under it`);
          continue;
        }
        bg = over(bg, under);
      }
      const own = r.decls.color;
      const fg = own === undefined || own === "inherit" ? PAGE_TEXT : resolve(own);
      if (!fg) continue;
      checked += 1;
      const cr = contrast(alphaOf(fg) < 1 ? over(fg, bg.startsWith("#") ? bg : PAGE_BG) : fg, bg);
      if (cr < AA_TEXT) failures.push(`${r.file} ${r.selector}: ${fg} on ${bg} = ${cr.toFixed(2)}:1`);
    }
    expect(checked).toBeGreaterThan(20);
    expect(failures).toEqual([]);
  });

  it("the non-text and translucent lists only name selectors that exist", () => {
    const selectors = new Set(all.map((r) => r.selector));
    for (const s of [...NON_TEXT, ...Object.keys(TRANSLUCENT_ON)]) expect(selectors.has(s), s).toBe(true);
  });

  it("the check catches dark text on a dark background", () => {
    expect(contrast(PAGE_TEXT, "#3a3f47")).toBeLessThan(AA_TEXT);
  });
});
