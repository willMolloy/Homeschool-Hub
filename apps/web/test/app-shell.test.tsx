import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderAt } from "./render";

describe("AppShell", () => {
  it("shows the three tabs, in order, with icons and labels; the active one has aria-current=page", async () => {
    renderAt("/track");
    const nav = await screen.findByRole("navigation", { name: "Main" });
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Home", "Track work", "Schedule"]);
    for (const l of links) expect(l.querySelector("svg")).not.toBeNull();
    expect(within(nav).getByRole("link", { name: "Track work" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  it("Home is only active on / (not on every page)", async () => {
    renderAt("/");
    const nav = await screen.findByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Schedule" })).not.toHaveAttribute("aria-current");
  });

  it("Schedule is current on its Week and Year views", async () => {
    renderAt("/schedule?view=year");
    const nav = await screen.findByRole("navigation", { name: "Main" });
    expect(within(nav).getByRole("link", { name: "Schedule" })).toHaveAttribute("aria-current", "page");
  });

  it("one tap on Home from anywhere, and Track work and Schedule switch in one tap", async () => {
    const user = userEvent.setup();
    const { router } = renderAt("/setup/events");
    const nav = await screen.findByRole("navigation", { name: "Main" });
    await user.click(within(nav).getByRole("link", { name: "Home" }));
    expect(router.state.location.pathname).toBe("/");
    await user.click(within(nav).getByRole("link", { name: "Track work" }));
    expect(router.state.location.pathname).toBe("/track");
    await user.click(within(nav).getByRole("link", { name: "Schedule" }));
    expect(router.state.location.pathname).toBe("/schedule");
  });

  it("keyboard tabbing reaches every nav link", async () => {
    const user = userEvent.setup();
    renderAt("/setup/subjects");
    await screen.findByRole("navigation", { name: "Main" });
    const reached: string[] = [];
    for (let i = 0; i < 40; i++) {
      await user.tab();
      reached.push(document.activeElement?.textContent ?? "");
    }
    expect(reached).toEqual(expect.arrayContaining(["Home", "Track work", "Schedule"]));
  });

  it("there is no header bar and no Sign out button outside Home", async () => {
    renderAt("/setup");
    await screen.findByRole("navigation", { name: "Main" });
    expect(screen.queryByRole("banner")).toBeNull();
    expect(screen.queryByRole("button", { name: "Sign out" })).toBeNull();
  });

  it("login is outside the shell", async () => {
    renderAt("/login");
    await screen.findByRole("heading", { name: "Sign in" });
    expect(screen.queryByRole("navigation")).toBeNull();
  });
});
