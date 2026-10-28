import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { apiGet } from "../src/api/client";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

describe("auth", () => {
  it("me=401 → redirected to /login, remembering the page", async () => {
    fakeApi.on("GET /api/me", 401, { error: "unauthenticated" });
    const { router } = renderAt("/kids");
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
    expect((router.state.location.state as { from: { pathname: string } }).from.pathname).toBe("/kids");
  });

  it("me=200 → page renders with the family name in the header", async () => {
    renderAt("/kids");
    expect(await screen.findByRole("heading", { name: "Kids" })).toBeInTheDocument();
    expect(within(screen.getByRole("banner")).getByText("Demo family")).toBeInTheDocument();
  });

  it("shows a loading state until /api/me answers", async () => {
    let answer!: () => void;
    fakeApi.on("GET /api/me", () => new Promise((r) => (answer = () => r([200, { familyId: "f", name: "Late family", weekStart: "mon", schoolDays: [1] }]))));
    renderAt("/");
    expect(await screen.findByRole("status")).toHaveTextContent("Loading");
    // The skeleton can render before the request reaches the fake API; wait for it.
    await waitFor(() => expect(answer).toBeTypeOf("function"));
    answer();
    expect(await screen.findByText("Late family")).toBeInTheDocument();
  });

  it("server unreachable → Try again, which retries /api/me", async () => {
    fakeApi.offline();
    renderAt("/");
    expect(await screen.findByRole("alert")).toHaveTextContent("Can't reach the server.");
    fakeApi.reset();
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByRole("heading", { name: "Plan" })).toBeInTheDocument();
  });

  it("fresh session: /kids → login → back on /kids", async () => {
    let signedIn = false;
    fakeApi.on("GET /api/me", () => (signedIn ? [200, { familyId: "f", name: "Demo family", weekStart: "mon", schoolDays: [1] }] : [401, { error: "unauthenticated" }]));
    fakeApi.on("POST /api/auth/login", () => ((signedIn = true), [200, { familyId: "f", familyName: "Demo family" }]));
    const { router } = renderAt("/kids");
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Email"), "demo@example.com");
    await user.type(screen.getByLabelText("Password"), "demo-password");
    await user.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("heading", { name: "Kids" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/kids");
  });

  it("Sign out calls logout, clears state, and returns to /login", async () => {
    const { router } = renderAt("/subjects");
    await screen.findByRole("heading", { name: "Subjects" });
    await userEvent.setup().click(screen.getByRole("button", { name: "Sign out" }));
    expect(await screen.findByRole("heading", { name: "Sign in" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/login");
    expect(fakeApi.calls.some((c) => c.method === "POST" && c.path === "/api/auth/logout")).toBe(true);
    expect(screen.queryByText("Demo family")).toBeNull();
  });

  it("a 401 from any later call (expired session) sends the user to /login", async () => {
    const { router } = renderAt("/");
    await screen.findByRole("heading", { name: "Plan" });
    fakeApi.on("GET /api/children", 401, { error: "unauthenticated" });
    await apiGet("/api/children").catch(() => {});
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
  });
});
