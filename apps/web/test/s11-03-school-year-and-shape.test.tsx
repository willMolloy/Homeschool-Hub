// S11-03: step 4 of the setup flow: the school year's first and last day, and its shape.
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { CALENDAR_SHAPES } from "@hh/engine";
import type { BlockedRange } from "../src/api/types";
import { plannedBreaks } from "../src/features/schedule/templates";
import { clearSetupLater } from "../src/features/welcome/setupLater";
import { planYear, threeTerms, newYearSplit } from "../src/features/welcome/yearShapes";
import { fakeApi } from "./helpers/fake-api";
import { familyPatches, newFamily, type NewFamily } from "./helpers/setup-flow";
import { renderAt } from "./render";

const START = "2026-08-17";
const END = "2027-05-21";
beforeEach(() => { clearSetupLater(); sessionStorage.clear(); });

const bulkPosts = () => fakeApi.calls.filter((c) => c.method === "POST" && c.path === "/api/blocked-ranges/bulk").map((c) => (c.body as { blockedRanges: unknown[] }).blockedRanges);
/** The bulk POST adds the rows to the family, as the real API does. */
function bulkAdds(f: NewFamily) {
  fakeApi.on("POST /api/blocked-ranges/bulk", (body) => {
    const rows = (body as { blockedRanges: Omit<BlockedRange, "id">[] }).blockedRanges.map((b, i) => ({ ...b, id: `b${f.blocked.length + i + 1}` }));
    f.blocked.push(...(rows as BlockedRange[]));
    return [201, rows];
  });
}
async function atYear(f = newFamily({ setupStep: 4 })) {
  bulkAdds(f);
  const user = userEvent.setup();
  renderAt("/welcome");
  await screen.findByRole("heading", { level: 1, name: "When is your school year?" });
  await screen.findByLabelText("First day");
  return { f, user };
}
const fillYear = (start = START, end = END) => {
  fireEvent.change(screen.getByLabelText("First day"), { target: { value: start } });
  fireEvent.change(screen.getByLabelText("Last day"), { target: { value: end } });
};
const shapeCard = (name: string) => screen.getByRole("radio", { name: new RegExp(`^${name}`) });

describe("the year's shapes (pure)", () => {
  it("Three terms is the stretches between the pattern's first two breaks", () => {
    const plan = planYear("three-terms", START, END, "mon");
    expect(plan.breaks.map((b) => [b.start, b.end])).toEqual([["2026-11-09", "2026-11-22"], ["2027-02-15", "2027-02-28"]]);
    expect(plan.terms).toEqual([
      { name: "Term 1", start: "2026-08-17", end: "2026-11-08" },
      { name: "Term 2", start: "2026-11-23", end: "2027-02-14" },
      { name: "Term 3", start: "2027-03-01", end: "2027-05-21" },
    ]);
  });

  it("a year too short for two breaks is cut into thirds", () => {
    const terms = threeTerms("2026-09-01", "2026-11-29", []);
    expect(terms.map((t) => t.name)).toEqual(["Term 1", "Term 2", "Term 3"]);
    expect(terms[0]!.start).toBe("2026-09-01");
    expect(terms[2]!.end).toBe("2026-11-29");
    expect(terms[1]!.start > terms[0]!.end && terms[2]!.start > terms[1]!.end).toBe(true);
  });

  it("Fall and Spring split at the first New Year after the first day; a year inside one calendar year is not split", () => {
    expect(newYearSplit(START, END)).toBe("2027-01-01");
    expect(planYear("fall-spring", START, END, "mon").halves).toEqual({ fall: { name: "Fall", start: START, end: "2026-12-31" }, spring: { name: "Spring", start: "2027-01-01", end: END } });
    expect(planYear("fall-spring", "2026-09-01", "2026-12-18", "mon").halves).toBeNull();
  });

  it.each(["three-terms", "sabbath", "36-weeks"] as const)("%s adds the same breaks as the template screen with no holidays ticked", (id) => {
    const pattern = CALENDAR_SHAPES.find((s) => s.id === id)!.pattern;
    expect(planYear(id, START, END, "mon").breaks).toEqual(plannedBreaks(START, END, pattern, new Set(), "mon"));
  });
});

describe("step 4: the school year", () => {
  it("asks for the first and last day, and offers the five shapes with Fall and Spring chosen", async () => {
    await atYear();
    expect(screen.getByLabelText("First day")).toBeInTheDocument();
    expect(screen.getByLabelText("Last day")).toBeInTheDocument();
    const cards = within(screen.getByRole("group", { name: "The shape of the year" })).getAllByRole("radio");
    expect(cards.map((c) => c.closest("label")!.querySelector(".shape-name")!.textContent)).toEqual(["Fall and Spring", "Three terms", "36 weeks", "6 weeks on, 1 off", "I'll set this later"]);
    expect(shapeCard("Fall and Spring")).toBeChecked();
  });

  it("needs both days unless the parent chooses later", async () => {
    const { user } = await atYear();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("Pick the first and last day of the school year.")).toBeInTheDocument();
    expect(familyPatches()).toEqual([]);
    fireEvent.change(screen.getByLabelText("First day"), { target: { value: END } });
    fireEvent.change(screen.getByLabelText("Last day"), { target: { value: START } });
    await user.click(screen.getByRole("button", { name: "Continue" }));
    expect(await screen.findByText("The end date must be on or after the start date.")).toBeInTheDocument();
  });

  it("the preview says what the shape adds", async () => {
    const { user } = await atYear();
    fillYear();
    expect(screen.getByText("Adds Fall and Spring views.")).toBeInTheDocument();
    await user.click(shapeCard("Three terms"));
    expect(screen.getByText("Adds 3 term views and 2 breaks: Nov 9–22, Feb 15–28.")).toBeInTheDocument();
    await user.click(shapeCard("6 weeks on, 1 off"));
    expect(screen.getByText(/^Adds 5 breaks: Sep 28 – Oct 4, /)).toBeInTheDocument();
    await user.click(shapeCard("36 weeks"));
    expect(screen.getByText("Adds nothing yet; you can add breaks next.")).toBeInTheDocument();
    await user.click(shapeCard("I'll set this later"));
    expect(screen.getByText("We'll remind you on Home.")).toBeInTheDocument();
    expect(screen.queryByLabelText("First day")).toBeNull();
  });

  it("Three terms, Aug 17 – May 21: three term views (Fall and Spring hidden) and the template's breaks under Days off", async () => {
    const { f, user } = await atYear();
    fillYear();
    await user.click(shapeCard("Three terms"));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Step 5 of 6");
    expect(bulkPosts()).toEqual([[
      { label: "Break", kind: "vacation", startDate: "2026-11-09", endDate: "2026-11-22", childIds: [] },
      { label: "Break", kind: "vacation", startDate: "2027-02-15", endDate: "2027-02-28", childIds: [] },
    ]]);
    const patch = familyPatches().at(-1) as { schoolYear: unknown; zoomViews: { hidden: string[]; custom: { name: string; start: string; end: string }[] }; setupStep: number; setupDeferred: string[] };
    expect(patch.schoolYear).toEqual({ start: START, end: END });
    expect(patch.zoomViews.hidden).toEqual(["fall", "spring"]);
    expect(patch.zoomViews.custom.map(({ name, start, end }) => [name, start, end])).toEqual([
      ["Term 1", "2026-08-17", "2026-11-08"], ["Term 2", "2026-11-23", "2027-02-14"], ["Term 3", "2027-03-01", "2027-05-21"],
    ]);
    expect(patch.setupStep).toBe(5);
    expect(patch.setupDeferred).toEqual([]);
    expect(f.blocked).toHaveLength(2);
  });

  it("Fall and Spring: the two views are re-dated to the year, and no breaks are added", async () => {
    const { user } = await atYear();
    fillYear();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Step 5 of 6");
    expect(bulkPosts()).toEqual([]);
    expect((familyPatches().at(-1) as { zoomViews: unknown }).zoomViews).toEqual({
      hidden: [], custom: [], overrides: { fall: { name: "Fall", start: START, end: "2026-12-31" }, spring: { name: "Spring", start: "2027-01-01", end: END } },
    });
  });

  it("36 weeks and 6 weeks on, 1 off leave the zoom row alone; 6 on, 1 off adds its breaks", async () => {
    const { user } = await atYear();
    fillYear();
    await user.click(shapeCard("36 weeks"));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Step 5 of 6");
    expect(familyPatches().at(-1)).toEqual({ schoolYear: { start: START, end: END }, setupDeferred: [], setupStep: 5 });
    expect(bulkPosts()).toEqual([]);
  });

  it("6 weeks on, 1 off adds the pattern's break weeks", async () => {
    const { f, user } = await atYear();
    fillYear();
    await user.click(shapeCard("6 weeks on, 1 off"));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Step 5 of 6");
    expect(f.blocked).toHaveLength(5);
    expect(f.blocked[0]).toMatchObject({ startDate: "2026-09-28", endDate: "2026-10-04", kind: "vacation" });
  });

  it("breaks that are already days off are left out, so going Back and Continue does not add them twice", async () => {
    const f = newFamily({ setupStep: 4 });
    f.blocked.push({ id: "b0", label: "Break", kind: "vacation", startDate: "2026-11-09", endDate: "2026-11-22", childIds: [] });
    const { user } = await atYear(f);
    fillYear();
    await user.click(shapeCard("Three terms"));
    expect(screen.getByText("Adds 3 term views and 1 break: Feb 15–28. 1 already in your days off.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Step 5 of 6");
    expect(bulkPosts()).toHaveLength(1);
    expect((bulkPosts()[0] as unknown[]).length).toBe(1);
  });

  it("the year already given comes back when the step is opened again", async () => {
    const f = newFamily({ setupStep: 4 });
    f.schoolYear = { start: START, end: END };
    await atYear(f);
    await waitFor(() => expect(screen.getByLabelText("First day")).toHaveValue("Aug 17, 2026"));
    expect(screen.getByLabelText("Last day")).toHaveValue("May 21, 2027");
  });
});

describe("I'll set this later", () => {
  it("saves no dates, no breaks and no views, and leaves a reminder on Home", async () => {
    const { f, user } = await atYear();
    await user.click(shapeCard("I'll set this later"));
    await user.click(screen.getByRole("button", { name: "Continue" }));
    await screen.findByText("Step 5 of 6");
    expect(familyPatches()).toEqual([{ setupDeferred: ["year"], setupStep: 5 }]);
    expect(bulkPosts()).toEqual([]);
    expect(f.schoolYear).toBeNull();

    await user.click(screen.getByRole("button", { name: "Finish later" }));
    const reminder = await screen.findByRole("link", { name: /Set your school year/ });
    expect(reminder).toHaveAttribute("href", "/welcome?only=year");
  });

  it("the reminder opens the step on its own: no progress bar, Save, and the reminder goes", async () => {
    const f = newFamily({ setupDone: true, setupDeferred: ["year"] });
    bulkAdds(f);
    const user = userEvent.setup();
    const { router } = renderAt("/");
    await user.click(await screen.findByRole("link", { name: /Set your school year/ }));
    expect(await screen.findByRole("heading", { level: 1, name: "When is your school year?" })).toBeInTheDocument();
    expect(router.state.location.search).toBe("?only=year");
    expect(screen.queryByRole("progressbar")).toBeNull();
    expect(screen.queryByText(/Step \d of 6/)).toBeNull();
    fillYear();
    await user.click(screen.getByRole("button", { name: "Save" }));
    await screen.findByRole("button", { name: "Family and settings" });
    expect(router.state.location.pathname).toBe("/");
    expect(familyPatches()).toEqual([{
      schoolYear: { start: START, end: END }, setupDeferred: [],
      zoomViews: { hidden: [], custom: [], overrides: { fall: { name: "Fall", start: START, end: "2026-12-31" }, spring: { name: "Spring", start: "2027-01-01", end: END } } },
    }]);
    expect(screen.queryByRole("link", { name: /Set your school year/ })).toBeNull();
  });

  it("a family that has not finished setup ignores ?only= and sees the flow", async () => {
    newFamily({ setupStep: 2 });
    renderAt("/welcome?only=year");
    expect(await screen.findByText("Step 2 of 6")).toBeInTheDocument();
  });
});
