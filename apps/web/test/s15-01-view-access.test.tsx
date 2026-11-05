/** S15-01 (web): the View-only access card, joining a view-only link, and the account switcher in the family menu. */
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router-dom";
import { AuthProvider } from "../src/auth/AuthProvider";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { JoinPage } from "../src/features/join/JoinPage";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const SETTINGS = { name: "Demo family", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", weekStartLocked: false, zoomViews: { hidden: [], custom: [] }, logSetup: null };
const TOKEN = "v".repeat(43);
const NONE = { links: [], viewers: [] };
const card = () => screen.getByRole("group", { name: "View-only access" });

async function openSettings() {
  fakeApi.on("GET /api/family", 200, SETTINGS);
  const user = userEvent.setup();
  renderAt("/schedule/settings");
  await screen.findByRole("form", { name: "Family settings" });
  return user;
}
beforeEach(() => { Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); });
afterEach(() => { vi.restoreAllMocks(); });

describe("View-only access in Family settings (S15-01)", () => {
  it("makes a link with a label, shows it once with Copy, and says it works once for 7 days", async () => {
    fakeApi.on("POST /api/family/view-links", 201, { id: "l1", token: TOKEN, expiresAt: "2026-11-12T12:00:00.000Z" });
    const user = await openSettings();
    await user.type(await within(card()).findByLabelText("Label (optional)"), "Co-op");
    await user.click(within(card()).getByRole("button", { name: "Create a sign-up link" }));
    const box = await within(card()).findByLabelText("Send this link to the person who should see your schedule");
    expect(box).toHaveValue(`${window.location.origin}/join/${TOKEN}`);
    expect(box).toHaveAttribute("readonly");
    expect(within(card()).getByText(/works once and ends in 7 days/)).toBeInTheDocument();
    await user.click(within(card()).getByRole("button", { name: "Copy link" }));
    expect(await within(card()).findByText("Link copied.")).toBeInTheDocument();
    const post = fakeApi.calls.find((c) => c.method === "POST" && c.path === "/api/family/view-links");
    expect(post?.body).toEqual({ label: "Co-op" });
  });

  it("sends no label when it is left empty, and offers no limit on how many", async () => {
    fakeApi.on("POST /api/family/view-links", 201, { id: "l1", token: TOKEN, expiresAt: "2026-11-12T12:00:00.000Z" });
    const user = await openSettings();
    const make = await within(card()).findByRole("button", { name: "Create a sign-up link" });
    await user.click(make);
    await within(card()).findByLabelText(/Send this link/);
    await user.click(make);
    await waitFor(() => expect(fakeApi.calls.filter((c) => c.method === "POST" && c.path === "/api/family/view-links")).toHaveLength(2));
    expect(fakeApi.calls.find((c) => c.method === "POST" && c.path === "/api/family/view-links")?.body).toEqual({});
  });

  it("lists open links (with Cancel) and viewers (name, email, joined, Remove) but never a link address", async () => {
    let state = {
      links: [{ id: "l1", label: "Co-op", createdAt: "2026-11-05T12:00:00.000Z", expiresAt: "2026-11-12T12:00:00.000Z" }],
      viewers: [{ id: "v1", name: "Pat Viewer", email: "pat@example.com", joinedAt: "2026-11-05T12:00:00.000Z" }],
    };
    fakeApi.on("GET /api/family/viewers", () => [200, state]);
    fakeApi.on("DELETE /api/family/view-links/l1", () => { state = { ...state, links: [] }; return [204, undefined]; });
    fakeApi.on("DELETE /api/family/viewers/v1", () => { state = { ...state, viewers: [] }; return [204, undefined]; });
    const user = await openSettings();
    const people = await within(card()).findByRole("list", { name: "People who can view" });
    expect(people).toHaveTextContent("Pat Viewer");
    expect(people).toHaveTextContent("pat@example.com");
    expect(card().textContent).not.toContain("/join/");
    await user.click(within(card()).getByRole("button", { name: /^Cancel link made .*\(Co-op\)/ }));
    expect(await within(card()).findByText("Link cancelled.")).toBeInTheDocument();
    // Remove asks first.
    await user.click(within(card()).getByRole("button", { name: "Remove Pat Viewer" }));
    expect(fakeApi.calls.some((c) => c.method === "DELETE" && c.path === "/api/family/viewers/v1")).toBe(false);
    await user.click(within(card()).getByRole("button", { name: "Yes, remove" }));
    expect(await within(card()).findByText("Pat Viewer was removed.")).toBeInTheDocument();
    expect(within(card()).queryByRole("list", { name: "People who can view" })).toBeNull();
  });

  it("Keep leaves the viewer alone", async () => {
    fakeApi.on("GET /api/family/viewers", 200, { links: [], viewers: [{ id: "v1", name: "Pat", email: "p@example.com", joinedAt: "2026-11-05T12:00:00.000Z" }] });
    const user = await openSettings();
    await user.click(await within(card()).findByRole("button", { name: "Remove Pat" }));
    await user.click(within(card()).getByRole("button", { name: "Keep" }));
    expect(within(card()).getByRole("button", { name: "Remove Pat" })).toBeInTheDocument();
    expect(fakeApi.calls.some((c) => c.method === "DELETE")).toBe(false);
  });

  it("says plainly when nobody has joined, and shows the server's message when a link can't be made", async () => {
    fakeApi.on("GET /api/family/viewers", 200, NONE);
    fakeApi.on("POST /api/family/view-links", 429, { error: "rate_limited", message: "Too many attempts. Wait a minute and try again." });
    const user = await openSettings();
    expect(await within(card()).findByText("No one has joined yet.")).toBeInTheDocument();
    await user.click(within(card()).getByRole("button", { name: "Create a sign-up link" }));
    expect(await within(card()).findByRole("alert")).toBeInTheDocument();
  });

  it("the demo family can't share view-only access", async () => {
    fakeApi.on("GET /api/me", 200, { ...DEMO_ME, demo: true });
    await openSettings();
    expect(await within(card()).findByText("The demo family can't share view-only access.")).toBeInTheDocument();
    expect(within(card()).queryByRole("button", { name: "Create a sign-up link" })).toBeNull();
  });
});

describe("the account switcher in the family menu (S15-01)", () => {
  const TWO = { ...DEMO_ME, accounts: [
    { familyId: DEMO_ME.familyId, familyName: "Demo family", role: "parent" as const, current: true },
    { familyId: "00000000-0000-4000-8000-0000000000c0", familyName: "Maple Co-op", role: "viewer" as const, current: false },
  ] };

  async function openMenu() {
    const user = userEvent.setup();
    renderAt("/");
    await user.click(await screen.findByRole("button", { name: "Family and settings" }));
    return { user, menu: await screen.findByRole("dialog") };
  }

  it("a single account has no Switch to", async () => {
    const { menu } = await openMenu();
    expect(within(menu).queryByRole("button", { name: /Switch to/ })).toBeNull();
    expect(within(menu).queryByRole("button", { name: /Leave/ })).toBeNull();
  });

  it("with a co-op it offers Switch to the co-op, marked View only, and asks the API to switch", async () => {
    fakeApi.on("GET /api/me", 200, TWO);
    fakeApi.on("POST /api/auth/switch", 200, { familyId: TWO.accounts[1]!.familyId, familyName: "Maple Co-op", role: "viewer" });
    const { user, menu } = await openMenu();
    expect(within(menu).getByText("View only")).toBeInTheDocument();
    await user.click(within(menu).getByRole("button", { name: "Switch to Maple Co-op" }));
    await waitFor(() => expect(fakeApi.calls.find((c) => c.path === "/api/auth/switch")?.body).toEqual({ familyId: TWO.accounts[1]!.familyId }));
  });

  it("an account that is no longer available says so", async () => {
    fakeApi.on("GET /api/me", 200, TWO);
    fakeApi.on("POST /api/auth/switch", 404, { error: "account_unavailable", message: "That account isn't available." });
    const { user, menu } = await openMenu();
    await user.click(within(menu).getByRole("button", { name: "Switch to Maple Co-op" }));
    expect(await within(menu).findByRole("alert")).toHaveTextContent("That account isn't available any more.");
  });
});

describe("joining a view-only link (S15-01)", () => {
  function setup(me: unknown = null) {
    fakeApi.on("GET /api/join/" + TOKEN, 200, { kind: "viewer", familyName: "Maple Co-op" });
    fakeApi.on("GET /api/me", me ? 200 : 401, me ?? { error: "unauthenticated" });
    const router = createMemoryRouter([{ element: <AuthProvider><Outlet /></AuthProvider>, children: [{ path: "/join/:token", element: <JoinPage /> }, { path: "/", element: <h1>Home</h1> }] }], { initialEntries: [`/join/${TOKEN}`] });
    render(<RouterProvider router={router} />);
    return router;
  }

  it("says what a viewer can do and asks for name, email and password", async () => {
    setup();
    expect(await screen.findByRole("heading", { name: "View Maple Co-op" })).toBeInTheDocument();
    expect(screen.getByText(/You can't change anything/)).toBeInTheDocument();
    expect(screen.getByLabelText("Your name")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Create my sign-in" })).toBeInTheDocument();
  });

  it("'I already have an account' signs in with the link and sends existing: true", async () => {
    fakeApi.on(`POST /api/join/${TOKEN}`, 201, { familyId: "f", familyName: "Maple Co-op", parentName: "Dana", kind: "viewer", role: "viewer" });
    const router = setup();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "I already have an account" }));
    expect(screen.queryByLabelText("Your name")).toBeNull();
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
    await user.type(screen.getByLabelText("Email"), "dana@example.com");
    await user.type(screen.getByLabelText("Password"), "my-password");
    await user.click(screen.getByRole("button", { name: "Sign in and join" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(fakeApi.calls.find((c) => c.path === `/api/join/${TOKEN}` && c.method === "POST")?.body).toEqual({ existing: true, email: "dana@example.com", password: "my-password" });
  });

  it("a wrong password for an existing account says so, in plain words", async () => {
    fakeApi.on(`POST /api/join/${TOKEN}`, 401, { error: "invalid_credentials", message: "That email and password don't match." });
    setup();
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "I already have an account" }));
    await user.type(screen.getByLabelText("Email"), "dana@example.com");
    await user.type(screen.getByLabelText("Password"), "nope-nope");
    await user.click(screen.getByRole("button", { name: "Sign in and join" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Email or password is incorrect.");
  });

  it("when already signed in: one button for that login, sent with useSession", async () => {
    fakeApi.on(`POST /api/join/${TOKEN}`, 201, { familyId: "f", familyName: "Maple Co-op", parentName: "Dana", kind: "viewer", role: "viewer" });
    const router = setup(DEMO_ME);
    const user = userEvent.setup();
    await user.click(await screen.findByRole("button", { name: "Join as Dana" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(fakeApi.calls.find((c) => c.path === `/api/join/${TOKEN}` && c.method === "POST")?.body).toEqual({ useSession: true });
  });

  it("a link that doesn't work shows the one plain message", async () => {
    fakeApi.on("GET /api/join/" + TOKEN, 404, { error: "invite_unavailable", message: "x" });
    fakeApi.on("GET /api/me", 401, { error: "unauthenticated" });
    const router = createMemoryRouter([{ element: <AuthProvider><Outlet /></AuthProvider>, children: [{ path: "/join/:token", element: <JoinPage /> }] }], { initialEntries: [`/join/${TOKEN}`] });
    render(<RouterProvider router={router} />);
    expect(await screen.findByRole("alert")).toHaveTextContent("This invite link has expired or was already used. Ask the person who sent it for a new one.");
  });
});
