// S8-09: the getting-started checklist on Home and the empty states of every screen.
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import { checklistSteps, CHECKLIST_KEY } from "../src/features/home/Checklist";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const KID = { id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false };
const SUBJECT = { id: "s1", name: "Math", color: null, sortOrder: 0, archived: false, icon: "calculator" };
const BOOK = { id: "a1", subjectId: "s1", title: "Math 5", startDate: "2026-08-31", endDate: "2027-05-28", archived: false };
const BREAK = { id: "b1", label: "Fall break", kind: "break", startDate: "2026-11-23", endDate: "2026-11-27", childIds: [] };

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
  it("a brand-new family sees four steps in order, each opening the right screen", async () => {
    family();
    renderAt("/");
    const list = within(await checklist());
    const links = list.getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual(["Add your children", "Add subjects", "Add your books and lessons", "Set your year's breaks"]);
    expect(links.map((l) => l.getAttribute("href"))).toEqual(["/setup/children", "/setup/subjects", "/setup/assignments", "/setup/days-off"]);
    expect(list.queryByText("Done")).toBeNull();
  });

  it("each step ticks itself as its data appears, and the list goes when all four are done", async () => {
    family({ children: [KID] });
    const first = renderAt("/");
    let list = within(await checklist());
    expect(within(list.getByRole("link", { name: /Add your children/ })).getByText("Done")).toBeInTheDocument();
    expect(list.getAllByText("Done")).toHaveLength(1);
    first.unmount();
    family({ children: [KID], subjects: [SUBJECT], assignments: [BOOK] });
    const second = renderAt("/");
    list = within(await checklist());
    expect(list.getAllByText("Done")).toHaveLength(3);
    expect(within(list.getByRole("link", { name: /Set your year's breaks/ })).queryByText("Done")).toBeNull();
    second.unmount();
    family({ children: [KID], subjects: [SUBJECT], assignments: [BOOK], blocked: [BREAK] });
    renderAt("/");
    await screen.findByRole("button", { name: "Family and settings" });
    await screen.findByText(/on track|This week and your year/);
    expect(screen.queryByRole("region", { name: "Getting started" })).toBeNull();
  });

  it("archived subjects and assignments do not count as done", () => {
    expect(checklistSteps({ children: 0, subjects: 0, assignments: 0, breaks: 0 }).map((s) => s.done)).toEqual([false, false, false, false]);
    expect(checklistSteps({ children: 1, subjects: 2, assignments: 3, breaks: 4 }).every((s) => s.done)).toBe(true);
  });

  it("can be hidden, and stays hidden on this device", async () => {
    family();
    const user = userEvent.setup();
    const first = renderAt("/");
    await checklist();
    await user.click(screen.getByRole("button", { name: "Hide the getting-started list" }));
    expect(screen.queryByRole("region", { name: "Getting started" })).toBeNull();
    expect(localStorage.getItem(CHECKLIST_KEY)).toBe("1");
    first.unmount();
    renderAt("/");
    await screen.findByRole("button", { name: "Family and settings" });
    await screen.findByText("This week and your year");
    expect(screen.queryByRole("region", { name: "Getting started" })).toBeNull();
  });

  it("does not guess while a list has not answered", async () => {
    family();
    fakeApi.on("GET /api/blocked-ranges", 500, { error: "boom" });
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
    expect(screen.getByText(/Tap \+ Add assignment above/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "+ Add assignment" })).toBeInTheDocument();
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
