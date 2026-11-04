/** S10-14: "‹ Home" on /setup, both back links 44 × 44 px, and exactly one active nav item on every Set up screen. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { SETUP_LINKS } from "../src/layout/nav";
import { renderAt } from "./render";

describe("S10-14: Set up's back link", () => {
  it("/setup has '‹ Home' above the heading, styled like '‹ Set up', and it goes Home", async () => {
    const user = userEvent.setup();
    const { router } = renderAt("/setup");
    const h1 = await screen.findByRole("heading", { level: 1, name: "Set up" });
    const back = within(screen.getByRole("main")).getByRole("link", { name: "‹ Home" });
    expect(back.parentElement).toHaveClass("schedule-back");
    expect(back.compareDocumentPosition(h1) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    await user.click(back);
    expect(router.state.location.pathname).toBe("/");
  });

  it("both back links are at least 44 × 44 px (CSS)", () => {
    const css = readFileSync(join(process.cwd(), "src/features/schedule/schedule.css"), "utf8");
    const rule = /\.schedule-back a \{([^}]*)\}/.exec(css)?.[1] ?? "";
    expect(rule).toMatch(/min-height: 44px;/);
    expect(rule).toMatch(/min-width: 44px;/);
    expect(rule).toMatch(/display: inline-block;/);
  });

  it.each(["/setup", "/setup/children", ...SETUP_LINKS.map((l) => l.to).filter((p) => p !== "/setup/children"), "/setup/settings"])(
    "exactly one nav item, Set up, is active on %s", async (path) => {
      renderAt(path);
      const nav = await screen.findByRole("navigation", { name: "Main" });
      await screen.findByRole("heading", { level: 1 });
      const current = nav.querySelectorAll("[aria-current=page]");
      expect([...current].map((a) => a.textContent)).toEqual(["Set up"]);
    });
});
