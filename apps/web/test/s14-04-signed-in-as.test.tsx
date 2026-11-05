import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

async function openMenu() {
  const user = userEvent.setup();
  renderAt("/");
  await user.click(await screen.findByRole("button", { name: "Family and settings" }));
  return within(await screen.findByRole("dialog"));
}

describe("the family menu names who is signed in (S14-04)", () => {
  it("says 'Signed in as {name}'", async () => {
    const sheet = await openMenu();
    expect(sheet.getByText("Signed in as Dana")).toBeInTheDocument();
    expect(sheet.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });

  it("says nothing when the session has no parent name", async () => {
    fakeApi.on("GET /api/me", 200, { ...DEMO_ME, parentName: null });
    const sheet = await openMenu();
    expect(sheet.queryByText(/Signed in as/)).toBeNull();
  });
});
