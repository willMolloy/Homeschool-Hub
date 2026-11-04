/** S10-09: one nav, the bottom bar under 600 px and an 80 px icon rail from 600 px, with Set up in both; Home has no Set up row. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TABS } from "../src/layout/nav";
import { railLabelsShown } from "../src/layout/railLabels";
import { renderAt } from "./render";

const css = readFileSync(join(process.cwd(), "src/layout/app-shell.css"), "utf8");
/** The body of every `@media (...)` block whose query matches `query`. */
const mediaBlocks = (query: RegExp) => {
  const out: string[] = [];
  const re = /@media\s*\(([^)]*)\)\s*\{/g;
  for (let m = re.exec(css); m; m = re.exec(css)) {
    if (!query.test(m[1] ?? "")) continue;
    let depth = 1, i = re.lastIndex;
    for (; depth > 0 && i < css.length; i++) depth += css[i] === "{" ? 1 : css[i] === "}" ? -1 : 0;
    out.push(css.slice(re.lastIndex, i - 1));
  }
  return out;
};

describe("S10-09: navigation bar or rail", () => {
  afterEach(() => localStorage.clear());

  it("the same four items in the same order, each with an icon and a name, in the one Main nav", async () => {
    renderAt("/records");
    const navs = await screen.findAllByRole("navigation");
    expect(navs).toHaveLength(1);
    const links = within(navs[0] as HTMLElement).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(TABS.map((t) => t.label));
    expect(TABS.map((t) => [t.label, t.to])).toEqual([["Home", "/"], ["Schedule", "/schedule"], ["Records", "/records"], ["Set up", "/setup"]]);
    for (const l of links) expect(l.querySelector("svg")).not.toBeNull();
  });

  it("Set up is the active item on /setup/subjects, and the only one", async () => {
    renderAt("/setup/subjects");
    const nav = await screen.findByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Set up" })).toHaveAttribute("aria-current", "page");
    expect(nav.querySelectorAll("[aria-current=page]")).toHaveLength(1);
  });

  it("Home has no Set up row", async () => {
    renderAt("/");
    const main = await screen.findByRole("main");
    await within(main).findByRole("link", { name: "Records" });
    expect(main.querySelector("a[href='/setup']")).toBeNull();
    expect(within(main).queryByText("Children, subjects, books, breaks")).toBeNull();
  });

  it("CSS: the bar under 600 px, the rail from 600 px (80 px, fixed left, the page after it), never a second breakpoint for nav", () => {
    expect(css).toMatch(/:root \{\s*--tab-bar-height: 70px;\s*--rail-width: 0px;/);
    const rail = mediaBlocks(/^min-width: 600px$/).join("\n");
    expect(rail).toMatch(/--tab-bar-height: 0px;/);
    expect(rail).toMatch(/--rail-width: 80px;/);
    expect(rail).toMatch(/\.shell \{\s*padding-left: calc\(var\(--rail-width\)/);
    expect(rail).toMatch(/\.shell-nav \{\s*top: 0;\s*right: auto;\s*width: calc\(var\(--rail-width\)/);
    expect(rail).toMatch(/\.shell-nav ul \{\s*flex-direction: column;/);
    expect(rail).toMatch(/\.shell-nav a \{[^}]*min-height: 56px;/);
    // no other width switches the nav (so 599 is the bar and 600 the rail, and never both)
    const others = [...css.matchAll(/@media\s*\(([^)]*)\)/g)].map((m) => m[1] ?? "").filter((q) => q !== "min-width: 600px");
    for (const q of others) for (const body of mediaBlocks(new RegExp(`^${q.replace(/[()]/g, "\\$&")}$`))) expect(body).not.toMatch(/\.shell-nav/);
  });

  it("rail labels: on by default; VITE_RAIL_LABELS=off or a dev ?rail-labels=off turns them off (remembered); a production build ignores the query", () => {
    expect(railLabelsShown("", { DEV: true })).toBe(true);
    expect(railLabelsShown("", { DEV: false, VITE_RAIL_LABELS: "off" })).toBe(false);
    expect(railLabelsShown("?rail-labels=off", { DEV: false })).toBe(true);
    expect(railLabelsShown("?rail-labels=off", { DEV: true })).toBe(false);
    expect(railLabelsShown("", { DEV: true })).toBe(false);
    expect(railLabelsShown("?rail-labels=on", { DEV: true, VITE_RAIL_LABELS: "off" })).toBe(true);
    expect(railLabelsShown("", { DEV: true, VITE_RAIL_LABELS: "off" })).toBe(true);
  });

  it("with labels off the nav says so and the names stay for screen readers", async () => {
    renderAt("/setup?rail-labels=off");
    const nav = await screen.findByRole("navigation", { name: "Main" });
    expect(nav).toHaveAttribute("data-rail-labels", "off");
    expect(within(nav).getByRole("link", { name: "Schedule" })).toBeInTheDocument();
    expect(mediaBlocks(/^min-width: 600px$/).join("\n")).toMatch(/\.shell-nav\[data-rail-labels="off"\] \.shell-nav-label \{\s*position: absolute;/);
  });
});
