// S11-02: steps 1 to 3 of the setup flow: the family, the children (the one required step) and the school days.
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { PALETTE } from "../src/features/roster/palette";
import { clearSetupLater } from "../src/features/welcome/setupLater";
import { fakeApi } from "./helpers/fake-api";
import { familyPatches, newFamily } from "./helpers/setup-flow";
import { renderAt } from "./render";

beforeEach(() => { clearSetupLater(); sessionStorage.clear(); });
const childPosts = () => fakeApi.calls.filter((c) => c.method === "POST" && c.path === "/api/children").map((c) => c.body);

describe("step 1: your family", () => {
  it("asks for the family's name (as it stands) and the week start, Monday to begin with", async () => {
    newFamily();
    renderAt("/welcome");
    expect(await screen.findByRole("heading", { level: 1, name: "What should we call your family?" })).toBeInTheDocument();
    expect(screen.getByLabelText("Family name")).toHaveValue("Fresh family");
    const week = screen.getByRole("group", { name: "Our week starts on" });
    expect(within(week).getByRole("button", { name: "Monday" })).toHaveAttribute("aria-pressed", "true");
    expect(within(week).getByRole("button", { name: "Sunday" })).toHaveAttribute("aria-pressed", "false");
  });

  it("saves the name and Sunday through the family API and moves to step 2", async () => {
    newFamily();
    const user = userEvent.setup();
    renderAt("/welcome");
    const name = await screen.findByLabelText("Family name");
    await user.clear(name);
    await user.type(name, "  The Smiths ");
    await user.click(screen.getByRole("button", { name: "Sunday" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Step 2 of 6")).toBeInTheDocument();
    expect(familyPatches()).toEqual([{ name: "The Smiths", weekStart: "sun", setupStep: 2 }]);
  });

  it("a blank name is not saved", async () => {
    newFamily();
    const user = userEvent.setup();
    renderAt("/welcome");
    await user.clear(await screen.findByLabelText("Family name"));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Give your family a name.")).toBeInTheDocument();
    expect(familyPatches()).toEqual([]);
    expect(screen.getByText("Step 1 of 6")).toBeInTheDocument();
  });
});

describe("step 2: your children", () => {
  const atChildren = (f = newFamily({ setupStep: 2 })) => { renderAt("/welcome"); return f; };

  it("is required: no Skip, no Finish later, and Continue with nobody added says so", async () => {
    atChildren();
    const user = userEvent.setup();
    await screen.findByRole("heading", { name: "Who are you teaching?" });
    expect(screen.queryByRole("button", { name: /skip/i })).toBeNull();
    expect(screen.queryByRole("button", { name: "Finish later" })).toBeNull();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Add at least one child to continue.")).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 6")).toBeInTheDocument();
    expect(childPosts()).toEqual([]);
  });

  it("Add another saves the child with the next colour and clears the box", async () => {
    atChildren();
    const user = userEvent.setup();
    const box = await screen.findByLabelText("Child's name");
    expect(screen.getByRole("button", { name: "Add another" })).toBeDisabled();
    await user.type(box, "Frank");
    await user.click(screen.getByRole("button", { name: "Add another" }));
    const list = within(await screen.findByRole("list", { name: "Your children" }));
    expect(list.getByText("Frank")).toBeInTheDocument();
    expect(screen.getByLabelText("Another child's name")).toHaveValue("");
    expect(screen.getByLabelText("Another child's name")).toHaveFocus();
    await user.type(screen.getByLabelText("Another child's name"), "Margaret");
    await user.click(screen.getByRole("button", { name: "Add another" }));
    await within(await screen.findByRole("list", { name: "Your children" })).findByText("Margaret");
    expect(childPosts()).toEqual([{ name: "Frank", color: PALETTE[0] }, { name: "Margaret", color: PALETTE[1] }]);
  });

  it("a name left in the box is added on Continue", async () => {
    atChildren();
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Child's name"), "Frank");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Step 3 of 6")).toBeInTheDocument();
    expect(childPosts()).toEqual([{ name: "Frank", color: PALETTE[0] }]);
    expect(familyPatches()).toEqual([{ setupStep: 3 }]);
  });

  it("children already added (the tab was closed) are shown, and Continue needs no more", async () => {
    const f = newFamily({ setupStep: 2 });
    f.children.push({ id: "c1", name: "Frank", color: PALETTE[0], sortOrder: 0, archived: false });
    atChildren(f);
    const user = userEvent.setup();
    await within(await screen.findByRole("list", { name: "Your children" })).findByText("Frank");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Step 3 of 6")).toBeInTheDocument();
    expect(childPosts()).toEqual([]);
  });

  it("a name the server refuses is explained and nothing moves on", async () => {
    atChildren();
    fakeApi.on("POST /api/children", 409, { error: "conflict", message: "name: A child named Frank already exists." });
    const user = userEvent.setup();
    await user.type(await screen.findByLabelText("Child's name"), "Frank");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("A child named Frank already exists.")).toBeInTheDocument();
    expect(screen.getByText("Step 2 of 6")).toBeInTheDocument();
  });
});

describe("step 3: school days", () => {
  it("shows seven day chips with Monday to Friday ticked", async () => {
    newFamily({ setupStep: 3 });
    renderAt("/welcome");
    const days = within(await screen.findByRole("group", { name: "School days" }));
    const boxes = days.getAllByRole("checkbox");
    expect(boxes).toHaveLength(7);
    expect(boxes.filter((b) => (b as HTMLInputElement).checked).map((b) => b.getAttribute("aria-label"))).toEqual(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
  });

  it("needs at least one day", async () => {
    newFamily({ setupStep: 3 });
    const user = userEvent.setup();
    renderAt("/welcome");
    const days = within(await screen.findByRole("group", { name: "School days" }));
    for (const b of days.getAllByRole("checkbox")) if ((b as HTMLInputElement).checked) await user.click(b);
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Pick at least one school day.")).toBeInTheDocument();
    expect(familyPatches()).toEqual([]);
  });
});

describe("the three steps together", () => {
  it("a parent names the family, adds two children and picks Mon–Thu; Set up shows the same", async () => {
    newFamily();
    const user = userEvent.setup();
    const { router } = renderAt("/welcome");
    const name = await screen.findByLabelText("Family name");
    await user.clear(name);
    await user.type(name, "The Smiths");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.type(await screen.findByLabelText("Child's name"), "Frank");
    await user.click(screen.getByRole("button", { name: "Add another" }));
    await user.type(await screen.findByLabelText("Another child's name"), "Margaret");
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await user.click(await screen.findByRole("checkbox", { name: "Friday" }));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Step 4 of 6");
    expect(familyPatches().at(-1)).toEqual({ schoolDays: [1, 2, 3, 4], setupStep: 4 });

    await router.navigate("/setup/children");
    expect(await screen.findByText("Frank")).toBeInTheDocument();
    expect(screen.getByText("Margaret")).toBeInTheDocument();
    await router.navigate("/setup/settings");
    expect(await screen.findByLabelText("Family name")).toHaveValue("The Smiths");
    const days = within(screen.getByRole("group", { name: "School days" })).getAllByRole("checkbox");
    expect(days.filter((b) => (b as HTMLInputElement).checked).map((b) => b.getAttribute("aria-label"))).toEqual(["Monday", "Tuesday", "Wednesday", "Thursday"]);
  });
});
