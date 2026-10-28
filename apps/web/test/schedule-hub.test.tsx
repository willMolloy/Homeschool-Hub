import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { renderAt } from "./render";

describe("Schedule hub", () => {
  it("lists the four schedule screens", async () => {
    renderAt("/schedule");
    expect(await screen.findByRole("heading", { name: "Schedule" })).toBeInTheDocument();
    const hub = screen.getByRole("list", { name: "Schedule" });
    const links = within(hub).getAllByRole("link");
    expect(links.map((l) => l.getAttribute("href"))).toEqual([
      "/schedule/assignments", "/schedule/days-off", "/schedule/events", "/schedule/settings",
    ]);
    expect(within(hub).getByRole("link", { name: /Family settings/ })).toBeInTheDocument();
  });

  it("a hub link opens its screen, which links back", async () => {
    const user = userEvent.setup();
    const { router } = renderAt("/schedule");
    await user.click(await screen.findByRole("link", { name: /Days off/ }));
    expect(router.state.location.pathname).toBe("/schedule/days-off");
    await user.click(await screen.findByRole("link", { name: "‹ Schedule" }));
    expect(router.state.location.pathname).toBe("/schedule");
  });
});
