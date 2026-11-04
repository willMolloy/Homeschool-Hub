// S8-09: the getting-started checklist on Home and the empty states of every screen.
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import { checklistSteps } from "../src/features/home/Checklist";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const KID = { id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false };
const SUBJECT = { id: "s1", name: "Math", color: null, sortOrder: 0, archived: false, icon: "calculator" };

function family(over: { children?: unknown[]; subjects?: unknown[]; assignments?: unknown[]; blocked?: unknown[] } = {}) {
  fakeApi.on("GET /api/children", 200, over.children ?? []);
  fakeApi.on("GET /api/subjects", 200, over.subjects ?? []);
  fakeApi.on("GET /api/assignments", 200, over.assignments ?? []);
  fakeApi.on("GET /api/blocked-ranges", 200, over.blocked ?? []);
  fakeApi.on("GET /api/events", 200, []);
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: "x", to: "y", plans: [] });
}
const checklist = () => screen.findByRole("region", { name: "Getting started" });

beforeEach(() => localStorage.clear());

describe("the getting-started checklist", () => {
  it("a family with no children and no subjects sees two reminders, each opening the right screen; no books or breaks row", async () => {
    family();
    renderAt("/");
    const list = within(await checklist());
    const links = list.getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Add your children", "Add subjects"]);
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/setup/children", "/setup/subjects"]);
    expect(list.queryByText("Done")).toBeNull();
    expect(list.queryByText(/books and lessons|breaks/i)).toBeNull();
  });

  it("a reminder goes as its data appears, and the list goes when none is left", async () => {
    family({ children: [KID] });
    const first = renderAt("/");
    const list = within(await checklist());
    expect(list.getAllByRole("link").map((l) => l.textContent)).toEqual(["Add subjects"]);
    first.unmount();
    family({ children: [KID], subjects: [SUBJECT] });
    renderAt("/");
    await screen.findByRole("button", { name: "Family and settings" });
    await screen.findByText(/on track|This week and your year/);
    expect(screen.queryByRole("region", { name: "Getting started" })).toBeNull();
  });

  it("the steps put off in the setup flow are reminders, first, and nothing else is assumed", async () => {
    family({ children: [KID], subjects: [SUBJECT] });
    fakeApi.on("GET /api/me", 200, { ...DEMO_ME, setupDone: true, setupDeferred: ["year", "breaks"] });
    renderAt("/");
    const list = within(await checklist());
    expect(list.getAllByRole("link").map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      ["Set your school year", "/welcome?only=year"], ["Add your breaks", "/welcome?only=breaks"],
    ]);
  });

  it("checklistSteps: reminders for what was put off, plus children and subjects only when there are none; never books and lessons", () => {
    expect(checklistSteps({ children: 0, subjects: 0 }).map((s) => s.key)).toEqual(["children", "subjects"]);
    expect(checklistSteps({ children: 1, subjects: 2 })).toEqual([]);
    expect(checklistSteps({ children: 1, subjects: 2 }, ["breaks"]).map((s) => s.key)).toEqual(["breaks"]);
    expect(checklistSteps({ children: 0, subjects: 1 }, ["year", "breaks"]).map((s) => s.key)).toEqual(["year", "breaks", "children"]);
  });

  it("can be hidden, which is saved on the family (not the browser), so it stays hidden for that family only", async () => {
    family();
    const me = { ...DEMO_ME };
    fakeApi.on("GET /api/me", () => [200, me]);
    fakeApi.on("PATCH /api/family", (body) => { Object.assign(me, body); return [200, {}]; });
    const user = userEvent.setup();
    const first = renderAt("/");
    await checklist();
    await user.click(screen.getByRole("button", { name: "Hide the getting-started list" }));
    expect(screen.queryByRole("region", { name: "Getting started" })).toBeNull();
    expect(fakeApi.calls.filter((c) => c.method === "PATCH").map((c) => c.body)).toEqual([{ checklistHidden: true }]);
    expect(localStorage.length).toBe(0);
    first.unmount();
    renderAt("/");
    await screen.findByRole("button", { name: "Family and settings" });
    await screen.findByText("This week and your year");
    expect(screen.queryByRole("region", { name: "Getting started" })).toBeNull();
    // Another family on this browser still has its own reminders.
    fakeApi.on("GET /api/me", 200, { ...DEMO_ME, familyId: "other", checklistHidden: false });
    cleanup();
    renderAt("/");
    expect(await checklist()).toBeInTheDocument();
  });

  it("does not guess while a list has not answered", async () => {
    family();
    fakeApi.on("GET /api/subjects", 500, { error: "boom" });
    renderAt("/");
    await screen.findByText("This week and your year");
    expect(screen.queryByRole("region", { name: "Getting started" })).toBeNull();
  });

  it("a step's link goes to its screen, which has its own way to finish it", async () => {
    family();
    const user = userEvent.setup();
    const { router } = renderAt("/");
    await user.click(within(await checklist()).getByRole("link", { name: "Add subjects" }));
    expect(router.state.location.pathname).toBe("/setup/subjects");
    expect(await screen.findByRole("group", { name: "Add common subjects" })).toBeInTheDocument();
  });
});

describe("empty states: one friendly line and the one button that fixes it", () => {
  it("This week, no children: add your children", async () => {
    family();
    renderAt("/schedule?view=week");
    expect(await screen.findByText("No children yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add your children" })).toHaveAttribute("href", "/setup/children");
  });

  it("This week, children but no assignments: add your first assignment", async () => {
    family({ children: [KID], subjects: [SUBJECT] });
    renderAt("/schedule?view=week");
    expect(await screen.findByText("Nothing is planned yet.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add your first assignment" })).toHaveAttribute("href", "/setup/assignments");
  });

  it("This week is not 'empty' when the lists simply failed to load", async () => {
    family({ children: [KID] });
    fakeApi.on("GET /api/assignments", 500, { error: "boom" });
    renderAt("/schedule?view=week");
    await screen.findByRole("heading", { name: "Frank's work" });
    expect(screen.queryByText("Nothing is planned yet.")).toBeNull();
  });

  it("Year with nothing planned still draws the calendar, says what to do, and the header button is the fix", async () => {
    family({ children: [KID], subjects: [SUBJECT] });
    renderAt("/schedule?view=year");
    expect(await screen.findByText("Nothing planned yet.")).toBeInTheDocument();
    expect(screen.getByText(/Tap \+ above to add an assignment/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add assignment" })).toBeInTheDocument();
  });

  it.each([
    ["/setup/children", "No children yet.", "Tap Add child below to start.", "Add child"],
    ["/setup/subjects", "No subjects yet.", "Tap a common subject below, or Add subject.", "Add subject"],
    ["/setup/assignments", "No assignments yet.", "Tap Add assignment above to start.", "Add assignment"],
    ["/setup/days-off", "No days off yet.", /Tap Add .* above to start\./, /^Add /],
  ])("%s", async (path, line, hint, button) => {
    family();
    renderAt(path);
    expect(await screen.findByText(line)).toBeInTheDocument();
    expect(screen.getByText(hint)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: button }).length).toBeGreaterThan(0);
  });

  it("/setup/events keeps its own friendly line", async () => {
    family({ children: [KID], subjects: [SUBJECT] });
    renderAt("/setup/events");
    expect(await screen.findByText(/No events yet\. Add things like co-op or piano/)).toBeInTheDocument();
  });
});
