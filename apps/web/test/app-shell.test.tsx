import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderAt } from "./render";

describe("AppShell", () => {
  it("shows the three nav links; the active one has aria-current=page", async () => {
    renderAt("/kids");
    const nav = await screen.findByRole("navigation", { name: "Main" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Plan", "Kids", "Subjects"]);
    expect(within(nav).getByRole("link", { name: "Kids" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Plan" })).not.toHaveAttribute("aria-current");
  });

  it("Plan is only active on / (not on every page)", async () => {
    renderAt("/");
    const nav = await screen.findByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Plan" })).toHaveAttribute("aria-current", "page");
  });

  it("keyboard tabbing reaches every nav link", async () => {
    const user = userEvent.setup();
    renderAt("/subjects");
    await screen.findByRole("navigation", { name: "Main" });
    const reached: string[] = [];
    for (let i = 0; i < 6; i++) {
      await user.tab();
      reached.push(document.activeElement?.textContent ?? "");
    }
    expect(reached).toEqual(expect.arrayContaining(["Plan", "Kids", "Subjects"]));
  });

  it("login is outside the shell", async () => {
    renderAt("/login");
    await screen.findByRole("heading", { name: "Sign in" });
    expect(screen.queryByRole("navigation")).toBeNull();
  });
});
