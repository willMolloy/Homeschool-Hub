/** S2b-25: the "How did last week go?" card on the plan page. */
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { CheckInItem, WeekCheckIn } from "../src/api/types";
import { plannedCountText, plannedRangeText } from "../src/features/checkin/checkinText";
import { EMPTY_WEEK, fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const item = (over: Partial<CheckInItem>): CheckInItem => ({
  assignmentId: "ti", childId: "c1", childName: "Frank", title: "Treasure Island", unitType: "pages",
  plannedFrom: 0, plannedTo: 80, totalUnits: 270, actual: null, mode: null, ...over,
});
const WEEK: WeekCheckIn = {
  ...EMPTY_WEEK, status: null,
  items: [
    item({}),
    item({ assignmentId: "hist", title: "Story of the World", unitType: "chapters", plannedFrom: 3, plannedTo: 5 }),
    item({ assignmentId: "hist", childId: "c2", childName: "Margaret", title: "Story of the World", unitType: "chapters", plannedFrom: 3, plannedTo: 5 }),
    item({ assignmentId: "violin", childId: "c2", childName: "Margaret", title: "Violin practice", unitType: "minutes", plannedFrom: 600, plannedTo: 750 }),
  ],
};
const PUT = `PUT /api/check-ins/${WEEK.weekStart}`;
const card = () => screen.queryByRole("region", { name: /How did last week go\?/ });
const puts = () => fakeApi.calls.filter((c) => c.method === "PUT");

async function showCard(week: WeekCheckIn = WEEK) {
  fakeApi.on("GET /api/check-ins", 200, week);
  renderAt("/");
  return screen.findByRole("region", { name: /How did last week go\?/ });
}

describe("checkin text", () => {
  it("counts and ranges", () => {
    expect(plannedCountText(6)).toBe("6 assignments were planned.");
    expect(plannedCountText(1)).toBe("1 assignment was planned.");
    expect(plannedRangeText("pages", 0, 80)).toBe("pp. 1–80");
    expect(plannedRangeText("pages", 80, 81)).toBe("p. 81");
    expect(plannedRangeText("pages", 22.5, 45)).toBe("pp. 23–45");
    expect(plannedRangeText("chapters", 3, 5)).toBe("chapters 4–5");
    expect(plannedRangeText("lessons", 9, 10)).toBe("lesson 10");
    expect(plannedRangeText("minutes", 600, 750)).toBe("150 minutes");
    expect(plannedRangeText("minutes", 0, 1)).toBe("1 minute");
  });
});

describe("LastWeekCard", () => {
  it("collapsed by default, with the count", async () => {
    const c = await showCard();
    expect(within(c).getByText(/4 assignments were planned\./)).toBeInTheDocument();
    expect(within(c).getByRole("button", { name: "Adjust" })).toHaveAttribute("aria-expanded", "false");
    expect(within(c).queryByText(/Treasure Island/)).toBeNull();
  });

  it("Went as planned → exactly one PUT (reviewed, no items) and the card is gone", async () => {
    const c = await showCard();
    await userEvent.click(within(c).getByRole("button", { name: "Last week went as planned" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Thanks!");
    expect(card()).toBeNull();
    expect(puts()).toEqual([{ method: "PUT", path: `/api/check-ins/${WEEK.weekStart}`, body: { status: "reviewed", items: [] } }]);
  });

  it("Skip → skipped, and the card is gone", async () => {
    const c = await showCard();
    const skip = within(c).getByRole("button", { name: "Skip" });
    expect(skip).toHaveAttribute("title", "Skipping counts as done");
    await userEvent.click(skip);
    await screen.findByRole("status");
    expect(card()).toBeNull();
    expect(puts().map((p) => p.body)).toEqual([{ status: "skipped", items: [] }]);
  });

  it("a failed save keeps the card with an inline error", async () => {
    fakeApi.on(PUT, 500, { error: "internal" });
    const c = await showCard();
    await userEvent.click(within(c).getByRole("button", { name: "Last week went as planned" }));
    expect(await within(c).findByRole("alert")).toHaveTextContent(/Couldn't save/);
    expect(card()).not.toBeNull();
  });

  it.each([
    ["the week was reviewed", () => fakeApi.on("GET /api/check-ins", 200, { ...WEEK, status: "reviewed" })],
    ["the week was skipped", () => fakeApi.on("GET /api/check-ins", 200, { ...WEEK, status: "skipped" })],
    ["nothing was planned", () => fakeApi.on("GET /api/check-ins", 200, EMPTY_WEEK)],
    ["the request fails", () => fakeApi.on("GET /api/check-ins", 500, { error: "internal" })],
  ])("hidden when %s, and the plan still renders", async (_n, arrange) => {
    arrange();
    fakeApi.on("GET /api/plan", 200, { engineVersion: "x", asOf: "2026-10-28", from: "2026-10-26", to: "2026-11-01", plans: [] });
    fakeApi.on("GET /api/children", 200, []);
    fakeApi.on("GET /api/subjects", 200, []);
    renderAt("/");
    expect(await screen.findByRole("heading", { name: "Plan" })).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 20));
    expect(card()).toBeNull();
    expect(fakeApi.calls.some((c) => c.path === "/api/check-ins")).toBe(true);
  });

  it("Adjust expands the rows: planned ranges, grouped by child, one row per child on multi-child assignments", async () => {
    const c = await showCard();
    await userEvent.click(within(c).getByRole("button", { name: "Adjust" }));
    expect(within(c).getByRole("button", { name: "Adjust" })).toHaveAttribute("aria-expanded", "true");
    const frank = within(c).getByRole("heading", { name: "Frank" }).parentElement!;
    const margaret = within(c).getByRole("heading", { name: "Margaret" }).parentElement!;
    expect(within(frank).getByText("Treasure Island — pp. 1–80 planned")).toBeInTheDocument();
    expect(within(frank).getByText("Story of the World — chapters 4–5 planned")).toBeInTheDocument();
    expect(within(margaret).getByText("Story of the World — chapters 4–5 planned")).toBeInTheDocument();
    expect(within(margaret).getByText("Violin practice — 150 minutes planned")).toBeInTheDocument();
    expect(within(c).getAllByText("✓ Done as planned")).toHaveLength(4);
    expect(within(c).getByRole("button", { name: "Save" })).toBeDisabled();
    // The footer's "went as planned" saves like the collapsed one.
    const confirms = within(c).getAllByRole("button", { name: "Last week went as planned" });
    expect(confirms).toHaveLength(2);
    await userEvent.click(confirms[1]!);
    await screen.findByRole("status");
    expect(puts().map((p) => p.body)).toEqual([{ status: "reviewed", items: [] }]);
  });

  it("each row has its own progress control (S2b-36); changing one leaves the others as planned", async () => {
    const c = await showCard();
    await userEvent.click(within(c).getByRole("button", { name: "Adjust" }));
    const frankHist = within(c).getByRole("group", { name: "Progress on Story of the World for Frank" });
    await userEvent.click(within(frankHist).getByRole("button", { name: "Didn't start" }));
    expect(within(frankHist).getByText("Got to chapter 3 of 5 planned (2 behind)")).toBeInTheDocument();
    const margaretHist = within(c).getByRole("group", { name: "Progress on Story of the World for Margaret" });
    expect(within(margaretHist).getByText("✓ Done as planned")).toBeInTheDocument();
    expect(within(c).getAllByText("✓ Done as planned")).toHaveLength(3);
    expect(puts()).toEqual([]);
  });

  it("keyboard: every control is reachable and labelled", async () => {
    const c = await showCard();
    const user = userEvent.setup();
    within(c).getByRole("button", { name: "Last week went as planned" }).focus();
    expect(document.activeElement).toHaveAccessibleName("Last week went as planned");
    await user.tab();
    expect(document.activeElement).toHaveAccessibleName("Adjust");
    await user.tab();
    expect(document.activeElement).toHaveAccessibleName("Skip");
    expect(document.activeElement).toHaveAccessibleDescription("Skipping counts as done");
    await user.keyboard("{Shift>}{Tab}{/Shift}");
    await user.keyboard("{Enter}");
    expect(within(c).getByText("Treasure Island — pp. 1–80 planned")).toBeInTheDocument();
  });
});

describe("Add progress on assignments with nothing planned (S2c-06)", () => {
  const SCI = item({ assignmentId: "sci", title: "Science", unitType: "lessons", plannedFrom: 12, plannedTo: 12, totalUnits: 120 });
  const PIANO = item({ assignmentId: "piano", title: "Piano", unitType: "minutes", plannedFrom: 300, plannedTo: 300, totalUnits: 1800 });
  const ART_M = item({ assignmentId: "art", childId: "c2", childName: "Margaret", title: "Art", unitType: "lessons", plannedFrom: 4, plannedTo: 4, totalUnits: 30 });
  const ADDABLE: WeekCheckIn = { ...WEEK, addable: [SCI, ART_M, PIANO] };
  const openAdd = async (c: HTMLElement) => {
    await userEvent.click(within(c).getByRole("button", { name: "Adjust" }));
    const add = within(c).getByRole("button", { name: "Add progress" });
    expect(add).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(add);
    return within(c).getByRole("list", { name: "Assignments with nothing planned" });
  };
  const gotTo = (c: HTMLElement, name: string) =>
    within(within(c).getByRole("group", { name: `Progress on ${name}` })).getByRole("spinbutton");

  it("lists the pairs by child, then title; choosing one adds a 'nothing planned' row at the week's start", async () => {
    const c = await showCard(ADDABLE);
    const list = await openAdd(c);
    expect(within(list).getAllByRole("button").map((b) => b.textContent)).toEqual(["Frank — Piano", "Frank — Science", "Margaret — Art"]);
    await userEvent.click(within(list).getByRole("button", { name: "Frank — Science" }));
    expect(within(c).queryByRole("list", { name: "Assignments with nothing planned" })).toBeNull();
    const frank = within(c).getByRole("heading", { name: "Frank" }).parentElement!;
    expect(within(frank).getByText("Science — nothing planned")).toBeInTheDocument();
    expect(gotTo(c, "Science for Frank")).toHaveValue(12);
    expect(gotTo(c, "Science for Frank")).toHaveAttribute("min", "12");
    expect(within(c).getByRole("slider", { name: "Where Science for Frank got to" })).toHaveAttribute("min", "12");
    // An added row left at its start is done as planned: nothing to save yet.
    expect(within(c).getByRole("button", { name: "Save" })).toBeDisabled();
    // It's no longer offered.
    await userEvent.click(within(c).getByRole("button", { name: "Add progress" }));
    expect(within(c).queryByRole("button", { name: "Frank — Science" })).toBeNull();
  });

  it("moving an added row ahead asks the ahead question, joins Apply one choice to all, and saves it", async () => {
    fakeApi.on(PUT, (body) => [200, { ...ADDABLE, status: (body as { status: string }).status, planChanged: true }]);
    const c = await showCard(ADDABLE);
    await userEvent.click(within(await openAdd(c)).getByRole("button", { name: "Frank — Science" }));
    await userEvent.clear(gotTo(c, "Science for Frank"));
    await userEvent.type(gotTo(c, "Science for Frank"), "15");
    expect(within(c).getByText("Frank is 3 lessons ahead on Science.")).toBeInTheDocument();
    const own = within(c).getByRole("group", { name: "How should the plan absorb this? (Science for Frank)" });
    expect(within(own).getByRole("radio", { name: "Thin the remaining bars" })).toBeChecked();
    // A planned row ahead too: one shared choice for both.
    await userEvent.clear(gotTo(c, "Treasure Island for Frank"));
    await userEvent.type(gotTo(c, "Treasure Island for Frank"), "90");
    expect(within(c).getByRole("checkbox", { name: "Apply one choice to all 2 rows ahead" })).toBeChecked();
    expect(within(c).queryByRole("group", { name: "How should the plan absorb this? (Science for Frank)" })).toBeNull();
    const shared = within(c).getByRole("group", { name: "How should the plan absorb this? (the 2 rows ahead)" });
    await userEvent.click(within(shared).getByRole("radio", { name: "Pull the end date in" }));
    await userEvent.click(within(c).getByRole("button", { name: "Save" }));
    await screen.findByRole("status");
    expect(puts().map((p) => p.body)).toEqual([{ status: "reviewed", items: [
      { assignmentId: "ti", childId: "c1", position: 90, mode: "pushEndDate" },
      { assignmentId: "sci", childId: "c1", position: 15, mode: "pushEndDate" },
    ] }]);
  });

  it("an added row can be removed before saving, and is offered again", async () => {
    const c = await showCard(ADDABLE);
    await userEvent.click(within(await openAdd(c)).getByRole("button", { name: "Margaret — Art" }));
    await userEvent.clear(gotTo(c, "Art for Margaret"));
    await userEvent.type(gotTo(c, "Art for Margaret"), "6");
    expect(within(c).getByRole("button", { name: "Save" })).toBeEnabled();
    await userEvent.click(within(c).getByRole("button", { name: "Remove Art for Margaret" }));
    expect(within(c).queryByText("Art — nothing planned")).toBeNull();
    expect(within(c).getByRole("button", { name: "Save" })).toBeDisabled();
    await userEvent.click(within(c).getByRole("button", { name: "Add progress" }));
    await userEvent.click(within(c).getByRole("button", { name: "Margaret — Art" }));
    expect(gotTo(c, "Art for Margaret")).toHaveValue(4);
    // Planned rows have no Remove.
    expect(within(c).queryByRole("button", { name: /Remove Treasure Island/ })).toBeNull();
  });

  it("no Add progress when there's nothing to add", async () => {
    const c = await showCard();
    await userEvent.click(within(c).getByRole("button", { name: "Adjust" }));
    expect(within(c).queryByRole("button", { name: "Add progress" })).toBeNull();
  });

  it("the home card stays hidden when last week had no planned rows, even with addable pairs", async () => {
    fakeApi.on("GET /api/check-ins", 200, { ...EMPTY_WEEK, addable: [SCI] });
    renderAt("/");
    expect(await screen.findByRole("heading", { name: "Plan" })).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 20));
    expect(card()).toBeNull();
  });
});
