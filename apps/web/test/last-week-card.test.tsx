/**
 * S2b-25 → T-09: "How did last week go?" on This Week. The default is that everything went as planned;
 * rows adjust inline with As planned / Less / More and a stepper, and save through the same check-in API.
 */
import { act, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CheckInItem, WeekCheckIn } from "../src/api/types";
import { rowOutcome } from "../src/features/checkin/absorb";
import { AS_PLANNED_LINE } from "../src/features/checkin/LastWeekCard";
import { THANKS_MS } from "../src/features/checkin/LastWeekCheckIn";
import { itemErrorOf } from "../src/features/checkin/useLastWeekCheckIn";
import { EMPTY_WEEK, fakeApi } from "./helpers/fake-api";
import { choose, rowFor, step } from "./helpers/checkin";
import { renderAt } from "./render";

const item = (over: Partial<CheckInItem>): CheckInItem => ({
  assignmentId: "ti", childId: "c1", childName: "Frank", title: "Treasure Island", unitType: "pages",
  plannedFrom: 0, plannedTo: 80, totalUnits: 270, actual: null, mode: null, ...over,
});
const TI = item({});
const SOTW_F = item({ assignmentId: "sotw", title: "Story of the World", unitType: "chapters", plannedFrom: 3, plannedTo: 6, totalUnits: 42 });
const SOTW_M = item({ ...SOTW_F, childId: "c2", childName: "Margaret" });
const VIOLIN_M = item({ assignmentId: "violin", childId: "c2", childName: "Margaret", title: "Violin", unitType: "minutes", plannedFrom: 600, plannedTo: 750, totalUnits: 3000 });
const WEEK: WeekCheckIn = { ...EMPTY_WEEK, status: null, items: [TI, SOTW_F, SOTW_M, VIOLIN_M] };
const PUT = `PUT /api/check-ins/${WEEK.weekStart}`;
const card = () => screen.queryByRole("region", { name: "How did last week go?" });
const puts = () => fakeApi.calls.filter((c) => c.method === "PUT");

async function showCard(week: WeekCheckIn = WEEK) {
  fakeApi.on("GET /api/check-ins", 200, week);
  fakeApi.on(PUT, (body) => [200, { ...week, status: (body as { status: string }).status, planChanged: true }]);
  renderAt("/");
  return screen.findByRole("region", { name: "How did last week go?" });
}

describe("the default: everything went as planned", () => {
  it("the week, one line, Looks right and Skip; the first child's rows, all checked, no controls", async () => {
    const c = await showCard();
    expect(within(c).getByRole("heading", { name: "Last week · Oct 19–25" })).toBeInTheDocument();
    expect(within(c).getByText(AS_PLANNED_LINE)).toBeInTheDocument();
    expect(within(c).getByRole("button", { name: "Looks right" })).toBeEnabled();
    expect(within(c).getByRole("button", { name: "Skip" })).toBeInTheDocument();
    const rows = within(c).getAllByRole("listitem");
    expect(rows.map((r) => r.querySelector(".checkin-row-toggle")!.textContent))
      .toEqual(["Treasure Islandpp. 1–80✓As planned", "Story of the WorldCh. 4–6✓As planned"]);
    expect(c.querySelectorAll("[aria-pressed], [role='spinbutton'], [role='slider'], input")).toHaveLength(2); // the child picker
    // Nothing non-essential: no count, no helper text, no Adjust.
    expect(within(c).queryByText(/assignments? (was|were) planned|counts as done/)).toBeNull();
    expect(within(c).queryByRole("button", { name: "Adjust" })).toBeNull();
  });

  it("a child picker when there is more than one child", async () => {
    const c = await showCard();
    const picker = within(c).getByRole("group", { name: "Child" });
    expect(within(picker).getAllByRole("button").map((b) => [b.textContent, b.getAttribute("aria-pressed")]))
      .toEqual([["Frank", "true"], ["Margaret", "false"]]);
    await userEvent.click(within(picker).getByRole("button", { name: "Margaret" }));
    expect(within(c).getAllByRole("listitem").map((r) => r.querySelector(".checkin-row-title")!.textContent)).toEqual(["Story of the World", "Violin"]);
  });

  it("no picker with one child", async () => {
    const c = await showCard({ ...WEEK, items: [TI, SOTW_F] });
    expect(within(c).queryByRole("group", { name: "Child" })).toBeNull();
  });

  it("Looks right → exactly one PUT (reviewed, no items), a brief thanks, and the card is gone", async () => {
    const c = await showCard();
    await userEvent.click(within(c).getByRole("button", { name: "Looks right" }));
    expect(await screen.findByRole("status")).toHaveTextContent(/^Thanks/);
    expect(card()).toBeNull();
    expect(puts()).toEqual([{ method: "PUT", path: `/api/check-ins/${WEEK.weekStart}`, body: { status: "reviewed", items: [] } }]);
  });

  it("Skip → skipped, and the card is gone", async () => {
    const c = await showCard();
    await userEvent.click(within(c).getByRole("button", { name: "Skip" }));
    await screen.findByRole("status");
    expect(card()).toBeNull();
    expect(puts().map((p) => p.body)).toEqual([{ status: "skipped", items: [] }]);
  });

  it("a failed save keeps the card with an inline error", async () => {
    const c = await showCard();
    fakeApi.on(PUT, 500, { error: "internal" });
    await userEvent.click(within(c).getByRole("button", { name: "Looks right" }));
    expect(await within(c).findByRole("alert")).toHaveTextContent(/Couldn't save/);
    expect(card()).not.toBeNull();
  });

  it.each([
    ["the week was reviewed", () => fakeApi.on("GET /api/check-ins", 200, { ...WEEK, status: "reviewed" })],
    ["the week was skipped", () => fakeApi.on("GET /api/check-ins", 200, { ...WEEK, status: "skipped" })],
    ["nothing was planned", () => fakeApi.on("GET /api/check-ins", 200, EMPTY_WEEK)],
    ["nothing was planned, even with addable pairs", () => fakeApi.on("GET /api/check-ins", 200, { ...EMPTY_WEEK, addable: [item({ plannedTo: 0 })] })],
    ["the request fails", () => fakeApi.on("GET /api/check-ins", 500, { error: "internal" })],
  ])("hidden when %s, and the plan still renders", async (_n, arrange) => {
    arrange();
    renderAt("/");
    expect(await screen.findByRole("heading", { name: "Plan" })).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 20));
    expect(card()).toBeNull();
    expect(fakeApi.calls.some((c) => c.path === "/api/check-ins")).toBe(true);
  });
});

describe("adjusting a row", () => {
  it("Less on one row: the summary counts it, Looks right becomes Save, and only that row is sent (keepEndDate)", async () => {
    const c = await showCard();
    const sotw = await rowFor(c, "Story of the World");
    await choose(sotw, "Less");
    expect(sotw.querySelector(".checkin-row-state")).toHaveTextContent("2 of 3 ch.");
    expect(within(c).getByText("1 change from the plan.")).toBeInTheDocument();
    expect(within(c).queryByRole("button", { name: "Looks right" })).toBeNull();
    await userEvent.click(within(c).getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Thanks — plan updated");
    expect(puts().map((p) => p.body)).toEqual([{ status: "reviewed", items: [
      { assignmentId: "sotw", childId: "c1", position: 5, mode: "keepEndDate" },
    ] }]);
    expect(fakeApi.bodyKeyViolations).toEqual([]);
  });

  it("changes on both children save together; a finished row sends mode null", async () => {
    const c = await showCard({ ...WEEK, items: [item({ totalUnits: 81 }), SOTW_F, SOTW_M, VIOLIN_M] });
    await choose(await rowFor(c, "Treasure Island"), "More");
    await userEvent.click(within(within(c).getByRole("group", { name: "Child" })).getByRole("button", { name: "Margaret" }));
    const violin = await rowFor(c, "Violin");
    await choose(violin, "Less");
    await step(violin, "One less", 2);
    expect(violin.querySelector(".checkin-row-state")).toHaveTextContent("135 of 150 min");
    expect(within(c).getByText("2 changes from the plan.")).toBeInTheDocument();
    await userEvent.click(within(c).getByRole("button", { name: "Save" }));
    await screen.findByRole("status");
    expect(puts().map((p) => p.body)).toEqual([{ status: "reviewed", items: [
      { assignmentId: "ti", childId: "c1", position: 81, mode: null },
      { assignmentId: "violin", childId: "c2", position: 735, mode: "keepEndDate" },
    ] }]);
  });

  it("Undo puts a row back, and the card is back to its default", async () => {
    const c = await showCard();
    await choose(await rowFor(c, "Treasure Island"), "Less");
    await userEvent.click(within(c).getByRole("button", { name: "Undo Treasure Island for Frank" }));
    expect(within(c).getByText(AS_PLANNED_LINE)).toBeInTheDocument();
    expect(within(c).getByRole("button", { name: "Looks right" })).toBeInTheDocument();
  });

  it("Save PUTs, then refetches the plan in place, then thanks and goes after ~3 s", async () => {
    const c = await showCard();
    await choose(await rowFor(c, "Treasure Island"), "More");
    const before = fakeApi.calls.length;
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await userEvent.click(within(c).getByRole("button", { name: "Save" }));
      expect(await screen.findByRole("status")).toHaveTextContent("Thanks — plan updated");
      const after = fakeApi.calls.slice(before).map((x) => `${x.method} ${x.path.split("?")[0]}`);
      expect(after.indexOf("PUT /api/check-ins/2026-10-19")).toBe(0);
      expect(after.indexOf("GET /api/plan")).toBeGreaterThan(0);
      expect(screen.getByRole("heading", { name: "Plan" })).toBeInTheDocument(); // no page reload
      await act(async () => { vi.advanceTimersByTime(THANKS_MS + 10); });
      expect(screen.queryByRole("status")).toBeNull();
      expect(card()).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("a 400 shows on its row, opened, and the card stays", async () => {
    const c = await showCard();
    fakeApi.on(PUT, 400, { error: "invalid_request", message: "items.1.position: can't be more than the total (42)." });
    await choose(await rowFor(c, "Treasure Island"), "More");
    await choose(await rowFor(c, "Story of the World"), "More");
    await userEvent.click(within(c).getByRole("button", { name: "Save" }));
    const sotw = await rowFor(c, "Story of the World");
    expect(await within(sotw).findByRole("alert")).toHaveTextContent("can't be more than the total (42).");
    expect(within(await rowFor(c, "Treasure Island")).queryByRole("alert")).toBeNull();
  });

  it("outcome and 400 parsing helpers", () => {
    expect(rowOutcome(TI, 80.4)).toBe("asPlanned");
    expect(rowOutcome(TI, 70)).toBe("behind");
    expect(rowOutcome(TI, 270)).toBe("finished");
    expect(itemErrorOf("items.1.position: can't be more than the total (270).")).toEqual({ index: 1, text: "can't be more than the total (270)." });
    expect(itemErrorOf("status: bad")).toBeNull();
  });
});

describe("Add progress on something else (S2c-06), at the bottom", () => {
  const SCI = item({ assignmentId: "sci", title: "Science", unitType: "lessons", plannedFrom: 12, plannedTo: 12, totalUnits: 120 });
  const PIANO = item({ assignmentId: "piano", title: "Piano", unitType: "minutes", plannedFrom: 300, plannedTo: 300, totalUnits: 1800 });
  const ART_M = item({ assignmentId: "art", childId: "c2", childName: "Margaret", title: "Art", unitType: "lessons", plannedFrom: 4, plannedTo: 4, totalUnits: 30 });
  const ADDABLE: WeekCheckIn = { ...WEEK, addable: [SCI, ART_M, PIANO] };
  const openAdd = async (c: HTMLElement) => {
    const add = within(c).getByRole("button", { name: "Add progress on something else" });
    expect(add).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(add);
    return within(c).getByRole("list", { name: "Assignments with nothing planned" });
  };

  it("offers the shown child's pairs; an added row opens with only the stepper, and saves once moved", async () => {
    const c = await showCard(ADDABLE);
    const list = await openAdd(c);
    expect(within(list).getAllByRole("button").map((b) => b.textContent)).toEqual(["Frank — Piano", "Frank — Science"]);
    await userEvent.click(within(list).getByRole("button", { name: "Frank — Science" }));
    const sci = await rowFor(c, "Science");
    expect(sci.querySelector(".checkin-row-plan")).toHaveTextContent("Not planned");
    expect(within(sci).queryByRole("group", { name: /^How / })).toBeNull();
    expect(within(c).getByRole("button", { name: "Looks right" })).toBeInTheDocument(); // left at 0, nothing to save
    await step(sci, "One more", 3);
    expect(sci.querySelector(".checkin-row-state")).toHaveTextContent("+3 lessons");
    await userEvent.click(within(c).getByRole("button", { name: "Save" }));
    await screen.findByRole("status");
    expect(puts().map((p) => p.body)).toEqual([{ status: "reviewed", items: [
      { assignmentId: "sci", childId: "c1", position: 15, mode: "keepEndDate" },
    ] }]);
  });

  it("an added row can be removed, and is offered again; planned rows have no Remove", async () => {
    const c = await showCard(ADDABLE);
    await userEvent.click(within(await openAdd(c)).getByRole("button", { name: "Frank — Piano" }));
    await userEvent.click(within(c).getByRole("button", { name: "Remove Piano for Frank" }));
    expect(within(c).queryByText("Piano")).toBeNull();
    expect(within(await openAdd(c)).getByRole("button", { name: "Frank — Piano" })).toBeInTheDocument();
    expect(within(c).queryByRole("button", { name: /Remove Treasure Island/ })).toBeNull();
  });

  it("no link when there's nothing to add", async () => {
    const c = await showCard();
    expect(within(c).queryByRole("button", { name: /Add progress/ })).toBeNull();
  });
});
