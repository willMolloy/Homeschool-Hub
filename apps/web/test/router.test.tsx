import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderAt } from "./render";

describe("routes", () => {
  it.each([["/login", "Sign in"], ["/schedule", "Schedule"], ["/track", "Track work"], ["/setup", "Set up"], ["/setup/children", "Children"], ["/setup/subjects", "Subjects"]])("%s shows %s", async (path, name) => {
    renderAt(path);
    // Several screens fetch before their title shows; give a loaded machine room (the gate runs suites in parallel).
    expect(await screen.findByRole("heading", { name }, { timeout: 5000 })).toBeInTheDocument();
  });
  it("/ is Home, with the family button and the greeting", async () => {
    renderAt("/");
    expect(await screen.findByRole("button", { name: "Family and settings" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: /^Good (morning|afternoon|evening)$/ })).toBeInTheDocument();
  });
  // S8-04: every old link still lands on the right screen, keeping its query.
  it.each([
    ["/kids", "/setup/children"], ["/subjects", "/setup/subjects"], ["/schedule/assignments", "/setup/assignments"],
    ["/schedule/days-off", "/setup/days-off"], ["/schedule/events", "/setup/events"], ["/schedule/settings", "/setup/settings"],
    ["/timeline", "/schedule"], ["/timeline?child=c1&zoom=fall", "/schedule"],
  ])("old link %s lands on %s", async (from, to) => {
    const { router } = renderAt(from);
    await screen.findByRole("navigation", { name: "Main" });
    expect(router.state.location.pathname).toBe(to);
    if (from.startsWith("/timeline")) {
      expect(router.state.location.search).toContain("view=year");
      if (from.includes("child=c1")) expect(router.state.location.search).toContain("child=c1");
    }
  });
  it("unknown URL shows the 404 page", async () => {
    renderAt("/nope/deeper");
    expect(await screen.findByRole("heading", { name: "Page not found" })).toBeInTheDocument();
  });
});
