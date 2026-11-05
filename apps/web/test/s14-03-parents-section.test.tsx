import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const SETTINGS = { name: "Demo family", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", weekStartLocked: false, zoomViews: { hidden: [], custom: [] }, logSetup: null };
const TOKEN = "k".repeat(43);
const TWO = { parents: [{ id: "p1", name: "Dana", you: true }, { id: "p2", name: "Sam", you: false }], invites: [] };

async function open() {
  fakeApi.on("GET /api/family", 200, SETTINGS);
  const user = userEvent.setup();
  renderAt("/schedule/settings");
  await screen.findByRole("form", { name: "Family settings" });
  return user;
}
const section = () => screen.getByRole("group", { name: "Parents" });

beforeEach(() => { Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); });
afterEach(() => { vi.restoreAllMocks(); });

describe("Parents in Family settings (S14-03)", () => {
  it("names the parents, marking you, and offers Invite another parent", async () => {
    fakeApi.on("GET /api/family/parents", 200, TWO);
    await open();
    const list = await within(section()).findByRole("list", { name: "Parents in this family" });
    expect(within(list).getAllByRole("listitem").map((l) => l.textContent)).toEqual(["Dana(you)", "Sam"]);
    expect(within(section()).getByRole("button", { name: "Invite another parent" })).toBeInTheDocument();
    expect(within(section()).queryByRole("button", { name: /remove/i })).toBeNull();
  });

  it("makes a link for this family once, shows it with copy, and says it works once for 7 days", async () => {
    fakeApi.on("POST /api/family/invites", 201, { id: "i1", token: TOKEN, expiresAt: "2026-11-12T12:00:00.000Z" });
    const user = await open();
    await user.click(await within(section()).findByRole("button", { name: "Invite another parent" }));
    const box = await within(section()).findByLabelText("Send this link to the other parent");
    expect(box).toHaveValue(`${window.location.origin}/join/${TOKEN}`);
    expect(box).toHaveAttribute("readonly");
    expect(within(section()).getByText(/works once and ends in 7 days/)).toBeInTheDocument();
    await user.click(within(section()).getByRole("button", { name: "Copy link" }));
    await waitFor(async () => expect(await navigator.clipboard.readText()).toBe(`${window.location.origin}/join/${TOKEN}`));
    expect(await within(section()).findByText("Link copied.")).toBeInTheDocument();
    expect(fakeApi.calls.filter((c) => c.method === "POST").map((c) => c.path)).toEqual(["/api/family/invites"]);
  });

  it("offers the phone's share sheet when there is one", async () => {
    const share = vi.fn(async () => {});
    Object.defineProperty(navigator, "share", { value: share, configurable: true });
    fakeApi.on("POST /api/family/invites", 201, { id: "i1", token: TOKEN, expiresAt: "2026-11-12T12:00:00.000Z" });
    const user = await open();
    await user.click(await within(section()).findByRole("button", { name: "Invite another parent" }));
    await user.click(await within(section()).findByRole("button", { name: "Share" }));
    expect(share).toHaveBeenCalledWith({ title: "Join our family on Homeschool Hub", url: `${window.location.origin}/join/${TOKEN}` });
  });

  it("without a share sheet there is no Share button", async () => {
    fakeApi.on("POST /api/family/invites", 201, { id: "i1", token: TOKEN, expiresAt: "2026-11-12T12:00:00.000Z" });
    const user = await open();
    await user.click(await within(section()).findByRole("button", { name: "Invite another parent" }));
    await within(section()).findByRole("button", { name: "Copy link" });
    expect(within(section()).queryByRole("button", { name: "Share" })).toBeNull();
  });

  it("lists open invites with Cancel invite (never a link), and cancelling asks the API and hides a shown link", async () => {
    let invites = [{ id: "i1", createdAt: "2026-11-05T12:00:00.000Z", expiresAt: "2026-11-12T12:00:00.000Z" }];
    fakeApi.on("GET /api/family/parents", () => [200, { parents: TWO.parents.slice(0, 1), invites }]);
    fakeApi.on("DELETE /api/family/invites/i1", () => { invites = []; return [204, undefined]; });
    const user = await open();
    const cancel = await within(section()).findByRole("button", { name: /^Cancel invite made/ });
    expect(cancel).toHaveTextContent("Cancel invite");
    expect(section().textContent).not.toContain("/join/");
    await user.click(cancel);
    expect(await within(section()).findByText("Invite cancelled.")).toBeInTheDocument();
    expect(within(section()).queryByRole("button", { name: /^Cancel invite made/ })).toBeNull();
    expect(fakeApi.calls.some((c) => c.method === "DELETE" && c.path === "/api/family/invites/i1")).toBe(true);
  });

  it("shows the server's plain message when the limit is reached", async () => {
    fakeApi.on("POST /api/family/invites", 409, { error: "too_many_invites", message: "Cancel an invite you no longer need before making another." });
    const user = await open();
    await user.click(await within(section()).findByRole("button", { name: "Invite another parent" }));
    expect(await within(section()).findByRole("alert")).toHaveTextContent("Cancel an invite you no longer need before making another.");
  });

  it("the demo family can't invite", async () => {
    fakeApi.on("GET /api/me", 200, { ...DEMO_ME, demo: true });
    await open();
    expect(await within(section()).findByText("The demo family can't invite another parent.")).toBeInTheDocument();
    expect(within(section()).queryByRole("button", { name: "Invite another parent" })).toBeNull();
  });
});
