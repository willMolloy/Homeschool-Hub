// S8-02: Light / Dark / System.
import { readFileSync } from "node:fs";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppearanceChoice } from "../src/features/settings/AppearanceChoice";
import { applyTheme, effectiveTheme, readTheme, setTheme, THEME_KEY } from "../src/lib/theme";

const root = document.documentElement;
beforeEach(() => {
  localStorage.clear();
  delete root.dataset.theme;
});
afterEach(() => vi.restoreAllMocks());

describe("theme helpers", () => {
  it("defaults to System, which sets no attribute (the tokens follow the device)", () => {
    expect(readTheme()).toBe("system");
    applyTheme("system");
    expect(root.hasAttribute("data-theme")).toBe(false);
  });

  it("Light and Dark set data-theme and are remembered", () => {
    setTheme("dark");
    expect(root.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    expect(readTheme()).toBe("dark");
    setTheme("light");
    expect(root.dataset.theme).toBe("light");
    setTheme("system");
    expect(root.hasAttribute("data-theme")).toBe(false);
    expect(localStorage.getItem(THEME_KEY)).toBeNull();
  });

  it("System follows the device setting", () => {
    expect(effectiveTheme("system", true)).toBe("dark");
    expect(effectiveTheme("system", false)).toBe("light");
    expect(effectiveTheme("light", true)).toBe("light");
    expect(effectiveTheme("dark", false)).toBe("dark");
  });

  it("an unknown saved value falls back to System", () => {
    localStorage.setItem(THEME_KEY, "purple");
    expect(readTheme()).toBe("system");
  });

  it("blocked storage falls back to System and a choice still applies", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => { throw new Error("blocked"); });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => { throw new Error("blocked"); });
    expect(readTheme()).toBe("system");
    expect(() => setTheme("dark")).not.toThrow();
    expect(root.dataset.theme).toBe("dark");
  });
});

describe("Appearance row", () => {
  it("offers Light, Dark and System, starting on the saved one, and applies a choice at once", async () => {
    localStorage.setItem(THEME_KEY, "light");
    const user = userEvent.setup();
    render(<AppearanceChoice />);
    expect(screen.getByRole("radio", { name: "Light" })).toBeChecked();
    await user.click(screen.getByRole("radio", { name: "Dark" }));
    expect(root.dataset.theme).toBe("dark");
    expect(localStorage.getItem(THEME_KEY)).toBe("dark");
    await user.click(screen.getByRole("radio", { name: "System" }));
    expect(root.hasAttribute("data-theme")).toBe(false);
  });
});

describe("no flash on load", () => {
  const html = readFileSync("index.html", "utf8");
  it("index.html applies the saved theme and the page colour before the app loads, with the same key", () => {
    expect(html).toContain(`localStorage.getItem("${THEME_KEY}")`);
    expect(html.indexOf("localStorage.getItem")).toBeLessThan(html.indexOf("/src/main.tsx"));
    expect(html).toMatch(/prefers-color-scheme: dark[^}]*background: #1C1A17/);
  });
});
