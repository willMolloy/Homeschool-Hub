// T-01: Tailwind v4 + shadcn/ui (Base UI) wiring that must not leak into the existing screens.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

const here = dirname(fileURLToPath(import.meta.url));
const read = (rel: string) => readFileSync(join(here, "..", rel), "utf8");

describe("tailwind.css", () => {
  const css = read("src/styles/tailwind.css");

  it("skips Preflight, so the existing screens keep their look", () => {
    expect(css).not.toMatch(/@import\s+"tailwindcss"\s*;/);
    expect(css).not.toMatch(/@import[^;]*preflight/);
  });

  it("turns off automatic class detection and layers the utilities", () => {
    expect(css).toContain('@import "tailwindcss/utilities.css" layer(utilities) source(none);');
    expect(css).toContain('@import "./tokens.css";');
    expect(css).toContain('@import "./tokens.theme.css";');
  });
});

describe("components.json", () => {
  const cfg = JSON.parse(read("components.json")) as { style: string; tailwind: { css: string; config: string }; aliases: { utils: string } };

  it("uses the Base UI flavour of shadcn/ui and points at the Tailwind entry", () => {
    expect(cfg.style.startsWith("base-")).toBe(true);
    expect(cfg.tailwind.css).toBe("src/styles/tailwind.css");
    expect(cfg.tailwind.config).toBe("");
    expect(cfg.aliases.utils).toBe("@/lib/utils");
  });
});

describe("cn", () => {
  it("joins conditionally and lets the later Tailwind utility win", () => {
    const off = false as boolean;
    expect(cn("px-2", off && "hidden", ["text-label"], { "bg-subject-1": true, "bg-subject-2": off })).toBe("px-2 text-label bg-subject-1");
    expect(cn("px-2 py-1", "px-4")).toBe("py-1 px-4");
  });
});
