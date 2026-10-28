/** S2b-26: ask how to absorb a difference, save the changed rows, refetch the plan. */
import { act, fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { CheckInItem, WeekCheckIn } from "../src/api/types";
import { outcomeText, rowOutcome } from "../src/features/checkin/absorb";
import { THANKS_MS } from "../src/features/checkin/LastWeekCheckIn";
import { itemErrorOf } from "../src/features/checkin/useLastWeekCheckIn";
import { EMPTY_WEEK, fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const item = (over: Partial<CheckInItem>): CheckInItem => ({
  assignmentId: "ti", childId: "c1", childName: "Frank", title: "Treasure Island", unitType: "pages",
  plannedFrom: 0, plannedTo: 80, totalUnits: 270, actual: null, mode: null, ...over,
});
const TI = item({});
const HIST_F = item({ assignmentId: "hist", title: "Story of the World", plannedFrom: 100, plannedTo: 140, totalUnits: 400 });
const HIST_M = item({ ...HIST_F, childId: "c2", childName: "Margaret" });
const FRACS = item({ assignmentId: "fracs", childId: "c2", childName: "Margaret", title: "Fractions", unitType: "lessons", plannedFrom: 10, plannedTo: 15, totalUnits: 18 });
const WEEK: WeekCheckIn = { ...EMPTY_WEEK, status: null, items: [TI, HIST_F, HIST_M, FRACS] };
const PUT = `PUT /api/check-ins/${WEEK.weekStart}`;
const puts = () => fakeApi.calls.filter((c) => c.method === "PUT");
const sent = () => (puts().at(-1)!.body as { items: unknown[] }).items;

async function openCard(week: WeekCheckIn = WEEK) {
  fakeApi.on("GET /api/check-ins", 200, week);
  fakeApi.on("GET /api/plan", 200, { engineVersion: "x", asOf: "2026-10-28", from: "2026-10-26", to: "2026-11-01", plans: [] });
  fakeApi.on("GET /api/children", 200, []);
  fakeApi.on("GET /api/subjects", 200, []);
  fakeApi.on(PUT, (body) => [200, { ...week, status: (body as { status: string }).status, planChanged: true }]);
  renderAt("/");
  const card = await screen.findByRole("region", { name: /How did last week go\?/ });
  await userEvent.click(within(card).getByRole("button", { name: "Adjust" }));
  return card;
}
const row = (card: HTMLElement, name: string) => within(card).getByRole("group", { name: `Progress on ${name}` }).closest("li")!;
const setField = (r: HTMLElement, v: string) => fireEvent.change(within(r).getByRole("spinbutton"), { target: { value: v } });

describe("absorb wording", () => {
  it("classifies with the 0.5 tolerance and the total", () => {
    expect(rowOutcome(TI, 80.5)).toBe("asPlanned");
    expect(rowOutcome(TI, 79.5)).toBe("asPlanned");
    expect(rowOutcome(TI, 79.4)).toBe("behind");
    expect(rowOutcome(TI, 80.6)).toBe("ahead");
    expect(rowOutcome(TI, 270)).toBe("finished");
    expect(outcomeText(HIST_M, 125)).toBe("Margaret is 15 pages behind on Story of the World.");
    expect(outcomeText(TI, 100)).toBe("Frank is 20 pages ahead on Treasure Island.");
    expect(outcomeText(FRACS, 14)).toBe("Margaret is 1 lesson behind on Fractions.");
    expect(outcomeText(TI, 270)).toBe("Frank finished Treasure Island early 🎉");
  });
  it("finds the item in a 400 message", () => {
    expect(itemErrorOf("items.1.position: can't be more than the total (270).")).toEqual({ index: 1, text: "can't be more than the total (270)." });
    expect(itemErrorOf("items.0: must be one of this week's assignments for that child.")).toEqual({ index: 0, text: "must be one of this week's assignments for that child." });
    expect(itemErrorOf("status: bad")).toBeNull();
  });
});

describe("the card asks and saves", () => {
  it("behind asks thicken/push with keepEndDate preselected", async () => {
    const card = await openCard();
    const r = row(card, "Treasure Island for Frank");
    setField(r, "65");
    expect(within(r).getByText("Frank is 15 pages behind on Treasure Island.")).toBeInTheDocument();
    expect(within(r).getByRole("radio", { name: "Thicken the remaining weeks" })).toBeChecked();
    expect(within(r).getByRole("radio", { name: "Push the end date" })).not.toBeChecked();
  });

  it("ahead asks thin/pull", async () => {
    const card = await openCard();
    const r = row(card, "Treasure Island for Frank");
    setField(r, "100");
    expect(within(r).getByText("Frank is 20 pages ahead on Treasure Island.")).toBeInTheDocument();
    expect(within(r).getByRole("radio", { name: "Thin the remaining bars" })).toBeChecked();
    expect(within(r).getByRole("radio", { name: "Pull the end date in" })).toBeInTheDocument();
  });

  it("finished asks nothing and sends mode null", async () => {
    const card = await openCard();
    const r = row(card, "Fractions for Margaret");
    await userEvent.click(within(r).getByRole("button", { name: "Finished it" }));
    expect(within(r).getByText("Margaret finished Fractions early 🎉")).toBeInTheDocument();
    expect(within(r).queryByRole("radio")).toBeNull();
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));
    expect(sent()).toEqual([{ assignmentId: "fracs", childId: "c2", position: 18, mode: null }]);
  });

  it("within 0.5 asks nothing, isn't sent, and leaves Save off", async () => {
    const card = await openCard();
    const r = row(card, "Treasure Island for Frank");
    setField(r, "80.5");
    expect(within(r).queryByRole("radio")).toBeNull();
    expect(within(card).getByRole("button", { name: "Save" })).toBeDisabled();
  });

  it("the default mode is sent in one tap; changing it sends the other", async () => {
    const card = await openCard();
    const r = row(card, "Treasure Island for Frank");
    setField(r, "65");
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));
    expect(puts()[0]!.body).toEqual({ status: "reviewed", items: [{ assignmentId: "ti", childId: "c1", position: 65, mode: "keepEndDate" }] });
  });
  it("choosing push sends pushEndDate", async () => {
    const card = await openCard();
    const r = row(card, "Treasure Island for Frank");
    setField(r, "65");
    await userEvent.click(within(r).getByRole("radio", { name: "Push the end date" }));
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));
    expect(sent()).toEqual([{ assignmentId: "ti", childId: "c1", position: 65, mode: "pushEndDate" }]);
  });

  it("Save PUTs, then refetches the plan in place, then thanks and goes after ~3 s", async () => {
    const card = await openCard();
    setField(row(card, "Treasure Island for Frank"), "65");
    const before = fakeApi.calls.length;
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      await userEvent.click(within(card).getByRole("button", { name: "Save" }));
      expect(await screen.findByRole("status")).toHaveTextContent("Thanks — plan updated");
      const after = fakeApi.calls.slice(before).map((c) => `${c.method} ${c.path.split("?")[0]}`);
      expect(after.indexOf("PUT /api/check-ins/2026-10-19")).toBe(0);
      expect(after.indexOf("GET /api/plan")).toBeGreaterThan(0);
      expect(screen.getByRole("heading", { name: "Plan" })).toBeInTheDocument(); // no page reload
      await act(async () => { vi.advanceTimersByTime(THANKS_MS + 10); });
      expect(screen.queryByRole("status")).toBeNull();
      expect(screen.queryByRole("region", { name: /How did last week go\?/ })).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("a 400 shows on its row and the card stays", async () => {
    const card = await openCard();
    fakeApi.on(PUT, 400, { error: "invalid_request", message: "items.1.position: can't be more than the total (400)." });
    setField(row(card, "Treasure Island for Frank"), "65");
    setField(row(card, "Story of the World for Frank"), "120");
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));
    const hist = row(card, "Story of the World for Frank");
    expect(await within(hist).findByRole("alert")).toHaveTextContent("can't be more than the total (400).");
    expect(within(row(card, "Treasure Island for Frank")).queryByRole("alert")).toBeNull();
    expect(fakeApi.calls.filter((c) => c.path.startsWith("/api/plan")).length).toBe(1); // no refetch on failure
  });

  it("two rows behind with apply-to-all → one choice for both", async () => {
    const card = await openCard();
    setField(row(card, "Story of the World for Frank"), "125");
    setField(row(card, "Story of the World for Margaret"), "125");
    for (const n of ["Story of the World for Frank", "Story of the World for Margaret"]) {
      expect(within(row(card, n)).queryByRole("radio")).toBeNull();
    }
    expect(within(card).getByRole("checkbox", { name: "Apply one choice to all 2 rows behind" })).toBeChecked();
    expect(within(card).getAllByRole("radio", { name: "Push the end date" })).toHaveLength(1);
    await userEvent.click(within(card).getByRole("radio", { name: "Push the end date" }));
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));
    expect(sent()).toEqual([
      { assignmentId: "hist", childId: "c1", position: 125, mode: "pushEndDate" },
      { assignmentId: "hist", childId: "c2", position: 125, mode: "pushEndDate" },
    ]);
  });

  it("unticking apply-to-all asks per row", async () => {
    const card = await openCard();
    setField(row(card, "Story of the World for Frank"), "125");
    setField(row(card, "Story of the World for Margaret"), "125");
    await userEvent.click(within(card).getByRole("checkbox", { name: /Apply one choice/ }));
    await userEvent.click(within(row(card, "Story of the World for Margaret")).getByRole("radio", { name: "Push the end date" }));
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));
    expect(sent()).toEqual([
      { assignmentId: "hist", childId: "c1", position: 125, mode: "keepEndDate" },
      { assignmentId: "hist", childId: "c2", position: 125, mode: "pushEndDate" },
    ]);
  });

  it("behind and ahead groups are separate", async () => {
    const card = await openCard();
    setField(row(card, "Treasure Island for Frank"), "65");
    setField(row(card, "Story of the World for Frank"), "150");
    expect(within(card).queryByRole("checkbox")).toBeNull();
    expect(within(row(card, "Treasure Island for Frank")).getByRole("radio", { name: "Thicken the remaining weeks" })).toBeChecked();
    expect(within(row(card, "Story of the World for Frank")).getByRole("radio", { name: "Thin the remaining bars" })).toBeChecked();
  });

  it("only changed rows are sent", async () => {
    const card = await openCard();
    setField(row(card, "Story of the World for Margaret"), "130");
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));
    expect(sent()).toEqual([{ assignmentId: "hist", childId: "c2", position: 130, mode: "keepEndDate" }]);
    expect(fakeApi.bodyKeyViolations).toEqual([]);
  });
});
