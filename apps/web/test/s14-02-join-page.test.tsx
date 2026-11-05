import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../src/api/client";
import { INVITE_UNAVAILABLE, JoinPage } from "../src/features/join/JoinPage";
import { stub } from "./helpers/stub";

const apiGet = stub();
const apiPost = stub();
const refresh = stub();
vi.mock("../src/api/client", async (orig) => ({
  ...(await orig<typeof import("../src/api/client")>()),
  apiGet: (...a: unknown[]) => apiGet(...a),
  apiPost: (...a: unknown[]) => apiPost(...a),
}));
vi.mock("../src/auth/AuthProvider", () => ({ useAuth: () => ({ refresh: () => refresh() }) }));

const TOKEN = "T".repeat(43);
function setup() {
  const router = createMemoryRouter(
    [{ path: "/join/:token", element: <JoinPage /> }, { path: "/", element: <h1>Home</h1> }, { path: "/login", element: <h1>Sign in page</h1> }],
    { initialEntries: [`/join/${TOKEN}`] },
  );
  render(<RouterProvider router={router} />);
  return router;
}
async function fill(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Your name"), "Dana");
  await user.type(screen.getByLabelText("Email"), "dana@example.com");
  await user.type(screen.getByLabelText("Password"), "a-long-password");
}
beforeEach(() => { apiGet.reset(); apiPost.reset(); refresh.reset(); refresh.resolves(undefined); });

describe("the join page (S14-02)", () => {
  it("asks for name, email and a new password, with the right autocomplete", async () => {
    apiGet.resolves({ kind: "new_family", familyName: null });
    setup();
    expect(await screen.findByRole("heading", { name: "Welcome" })).toBeInTheDocument();
    expect(screen.getByLabelText("Your name")).toHaveAttribute("autocomplete", "name");
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "new-password");
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password");
    expect(apiGet.calls[0]).toEqual([`/api/join/${TOKEN}`]);
  });

  it("sends the form to this link, signs in and goes Home (where a new family lands in setup)", async () => {
    apiGet.resolves({ kind: "new_family", familyName: null });
    apiPost.resolves({ familyId: "f", familyName: "Our family", parentName: "Dana", kind: "new_family" });
    const router = setup();
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "Welcome" });
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Create my sign-in" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
    expect(apiPost.calls[0]).toEqual([`/api/join/${TOKEN}`, { name: "Dana", email: "dana@example.com", password: "a-long-password" }]);
    expect(refresh.calls).toHaveLength(1);
  });

  it("a link for another parent says which family it joins", async () => {
    apiGet.resolves({ kind: "parent", familyName: "Smith family" });
    setup();
    expect(await screen.findByRole("heading", { name: "Join Smith family" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Join" })).toBeInTheDocument();
  });

  it("a link that does not work shows the one plain message and no form", async () => {
    apiGet.rejects(new ApiError(404, "invite_unavailable", INVITE_UNAVAILABLE));
    setup();
    expect(await screen.findByRole("alert")).toHaveTextContent(INVITE_UNAVAILABLE);
    expect(INVITE_UNAVAILABLE).toBe("This invite link has expired or was already used. Ask the person who sent it for a new one.");
    expect(screen.queryByLabelText("Password")).not.toBeInTheDocument();
    expect(screen.queryByText(new RegExp(TOKEN))).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login");
  });

  it("a link used up between looking and sending shows the same message", async () => {
    apiGet.resolves({ kind: "new_family", familyName: null });
    apiPost.rejects(new ApiError(404, "invite_unavailable", INVITE_UNAVAILABLE));
    setup();
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "Welcome" });
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Create my sign-in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(INVITE_UNAVAILABLE);
  });

  it("shows the server's plain message for a taken email or a short password, and keeps what was typed", async () => {
    apiGet.resolves({ kind: "new_family", familyName: null });
    apiPost.rejects(new ApiError(409, "email_in_use", "That email is already used for a sign-in. Try a different one."));
    setup();
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "Welcome" });
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Create my sign-in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That email is already used for a sign-in. Try a different one.");
    expect(screen.getByLabelText("Email")).toHaveValue("dana@example.com");
    expect(screen.getByRole("button", { name: "Create my sign-in" })).toBeEnabled();
  });

  it("a throttled try says to wait", async () => {
    apiGet.resolves({ kind: "new_family", familyName: null });
    apiPost.rejects(new ApiError(429, "rate_limited", "Too many attempts. Wait a minute and try again."));
    setup();
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "Welcome" });
    await fill(user);
    await user.click(screen.getByRole("button", { name: "Create my sign-in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Too many tries. Please wait a minute and try again.");
  });

  it("asks the browser not to send the link as a referrer", async () => {
    apiGet.resolves({ kind: "new_family", familyName: null });
    setup();
    await screen.findByRole("heading", { name: "Welcome" });
    expect(document.head.querySelector('meta[name="referrer"]')).toHaveAttribute("content", "no-referrer");
  });
});
