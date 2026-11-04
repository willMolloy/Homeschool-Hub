/** S12-09: the Sprint 11 re-test's Lows. N7 the setup header at 320 px, N8 clearing a saved school year, N9 the icons hint's words and width. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { clearSetupLater } from "../src/features/welcome/setupLater";
import { TIP_TEXT } from "../src/features/tips/tips";
import { fakeApi } from "./helpers/fake-api";
import { familyPatches, newFamily } from "./helpers/setup-flow";
import { renderAt } from "./render";

const css = (path: string) => readFileSync(join(process.cwd(), path), "utf8");
beforeEach(() => { clearSetupLater(); sessionStorage.clear(); });

describe("N7: the setup header at 320 px", () => {
  it("keeps the wordmark and Sign out on one line each (nowrap), the wordmark a little smaller under 360 px", () => {
    const welcome = css("src/features/welcome/welcome.css");
    expect(welcome).toMatch(/\.welcome-top \.logo b, \.welcome-top \.btn \{ white-space: nowrap; \}/);
    expect(welcome).toMatch(/@media \(max-width: 359\.98px\) \{ \.welcome-top \.logo b \{ font-size: 1\.05rem; \} \}/);
  });
  it("Sign out is still a button with its own name on every step", async () => {
    newFamily({ setupStep: 2 });
    renderAt("/welcome");
    expect(await screen.findByRole("button", { name: "Sign out" })).toBeInTheDocument();
  });
});

describe("N8: 'I'll set this later' after a year was saved", () => {
  async function atYearWithSaved() {
    const f = newFamily({ setupStep: 4 });
    f.schoolYear = { start: "2026-08-17", end: "2027-05-21" };
    const user = userEvent.setup();
    renderAt("/welcome");
    await screen.findByRole("heading", { level: 1, name: "When is your school year?" });
    await screen.findByLabelText("First day");
    return { f, user };
  }
  const later = () => screen.getByRole("radio", { name: /^I'll set this later/ });

  it("asks 'Clear the saved dates?' and saves nothing until the parent says yes; Cancel keeps the year and the step", async () => {
    const { f, user } = await atYearWithSaved();
    await user.click(later());
    await user.click(screen.getByRole("button", { name: "Continue" }));
    const dialog = await screen.findByRole("dialog", { name: "Clear the saved dates?" });
    expect(dialog).toHaveTextContent("Aug 17, 2026 to May 21, 2027");
    expect(dialog).toHaveTextContent("Breaks and term views you already added stay.");
    expect(familyPatches()).toEqual([]);
    await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
    await waitFor(() => expect(screen.queryByRole("dialog", { name: "Clear the saved dates?" })).toBeNull());
    expect(familyPatches()).toEqual([]);
    expect(f.schoolYear).not.toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "When is your school year?" })).toBeInTheDocument();
  });

  it("yes clears the dates (schoolYear: null), puts the year off and moves on; Back shows 'later' chosen and no dates", async () => {
    const { f, user } = await atYearWithSaved();
    await user.click(later());
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(await screen.findByRole("button", { name: "Clear the dates" }));
    await screen.findByText("Step 5 of 6");
    expect(familyPatches()).toEqual([{ schoolYear: null, setupDeferred: ["year"], setupStep: 5 }]);
    expect(f.schoolYear).toBeNull();
    expect(f.me.setupDeferred).toEqual(["year"]);
    await user.click(screen.getByRole("button", { name: /Back/ }));
    await screen.findByRole("heading", { level: 1, name: "When is your school year?" });
    await waitFor(() => expect(later()).toBeChecked());
    expect(screen.queryByLabelText("First day")).toBeNull();
  });

  it("with no year saved there is nothing to clear, so no question", async () => {
    newFamily({ setupStep: 4 });
    const user = userEvent.setup();
    renderAt("/welcome");
    await screen.findByLabelText("First day");
    await user.click(later());
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Step 5 of 6");
    expect(familyPatches()).toEqual([{ setupDeferred: ["year"], setupStep: 5 }]);
  });

  it("the API takes the null (a school year can be cleared)", () => {
    expect(readFileSync(join(process.cwd(), "../api/src/routes/family.ts"), "utf8")).toMatch(/schoolYear: SchoolYear\.nullable\(\)\.optional\(\)/);
    expect(fakeApi.bodyKeyViolations).toEqual([]);
  });
});

describe("N9: the icons hint", () => {
  it("names what to tap and where", () => {
    expect(TIP_TEXT.icons).toBe("Tap an icon in the left column to see the subject's name.");
  });
  it("its banner is no wider than the content column from 600 px", () => {
    expect(css("src/features/tips/tips.css")).toMatch(/@media \(min-width: 600px\) \{ \.tip-top \{ max-width: min\(var\(--content-max, 640px\), calc\(100% - 2 \* var\(--page-pad, 20px\)\)\); \} \}/);
  });
});
