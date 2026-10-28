// @vitest-environment node
/**
 * Tester (Oct 28, 2026): jsdom can't lay out, so this guards the CSS rule the 360 px smoke found missing.
 * Repro: an active child named "W"×60 with nothing planned made /?week=… 913 px wide at a 360 px viewport.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(resolve(__dirname, "../src/features/plan/plan.css"), "utf8");
const rule = (sel: string) => css.match(new RegExp(`${sel.replace(/[.[\]]/g, "\\$&")}\\s*\\{([^}]*)\\}`))?.[1] ?? "";

describe("tester: long unbroken names can't widen the page", () => {
  it("the 'nothing planned' line breaks long words", () => {
    expect(rule(".plan-debug-unplanned")).toMatch(/overflow-wrap:\s*anywhere/);
  });
});
