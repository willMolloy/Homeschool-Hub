import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../src/api/client";
import { LoginPage } from "../src/routes/LoginPage";
import { stub } from "./helpers/stub";

const apiPost = stub();
vi.mock("../src/api/client", async (orig) => ({
  ...(await orig<typeof import("../src/api/client")>()),
  apiPost: (...a: unknown[]) => apiPost(...a),
}));

function setup(state?: unknown) {
  const router = createMemoryRouter(
    [
      { path: "/login", element: <LoginPage /> },
      { path: "/", element: <h1>Plan</h1> },
      { path: "/kids", element: <h1>Kids</h1> },
    ],
    { initialEntries: [{ pathname: "/login", state }] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

async function fillAndSubmit() {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText("Email"), "demo@example.com");
  await user.type(screen.getByLabelText("Password"), "demo-password");
  await user.click(screen.getByRole("button", { name: "Sign in" }));
}

beforeEach(() => apiPost.reset());

describe("LoginPage", () => {
  it("has labelled inputs with the right autocomplete", () => {
    setup();
    expect(screen.getByLabelText("Email")).toHaveAttribute("autocomplete", "username");
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Password")).toHaveAttribute("autocomplete", "current-password");
  });

  it("success navigates to /", async () => {
    apiPost.resolves({ familyId: "f", familyName: "Demo" });
    setup();
    await fillAndSubmit();
    expect(await screen.findByRole("heading", { name: "Plan" })).toBeInTheDocument();
    expect(apiPost.calls).toEqual([["/api/auth/login", { email: "demo@example.com", password: "demo-password" }]]);
  });

  it("success returns to the page the user wanted", async () => {
    apiPost.resolves({ familyId: "f", familyName: "Demo" });
    setup({ from: { pathname: "/kids", search: "", hash: "" } });
    await fillAndSubmit();
    expect(await screen.findByRole("heading", { name: "Kids" })).toBeInTheDocument();
  });

  it.each([
    [401, "invalid_credentials", "Email or password is incorrect."],
    [429, "rate_limited", "Too many attempts, wait a minute."],
    [0, "network", "Can't reach the server."],
  ] as const)("%i %s shows its message", async (status, code, msg) => {
    apiPost.rejects(new ApiError(status, code));
    setup();
    await fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent(msg);
    expect(screen.getByRole("button", { name: "Sign in" })).toBeEnabled();
  });

  it("button is disabled while pending", async () => {
    const p = apiPost.pending();
    setup();
    await fillAndSubmit();
    expect(screen.getByRole("button", { name: "Signing in…" })).toBeDisabled();
    p.resolve({ familyId: "f", familyName: "Demo" });
    expect(await screen.findByRole("heading", { name: "Plan" })).toBeInTheDocument();
  });
});
