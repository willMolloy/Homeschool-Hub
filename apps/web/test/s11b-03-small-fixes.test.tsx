// S11b-03: N3 (the colour dot is round), N4 (Skip on subjects leaves no reminder), N5 (hints cover nothing), N6 (Sign out on every step).
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { clearSetupLater } from "../src/features/welcome/setupLater";
import { fakeApi } from "./helpers/fake-api";
import { newFamily } from "./helpers/setup-flow";
import { renderAt } from "./render";

beforeEach(() => { clearSetupLater(); sessionStorage.clear(); localStorage.clear(); });
const css = readFileSync(join(__dirname, "../src/features/welcome/welcome.css"), "utf8");

describe("N3: the colour dot beside a saved child is round", () => {
  it("only the name takes the spare width; the dot keeps its own size", async () => {
    const f = newFamily({ setupStep: 2 });
    f.children.push({ id: "c1", name: "Frank", color: "#2f6fb0", sortOrder: 0, archived: false });
    renderAt("/welcome");
    await screen.findByText("Frank");
    const item = screen.getByRole("list", { name: "Your children" }).querySelector("li")!;
    expect(item.children[0]).toHaveClass("color-dot");
    expect(item.children[1]).toHaveClass("welcome-list-name");
    expect(css).toMatch(/\.welcome-list-name\s*\{[^}]*flex:\s*1/);
    expect(css).toMatch(/\.color-dot\s*\{[^}]*flex:\s*none/);
    expect(css).not.toMatch(/\.welcome-list li > span\s*\{/); // the rule that stretched the dot
  });
});

describe("N4: Skip on the subjects step leaves no reminder", () => {
  it("Home shows no 'Add subjects' after Skip, with children added", async () => {
    const f = newFamily({ setupStep: 6 });
    f.children.push({ id: "c1", name: "Frank", color: "#2f6fb0", sortOrder: 0, archived: false });
    const user = userEvent.setup();
    renderAt("/welcome");
    await user.click(await screen.findByRole("button", { name: "Skip" }));
    await user.click(await screen.findByRole("button", { name: "Go to Home" }));
    await screen.findByRole("button", { name: "Family and settings" });
    await screen.findByText("This week and your year");
    expect(screen.queryByRole("region", { name: "Getting started" })).toBeNull();
    expect(screen.queryByText("Add subjects")).toBeNull();
  });
});

describe("N6: a way out on every step", () => {
  it.each([1, 2, 3, 4, 5, 6])("step %i has a quiet Sign out in the header; Finish later is only from step 3", async (step) => {
    const f = newFamily({ setupStep: step });
    f.children.push({ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false });
    renderAt("/welcome");
    await screen.findByText(`Step ${step} of 6`);
    const header = document.querySelector(".welcome-top") as HTMLElement;
    const out = within(header).getByRole("button", { name: "Sign out" });
    expect(out.className).toMatch(/btn-quiet/);
    expect(!!screen.queryByRole("button", { name: "Finish later" })).toBe(step >= 3);
  });

  it("Sign out signs out and goes to sign in, leaving the step where it was", async () => {
    const f = newFamily({ setupStep: 2 });
    f.children.push({ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false });
    const user = userEvent.setup();
    const { router } = renderAt("/welcome");
    await screen.findByText("Step 2 of 6");
    await user.click(screen.getByRole("button", { name: "Sign out" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/login"));
    expect(fakeApi.calls.some((c) => c.method === "POST" && c.path === "/api/auth/logout")).toBe(true);
    expect(f.me.setupStep).toBe(2);
  });

  it("the all-set screen has it too", async () => {
    newFamily({ setupStep: 6 });
    const user = userEvent.setup();
    renderAt("/welcome");
    await user.click(await screen.findByRole("button", { name: "Skip" }));
    await screen.findByRole("heading", { name: "You're all set" });
    expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});
