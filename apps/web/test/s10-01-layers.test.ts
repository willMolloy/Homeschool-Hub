// S10-01: sheets sit above the tab bar. Every stacking layer comes from one set of tokens (styles/layers.css).
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (f: string) => readFileSync(f, "utf8");
const cssFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    return statSync(p).isDirectory() ? cssFiles(p) : p.endsWith(".css") ? [p] : [];
  });
const layers = read("src/styles/layers.css");
const token = (name: string) => Number(new RegExp(`--z-${name}:\\s*(\\d+)`).exec(layers)?.[1]);
const zOf = (file: string, selector: string) => {
  const text = read(file);
  const at = text.indexOf(`${selector} {`);
  expect(at, `${selector} in ${file}`).toBeGreaterThanOrEqual(0);
  return /z-index:\s*var\(--z-([a-z]+)\)/.exec(text.slice(at, text.indexOf("}", at)))?.[1];
};

describe("S10-01 layers", () => {
  it("orders the layers: nav < edit sheet < undo bar < sheets < dialogs < skip link", () => {
    const order = ["raised", "popover", "nav", "edit", "toast", "sheet", "dialog", "overlay", "skip"].map(token);
    expect(order.every((v) => Number.isFinite(v))).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it("puts the tab bar, every sheet, dialogs and the undo bar on the shared tokens", () => {
    expect(zOf("src/layout/app-shell.css", ".shell-nav")).toBe("nav");
    expect(zOf("src/features/timeline/timeline.css", ".tl-edit")).toBe("edit");
    expect(zOf("src/features/undo/undo.css", ".undo-bar")).toBe("toast");
    expect(zOf("src/components/ui/sheet.css", ".sheet-viewport")).toBe("sheet");
    expect(zOf("src/components/ui/sheet.css", ".sheet-backdrop")).toBe("sheet");
    expect(zOf("src/components/ui/sheet.css", ".sheet-side")).toBe("sheet");
    expect(zOf("src/components/ui/sheet.css", ".sheet-dialog")).toBe("dialog");
    for (const layer of ["edit", "sheet", "dialog"]) expect(token(layer)).toBeGreaterThan(token("nav"));
  });

  it("has no bare z-index anywhere in the app's CSS", () => {
    const bare = cssFiles("src").flatMap((f) => (read(f).match(/z-index:\s*-?\d+/g) ?? []).map((m) => `${f}: ${m}`));
    expect(bare).toEqual([]);
  });

  it("loads the layer tokens before the app's styles", () => {
    const main = read("src/main.tsx");
    expect(main.indexOf("styles/layers.css")).toBeGreaterThan(-1);
    expect(main.indexOf("styles/layers.css")).toBeLessThan(main.indexOf('"./styles.css"'));
  });
});
