/** S2b-27: reopen a finished week's check-in from the plan screen and correct it. */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { CheckInItem, PastWeek, WeekCheckIn } from "../src/api/types";
import { weekRangeText } from "../src/features/checkin/checkinText";
import { initialAnswers } from "../src/features/checkin/LastWeekCard";
import { laterCheckInsExist } from "../src/features/checkin/PastWeekPicker";
import { LATER_NOTE } from "../src/features/checkin/PastWeekReview";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

const item = (over: Partial<CheckInItem>): CheckInItem => ({
  assignmentId: "ti", childId: "c1", childName: "Frank", title: "Treasure Island", unitType: "pages",
  plannedFrom: 0, plannedTo: 80, totalUnits: 270, actual: null, mode: null, ...over,
});
const TI = item({ actual: 60, mode: "pushEndDate" });
const HIST = item({ assignmentId: "hist", title: "Story of the World", plannedFrom: 100, plannedTo: 140, totalUnits: 400 });
const OCT12: WeekCheckIn = { weekStart: "2026-10-12", weekEnd: "2026-10-18", status: "reviewed", items: [TI, HIST] };
const OCT5: WeekCheckIn = { weekStart: "2026-10-05", weekEnd: "2026-10-11", status: "skipped", items: [item({}), HIST] };
const WEEKS: PastWeek[] = [
  { weekStart: "2026-10-19", weekEnd: "2026-10-25", status: null, hasCheckIns: false },
  { weekStart: "2026-10-12", weekEnd: "2026-10-18", status: "reviewed", hasCheckIns: true },
  { weekStart: "2026-10-05", weekEnd: "2026-10-11", status: "skipped", hasCheckIns: false },
];
const puts = () => fakeApi.calls.filter((c) => c.method === "PUT");

function stub(weeks: PastWeek[] = WEEKS) {
  fakeApi.on("GET /api/plan", 200, { engineVersion: "x", asOf: "2026-10-28", from: "2026-10-26", to: "2026-11-01", plans: [] });
  fakeApi.on("GET /api/children", 200, []);
  fakeApi.on("GET /api/subjects", 200, []);
  fakeApi.on("GET /api/check-ins/weeks", 200, { weeks });
  for (const w of [OCT12, OCT5]) {
    fakeApi.on(`GET /api/check-ins?weekStart=${w.weekStart}`, 200, w);
    fakeApi.on(`PUT /api/check-ins/${w.weekStart}`, (body) => {
      const b = body as { status: "reviewed"; items: { assignmentId: string; position: number; mode: string | null }[] };
      const items = w.items.map((i) => {
        const s = b.items.find((x) => x.assignmentId === i.assignmentId);
        return { ...i, actual: s?.position ?? null, mode: (s?.mode ?? null) as CheckInItem["mode"] };
      });
      return [200, { ...w, status: b.status, items, planChanged: true }];
    });
  }
}

async function openPicker() {
  renderAt("/");
  await userEvent.click(await screen.findByRole("button", { name: "Review a past week" }));
  return screen.findByRole("list", { name: "Past weeks" });
}
async function openWeek(label: string) {
  const list = await openPicker();
  await userEvent.click(within(list).getByRole("button", { name: label }));
  return screen.findByRole("region", { name: new RegExp(`Week of ${label}`) });
}
const row = (card: HTMLElement, name: string) => within(card).getByRole("group", { name: `Progress on ${name}` }).closest("li")!;

describe("the past-week picker", () => {
  it("lists the API's finished weeks with their status; fetches only when opened", async () => {
    stub();
    renderAt("/");
    await screen.findByRole("button", { name: "Review a past week" });
    expect(fakeApi.calls.some((c) => c.path === "/api/check-ins/weeks")).toBe(false);
    await userEvent.click(screen.getByRole("button", { name: "Review a past week" }));
    const list = await screen.findByRole("list", { name: "Past weeks" });
    const items = within(list).getAllByRole("listitem").map((li) => li.textContent);
    expect(items).toEqual(["Oct 19–25 not reviewed", "Oct 12–18 reviewed", "Oct 5–11 skipped"]);
  });

  it("current and future weeks are not listed (the picker shows only what the API returns)", async () => {
    stub();
    const list = await openPicker();
    expect(within(list).queryByRole("button", { name: /Oct 26/ })).toBeNull();
    expect(within(list).queryByRole("button", { name: /Nov/ })).toBeNull();
  });

  it("says so when there are no finished weeks", async () => {
    stub([]);
    renderAt("/");
    await userEvent.click(await screen.findByRole("button", { name: "Review a past week" }));
    expect(await screen.findByText("No finished weeks with planned work yet.")).toBeInTheDocument();
  });

  it("formats weeks across a month", () => {
    expect(weekRangeText("2026-09-28", "2026-10-04")).toBe("Sep 28 – Oct 4");
    expect(weekRangeText("2026-10-12", "2026-10-18")).toBe("Oct 12–18");
  });
});

describe("editing a past week", () => {
  it("opening a reviewed week shows its stored values, expanded, with no prompt buttons", async () => {
    stub();
    const card = await openWeek("Oct 12–18");
    expect(fakeApi.calls.some((c) => c.path === "/api/check-ins?weekStart=2026-10-12")).toBe(true);
    expect(within(card).getByText("(reviewed)")).toBeInTheDocument();
    const ti = row(card, "Treasure Island for Frank");
    expect(within(ti).getByRole("spinbutton")).toHaveValue(60);
    expect(within(ti).getByRole("radio", { name: "Push the end date" })).toBeChecked();
    expect(within(row(card, "Story of the World for Frank")).getByRole("spinbutton")).toHaveValue(140);
    expect(within(card).queryByRole("button", { name: "Last week went as planned" })).toBeNull();
    expect(within(card).queryByRole("button", { name: "Skip" })).toBeNull();
    expect(within(card).getByRole("button", { name: "Save" })).toBeEnabled();
  });

  it("saving unchanged re-sends the whole week (replace semantics)", async () => {
    stub();
    const card = await openWeek("Oct 12–18");
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));
    expect(puts().at(-1)).toMatchObject({
      path: "/api/check-ins/2026-10-12",
      body: { status: "reviewed", items: [{ assignmentId: "ti", childId: "c1", position: 60, mode: "pushEndDate" }] },
    });
  });

  it("clearing a change sends a PUT without that item, and refreshes the week list", async () => {
    stub();
    const card = await openWeek("Oct 12–18");
    const before = fakeApi.calls.filter((c) => c.path === "/api/check-ins/weeks").length;
    await userEvent.click(within(row(card, "Treasure Island for Frank")).getByRole("button", { name: "Reset" }));
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));
    expect(puts().at(-1)!.body).toEqual({ status: "reviewed", items: [] });
    expect(await screen.findByRole("status")).toHaveTextContent("Thanks — plan updated");
    expect(fakeApi.calls.filter((c) => c.path === "/api/check-ins/weeks").length).toBe(before + 1);
    expect(fakeApi.bodyKeyViolations).toEqual([]);
  });

  it("skipped weeks are editable and saving marks them reviewed", async () => {
    stub();
    const card = await openWeek("Oct 5–11");
    expect(within(card).getByText("(skipped)")).toBeInTheDocument();
    fireEvent.change(within(row(card, "Treasure Island for Frank")).getByRole("spinbutton"), { target: { value: "70" } });
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));
    expect(puts().at(-1)).toMatchObject({
      path: "/api/check-ins/2026-10-05",
      body: { status: "reviewed", items: [{ assignmentId: "ti", position: 70, mode: "keepEndDate" }] },
    });
    expect(await screen.findByText("(reviewed)")).toBeInTheDocument();
  });

  it("the note shows when later check-ins exist, and not otherwise", async () => {
    stub();
    await openWeek("Oct 5–11");
    expect(screen.getByText(LATER_NOTE)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Close" }));
    await userEvent.click(within(screen.getByRole("list", { name: "Past weeks" })).getByRole("button", { name: "Oct 12–18" }));
    await screen.findByRole("region", { name: /Week of Oct 12–18/ });
    expect(screen.queryByText(LATER_NOTE)).toBeNull();
    expect(laterCheckInsExist(WEEKS, "2026-10-12")).toBe(false);
    expect(laterCheckInsExist(WEEKS, "2026-10-11")).toBe(true);
  });

  it("is never auto-hidden by status: a reviewed week stays open after saving", async () => {
    stub();
    const card = await openWeek("Oct 12–18");
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));
    await screen.findByRole("status");
    expect(screen.getByRole("region", { name: /Week of Oct 12–18/ })).toBeInTheDocument();
  });
});

describe("initialAnswers", () => {
  it("shares a direction's answer only when every stored row agrees", () => {
    const a = item({ assignmentId: "a", actual: 50, mode: "pushEndDate" });
    const b = item({ assignmentId: "b", actual: 40, mode: "pushEndDate" });
    const c = item({ assignmentId: "c", actual: 30, mode: "keepEndDate" });
    expect(initialAnswers([a, b]).applyAll.behind).toBe(true);
    expect(initialAnswers([a, b]).groupModes.behind).toBe("pushEndDate");
    expect(initialAnswers([a, b, c]).applyAll.behind).toBe(false);
    expect(initialAnswers([a, b, c]).rowModes).toEqual({ "a/c1": "pushEndDate", "b/c1": "pushEndDate", "c/c1": "keepEndDate" });
    expect(initialAnswers([item({})]).positions).toEqual({});
  });
});

/** S2c-05 (L3): a save on the home card updates the past-week labels without a reload. */
describe("the past-week list after a home-card save", () => {
  const LAST: WeekCheckIn = { weekStart: "2026-10-19", weekEnd: "2026-10-25", status: null, items: [item({})] };
  const homeCard = () => screen.findByRole("region", { name: /How did last week go\?/ });

  function stubHome() {
    stub();
    fakeApi.on("GET /api/check-ins", 200, LAST);
    fakeApi.on(`PUT /api/check-ins/${LAST.weekStart}`, (body) => {
      const status = (body as { status: PastWeek["status"] }).status;
      // The list now reports last week as the API stored it.
      fakeApi.on("GET /api/check-ins/weeks", 200, { weeks: [{ ...WEEKS[0]!, status }, ...WEEKS.slice(1)] });
      return [200, { ...LAST, status, planChanged: false }];
    });
  }
  const firstWeek = () => within(screen.getByRole("list", { name: "Past weeks" })).getAllByRole("listitem")[0];

  it.each([
    ["Last week went as planned", "reviewed"],
    ["Skip", "skipped"],
  ])("%s → Oct 19–25 shows %s", async (button, status) => {
    stubHome();
    await openPicker();
    const card = await homeCard();
    expect(firstWeek()).toHaveTextContent("Oct 19–25 not reviewed");
    await userEvent.click(within(card).getByRole("button", { name: button }));
    await waitFor(() => expect(firstWeek()).toHaveTextContent(`Oct 19–25 ${status}`));
  });

  it("Save from Adjust → the list refetches", async () => {
    stubHome();
    await openPicker();
    const card = await homeCard();
    const before = fakeApi.calls.filter((c) => c.path === "/api/check-ins/weeks").length;
    await userEvent.click(within(card).getByRole("button", { name: "Adjust" }));
    fireEvent.change(within(row(card, "Treasure Island for Frank")).getByRole("spinbutton"), { target: { value: "60" } });
    await userEvent.click(within(card).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(fakeApi.calls.filter((c) => c.path === "/api/check-ins/weeks").length).toBe(before + 1));
    await waitFor(() => expect(firstWeek()).toHaveTextContent("Oct 19–25 reviewed"));
  });
});

