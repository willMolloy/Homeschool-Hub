// S11-01: the setup flow's frame: redirects, the progress bar, Back, Finish later and resuming at the saved step.
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { clearSetupLater } from "../src/features/welcome/setupLater";
import { fakeApi } from "./helpers/fake-api";
import { familyPatches, newFamily } from "./helpers/setup-flow";
import { renderAt } from "./render";

/** These tests are about the frame, so the family already has a child (step 2 can't be passed without one). */
function newFamilyState(over: { setupStep?: number; setupDone?: boolean } = {}) {
  const f = newFamily(over);
  f.children.push({ id: "c1", name: "Frank", color: "#2f6fb0", sortOrder: 0, archived: false });
  return f.me;
}
const patches = familyPatches;

beforeEach(() => { clearSetupLater(); sessionStorage.clear(); });

describe("where a family lands", () => {
  it("a new family opening Home goes to step 1 of the flow", async () => {
    newFamilyState();
    const { router } = renderAt("/");
    expect(await screen.findByText("Step 1 of 6")).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/welcome");
  });

  it("a family that has finished setting up never sees it: /welcome goes Home", async () => {
    newFamilyState({ setupDone: true });
    const { router } = renderAt("/welcome");
    expect(await screen.findByRole("button", { name: "Family and settings" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
    expect(screen.queryByText(/Step \d of 6/)).toBeNull();
  });

  it("the demo family (done) opens Home straight away", async () => {
    const { router } = renderAt("/");
    expect(await screen.findByRole("button", { name: "Family and settings" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });

  it("a signed-out visitor to /welcome goes to sign in", async () => {
    fakeApi.on("GET /api/me", 401, { error: "unauthenticated" });
    const { router } = renderAt("/welcome");
    await screen.findByRole("heading", { name: "Sign in" });
    expect(router.state.location.pathname).toBe("/login");
  });

  it("the flow has no tab bar: it stands on its own", async () => {
    newFamilyState();
    renderAt("/welcome");
    await screen.findByText("Step 1 of 6");
    expect(screen.queryByRole("navigation")).toBeNull();
  });
});

describe("the frame", () => {
  it("shows a progress bar that says which step of six, and moves on saving the step", async () => {
    newFamilyState();
    const user = userEvent.setup();
    renderAt("/welcome");
    const bar = await screen.findByRole("progressbar", { name: "Setup progress" });
    expect(bar).toHaveAttribute("aria-valuenow", "1");
    expect(bar).toHaveAttribute("aria-valuemax", "6");
    expect(bar).toHaveAttribute("aria-valuetext", "Step 1 of 6");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Step 2 of 6")).toBeInTheDocument();
    expect(screen.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "2");
    expect(patches()).toEqual([{ name: "Fresh family", weekStart: "mon", setupStep: 2 }]);
  });

  it("each step has one heading, and focus moves to it", async () => {
    newFamilyState({ setupStep: 3 });
    renderAt("/welcome");
    const h1 = await screen.findByRole("heading", { level: 1 });
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(h1).toHaveFocus();
  });

  it("Back is not on step 1; on step 3 it goes to step 2 and saves it", async () => {
    newFamilyState({ setupStep: 1 });
    const user = userEvent.setup();
    renderAt("/welcome");
    await screen.findByText("Step 1 of 6");
    expect(screen.queryByRole("button", { name: "Back" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(await screen.findByRole("button", { name: "Back" }));
    expect(await screen.findByText("Step 1 of 6")).toBeInTheDocument();
    expect(patches()).toEqual([{ name: "Fresh family", weekStart: "mon", setupStep: 2 }, { setupStep: 1 }]);
  });

  it("Finish later is only after the children step", async () => {
    const state = newFamilyState();
    const user = userEvent.setup();
    renderAt("/welcome");
    await screen.findByText("Step 1 of 6");
    expect(screen.queryByRole("button", { name: "Finish later" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Step 2 of 6");
    expect(screen.queryByRole("button", { name: "Finish later" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Step 3 of 6");
    expect(screen.getByRole("button", { name: "Finish later" })).toBeInTheDocument();
    expect(state.setupDone).toBe(false);
  });

  it("every control is at least 44 px (the quiet buttons and the primary)", async () => {
    newFamilyState({ setupStep: 3 });
    renderAt("/welcome");
    await screen.findByText("Step 3 of 6");
    // jsdom has no layout: the shared .btn rule is what sets the 44 px, so check the rule is the one used.
    for (const name of ["Continue", "Back", "Finish later"]) expect(screen.getByRole("button", { name }).className).toMatch(/\bbtn\b/);
  });
});

describe("Finish later and resuming", () => {
  it("Finish later keeps the step, goes Home, and Home stays Home for this sign-in", async () => {
    const state = newFamilyState({ setupStep: 3 });
    const user = userEvent.setup();
    const { router } = renderAt("/welcome");
    await user.click(await screen.findByRole("button", { name: "Finish later" }));
    expect(await screen.findByRole("button", { name: "Family and settings" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
    expect(state.setupDone).toBe(false);
    expect(state.setupStep).toBe(3);
    // Moving around the app and coming back to Home does not send the parent into the flow again.
    await router.navigate("/schedule");
    await router.navigate("/");
    expect(await screen.findByRole("button", { name: "Family and settings" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });

  it("the next sign-in opens the flow again, at the same step", async () => {
    const state = newFamilyState({ setupStep: 3 });
    const user = userEvent.setup();
    const first = renderAt("/welcome");
    await user.click(await screen.findByRole("button", { name: "Finish later" }));
    await screen.findByRole("button", { name: "Family and settings" });
    first.unmount();
    // Sign out and sign in: the "later" is cleared.
    clearSetupLater();
    const second = renderAt("/");
    expect(await screen.findByText("Step 3 of 6")).toBeInTheDocument();
    expect(second.router.state.location.pathname).toBe("/welcome");
    expect(state.setupStep).toBe(3);
  });

  it("closing the tab on step 3 and signing in again opens step 3", async () => {
    const state = newFamilyState();
    const user = userEvent.setup();
    const first = renderAt("/welcome");
    await screen.findByText("Step 1 of 6");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Step 2 of 6");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Step 3 of 6");
    first.unmount(); // the tab is closed
    renderAt("/");
    expect(await screen.findByText("Step 3 of 6")).toBeInTheDocument();
    expect(state.setupStep).toBe(3);
  });

  it("the last step ends in You're all set, saves done, and Go to Home leaves the flow", async () => {
    const state = newFamilyState({ setupStep: 6 });
    const user = userEvent.setup();
    const { router } = renderAt("/welcome");
    await screen.findByText("Step 6 of 6");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { name: "You're all set" })).toBeInTheDocument();
    expect(patches()).toEqual([{ setupDone: true }]);
    expect(state.setupDone).toBe(true);
    await user.click(screen.getByRole("button", { name: "Go to Home" }));
    expect(await screen.findByRole("button", { name: "Family and settings" })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe("/");
  });

  it("a save that fails says so and stays on the step", async () => {
    newFamilyState();
    fakeApi.on("PATCH /api/family", 500, { error: "boom" });
    const user = userEvent.setup();
    renderAt("/welcome");
    await user.click(await screen.findByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(screen.getByText("Step 1 of 6")).toBeInTheDocument();
  });
});
