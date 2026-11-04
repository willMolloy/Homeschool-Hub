// S11-05: step 6 of the setup flow (subjects), "You're all set", and the Home reminders after it.
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { COMMON_SUBJECTS } from "../src/features/roster/commonSubjects";
import { PALETTE } from "../src/features/roster/palette";
import { clearSetupLater } from "../src/features/welcome/setupLater";
import { fakeApi } from "./helpers/fake-api";
import { familyPatches, newFamily, type NewFamily } from "./helpers/setup-flow";
import { renderAt } from "./render";

beforeEach(() => { clearSetupLater(); sessionStorage.clear(); localStorage.clear(); });
const subjectPosts = () => fakeApi.calls.filter((c) => c.method === "POST" && c.path === "/api/subjects").map((c) => c.body);
const chips = () => within(screen.getByRole("group", { name: "Subjects" })).getAllByRole("button");

async function atSubjects(f: NewFamily = newFamily({ setupStep: 6 })) {
  f.children.push({ id: "c1", name: "Frank", color: PALETTE[0], sortOrder: 0, archived: false });
  const user = userEvent.setup();
  renderAt("/welcome");
  await screen.findByRole("heading", { level: 1, name: "What will you teach?" });
  await screen.findByRole("group", { name: "Subjects" });
  return { f, user };
}

describe("step 6: subjects", () => {
  it("shows the 14 starter subjects as chips with their icons, none ticked", async () => {
    await atSubjects();
    expect(chips().map((c) => c.textContent)).toEqual([...COMMON_SUBJECTS]);
    expect(chips()).toHaveLength(14);
    for (const c of chips()) {
      expect(c).toHaveAttribute("aria-pressed", "false");
      expect(c.querySelector("svg")).not.toBeNull(); // every starter subject has an icon, never the letter
    }
  });

  it("Continue is off until a subject is ticked; Skip is always there", async () => {
    await atSubjects();
    expect(screen.getByRole("button", { name: "Continue" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Skip" })).toBeEnabled();
  });

  it("ticking Math and Literature creates both with their own colours and default icons, then You're all set", async () => {
    const { f, user } = await atSubjects();
    await user.click(screen.getByRole("button", { name: "Math" }));
    await user.click(screen.getByRole("button", { name: "Literature" }));
    expect(screen.getByRole("button", { name: "Math" })).toHaveAttribute("aria-pressed", "true");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByRole("heading", { name: "You're all set" })).toBeInTheDocument();
    expect(subjectPosts()).toEqual([{ name: "Math", color: PALETTE[0] }, { name: "Literature", color: PALETTE[1] }]);
    expect(f.subjects.map((s) => [s.name, s.icon])).toEqual([["Math", "calculator"], ["Literature", "book"]]);
    expect(familyPatches()).toEqual([{ setupDone: true }]);
  });

  it("Add your own puts a ticked chip in the list, and it is created on Continue", async () => {
    const { f, user } = await atSubjects();
    await user.type(screen.getByLabelText("Add your own"), "Chess club");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByRole("button", { name: "Chess club" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Add your own")).toHaveValue("");
    await user.type(screen.getByLabelText("Add your own"), "math");
    await user.click(screen.getByRole("button", { name: "Add" }));
    expect(screen.getByRole("button", { name: "Math" })).toHaveAttribute("aria-pressed", "true");
    expect(chips()).toHaveLength(15);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { name: "You're all set" });
    expect(f.subjects.map((s) => s.name)).toEqual(["Chess club", "Math"]);
  });

  it("Skip creates nothing and goes on", async () => {
    const { f, user } = await atSubjects();
    await user.click(screen.getByRole("button", { name: "Math" }));
    await user.click(screen.getByRole("button", { name: "Skip" }));
    expect(await screen.findByRole("heading", { name: "You're all set" })).toBeInTheDocument();
    expect(subjectPosts()).toEqual([]);
    expect(f.subjects).toEqual([]);
  });

  it("subjects the family already has show ticked and are not made twice", async () => {
    const f = newFamily({ setupStep: 6 });
    f.subjects.push({ id: "s1", name: "Math", color: PALETTE[0], sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null, icon: "calculator" });
    const { user } = await atSubjects(f);
    await screen.findByRole("button", { name: "Math", pressed: true });
    expect(screen.getByRole("button", { name: "Math" })).toBeDisabled();
    await user.click(screen.getByRole("button", { name: "Science" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByRole("heading", { name: "You're all set" });
    expect(subjectPosts()).toEqual([{ name: "Science", color: PALETTE[1] }]);
  });

  it("a refused subject is explained, the ones already made stay, and the step stays", async () => {
    const { f, user } = await atSubjects();
    await user.click(screen.getByRole("button", { name: "Math" }));
    await user.click(screen.getByRole("button", { name: "Reading" }));
    let n = 0;
    fakeApi.on("POST /api/subjects", (body) => {
      if (++n === 2) return [409, { error: "conflict", message: "name: A subject named Reading already exists." }];
      const b = body as { name: string; color: string };
      f.subjects.push({ id: "s1", name: b.name, color: b.color, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null, icon: null });
      return [201, f.subjects[0]];
    });
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("A subject named Reading already exists.")).toBeInTheDocument();
    expect(screen.getByText("Step 6 of 6")).toBeInTheDocument();
    expect(f.subjects.map((s) => s.name)).toEqual(["Math"]);
  });
});

describe("You're all set, then Home", () => {
  it("a parent who put breaks off ticks Math and Literature, lands on Home and sees only that reminder", async () => {
    const f = newFamily({ setupStep: 6, setupDeferred: ["breaks"] });
    const { user } = await atSubjects(f);
    await user.click(screen.getByRole("button", { name: "Math" }));
    await user.click(screen.getByRole("button", { name: "Literature" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(await screen.findByRole("button", { name: "Go to Home" }));
    const list = within(await screen.findByRole("region", { name: "Getting started" }));
    expect(list.getAllByRole("link").map((l) => l.textContent)).toEqual(["Add your breaks"]);
    expect(screen.queryByText(/books and lessons/i)).toBeNull(); // no prompt for a first assignment
    expect(screen.queryByRole("link", { name: /Add your first assignment/ })).toBeNull();
  });

  it("a parent who deferred nothing lands on Home with no checklist at all", async () => {
    const f = newFamily({ setupStep: 6 });
    const { user } = await atSubjects(f);
    await user.click(screen.getByRole("button", { name: "Math" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(await screen.findByRole("button", { name: "Go to Home" }));
    await screen.findByRole("button", { name: "Family and settings" });
    await screen.findByText("This week and your year");
    expect(screen.queryByRole("region", { name: "Getting started" })).toBeNull();
  });

  it("both put off: the school year and the breaks, nothing about assignments", async () => {
    const f = newFamily({ setupStep: 6, setupDeferred: ["year", "breaks"] });
    const { user } = await atSubjects(f);
    await user.click(screen.getByRole("button", { name: "Skip" }));
    await user.click(await screen.findByRole("button", { name: "Go to Home" }));
    const list = within(await screen.findByRole("region", { name: "Getting started" }));
    // Skipping the subjects leaves none, so that row is there too (the one empty list the ticket keeps).
    expect(list.getAllByRole("link").map((l) => l.textContent)).toEqual(["Set your school year", "Add your breaks", "Add subjects"]);
  });
});
