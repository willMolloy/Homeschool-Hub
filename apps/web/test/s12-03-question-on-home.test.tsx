/** S12-03: "Did Frank finish Treasure Island?" on Home: one card or a list, the three answers, their requests, order and layout. */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ENGINE_VERSION, planAll, type Assignment as EngineAssignment, type ChildPlan, type ProgressCheckIn } from "@hh/engine";
import type { Assignment } from "../src/api/types";
import { HOME_PANES_QUERY } from "../src/features/home/HomePage";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";

// The fake family's today is Wed 2026-10-28.
const book = (over: Partial<Assignment>): Assignment => ({
  id: "ti", subjectId: "lit", title: "Treasure Island", unitType: "pages", totalUnits: 100, weightPerUnit: null,
  startDate: "2026-10-05", endDate: "2026-10-23", childIds: ["c1"], archived: false, weekdays: null, endedAs: null, endedOn: null, ...over,
});
const KIDS = [
  { id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false },
  { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false },
];

/** A stateful fake: the list is what the PATCHes made of it. */
function stub(initial: Assignment[]) {
  let list = initial;
  fakeApi.on("GET /api/children", 200, KIDS);
  fakeApi.on("GET /api/subjects", 200, [
    { id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false, icon: "book" },
    { id: "math", name: "Math", color: null, sortOrder: 1, archived: false },
  ]);
  fakeApi.on("GET /api/assignments", () => [200, list]);
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: "2026-08-01", to: "2027-06-30", plans: [] });
  const patch = (_b: unknown, path: string) => {
    const id = path.split("/").pop()!;
    const body = _b as Partial<Assignment> & { endedOn?: string };
    list = list.map((a) => (a.id === id ? { ...a, ...body, endedOn: body.endedOn ?? a.endedOn } : a));
    return [200, list.find((a) => a.id === id)] as [number, unknown];
  };
  for (const a of initial) fakeApi.on(`PATCH /api/assignments/${a.id}`, patch);
}
const patches = () => fakeApi.calls.filter((c) => c.method === "PATCH" && c.path.startsWith("/api/assignments/"));

function width(wide: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === HOME_PANES_QUERY ? wide : false, media: query, onchange: null,
    addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => false,
  }));
}

describe("the completion question on Home (S12-03)", () => {
  beforeEach(() => width(false));

  it("shows nothing when nothing is waiting", async () => {
    stub([book({ endDate: "2026-11-20" })]);
    renderAt("/");
    await screen.findByText(/Wednesday, Oct 28/);
    await screen.findByRole("heading", { level: 2, name: "Schedule" });
    await waitFor(() => expect(fakeApi.calls.some((c) => c.path === "/api/assignments")).toBe(true));
    await new Promise((r) => setTimeout(r, 50));
    expect(screen.queryByRole("region", { name: "A question for you" })).not.toBeInTheDocument();
  });

  it("one waiting: the question, when it ended and three buttons", async () => {
    stub([book({})]);
    renderAt("/");
    const card = await screen.findByRole("region", { name: "A question for you" });
    expect(within(card).getByRole("heading", { level: 2, name: "Did Frank finish Treasure Island?" })).toBeInTheDocument();
    expect(within(card).getByText("Ended Oct 23")).toBeInTheDocument();
    expect(within(card).getAllByRole("button").map((b) => b.textContent)).toEqual(["Yes, finished", "Not yet", "We stopped"]);
  });

  it("Yes, finished: the end date is offered, Save sends finished with it, and the card goes", async () => {
    stub([book({})]);
    const user = userEvent.setup();
    renderAt("/");
    await user.click(await screen.findByRole("button", { name: "Yes, finished" }));
    const sheet = await screen.findByRole("dialog", { name: "Finished Treasure Island" });
    expect(within(sheet).getByLabelText("Finished on")).toHaveValue("Oct 23, 2026");
    await user.click(within(sheet).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]).toMatchObject({ path: "/api/assignments/ti", body: { endedAs: "finished", endedOn: "2026-10-23" } });
    await waitFor(() => expect(screen.queryByRole("region", { name: "A question for you" })).not.toBeInTheDocument());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("Yes, finished: the day can be changed before saving", async () => {
    stub([book({})]);
    const user = userEvent.setup();
    renderAt("/");
    await user.click(await screen.findByRole("button", { name: "Yes, finished" }));
    const field = await screen.findByLabelText("Finished on");
    await user.clear(field);
    await user.type(field, "10/21/2026");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]!.body).toEqual({ endedAs: "finished", endedOn: "2026-10-21" });
  });

  it("We stopped: today is offered and sent as stopped, never finished", async () => {
    stub([book({})]);
    const user = userEvent.setup();
    renderAt("/");
    await user.click(await screen.findByRole("button", { name: "We stopped" }));
    expect(await screen.findByLabelText("Stopped on")).toHaveValue("Oct 28, 2026");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]!.body).toEqual({ endedAs: "stopped", endedOn: "2026-10-28" });
    await waitFor(() => expect(screen.queryByRole("region", { name: "A question for you" })).not.toBeInTheDocument());
  });

  it("Not yet: a new end a week from today is offered; Save moves the end (the existing end-date PATCH) and the card goes", async () => {
    stub([book({})]);
    const user = userEvent.setup();
    renderAt("/");
    await user.click(await screen.findByRole("button", { name: "Not yet" }));
    const sheet = await screen.findByRole("dialog", { name: "Move the end of Treasure Island" });
    expect(within(sheet).getByLabelText("New end date")).toHaveValue("Nov 4, 2026");
    expect(within(sheet).getByText("The question comes back after this day.")).toBeInTheDocument();
    await user.click(within(sheet).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]).toMatchObject({ path: "/api/assignments/ti", body: { endDate: "2026-11-04" } });
    expect(patches()[0]!.body).not.toHaveProperty("endedAs");
    await waitFor(() => expect(screen.queryByRole("region", { name: "A question for you" })).not.toBeInTheDocument());
  });

  it("refuses a day that would break the answer, in the parent's words, and sends nothing", async () => {
    stub([book({})]);
    const user = userEvent.setup();
    renderAt("/");
    await user.click(await screen.findByRole("button", { name: "Not yet" }));
    const field = await screen.findByLabelText("New end date");
    await user.clear(field);
    await user.type(field, "10/01/2026");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Pick today or a later day");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    await user.click(await screen.findByRole("button", { name: "We stopped" }));
    const stopped = await screen.findByLabelText("Stopped on");
    await user.clear(stopped);
    await user.type(stopped, "11/20/2026");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("That day hasn't come yet.");
    expect(patches()).toHaveLength(0);
  });

  it("shows the API's message when saving fails, and keeps the question", async () => {
    stub([book({})]);
    fakeApi.on("PATCH /api/assignments/ti", 400, { error: "invalid_range", message: "It can't end before it starts." });
    const user = userEvent.setup();
    renderAt("/");
    await user.click(await screen.findByRole("button", { name: "Yes, finished" }));
    await user.click(await screen.findByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("It can't end before it starts.");
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(await screen.findByRole("region", { name: "A question for you" })).toBeInTheDocument();
  });

  it("Undo is offered after an answer (the PATCH is an undoable plan change)", async () => {
    stub([book({})]);
    fakeApi.on("GET /api/undo", 200, { label: "Marked Treasure Island finished", createdAt: "2026-10-28T12:00:00Z" });
    const user = userEvent.setup();
    renderAt("/");
    await user.click(await screen.findByRole("button", { name: "Yes, finished" }));
    await user.click(await screen.findByRole("button", { name: "Save" }));
    expect(await screen.findByText("Marked Treasure Island finished.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Undo" })).toBeInTheDocument();
  });

  it("names every child on the assignment", async () => {
    stub([book({ id: "hist", title: "History spine", childIds: ["c2", "c1"] })]);
    renderAt("/");
    expect(await screen.findByRole("heading", { level: 2, name: "Did Frank and Margaret finish History spine?" })).toBeInTheDocument();
  });
});

describe("several waiting (S12-03)", () => {
  beforeEach(() => width(false));
  const three = () => stub([
    book({ id: "a", title: "Treasure Island", endDate: "2026-10-23" }),
    book({ id: "b", title: "Aesop's Fables", endDate: "2026-10-16", subjectId: "math", childIds: ["c2"] }),
    book({ id: "c", title: "Poems", endDate: "2026-10-26", childIds: ["c1", "c2"] }),
  ]);

  it("is one card, \"3 assignments ended\", that opens a sheet listing each, oldest first, with the same three choices", async () => {
    three();
    const user = userEvent.setup();
    renderAt("/");
    const card = await screen.findByRole("region", { name: "A question for you" });
    expect(within(card).getByRole("heading", { level: 2, name: "3 assignments ended" })).toBeInTheDocument();
    expect(within(card).getByText("Aesop's Fables, Treasure Island and 1 more")).toBeInTheDocument();
    await user.click(within(card).getByRole("button", { name: "Answer them" }));
    const sheet = await screen.findByRole("dialog", { name: "3 assignments ended" });
    const rows = within(sheet).getAllByRole("listitem");
    expect(rows.map((r) => within(r).getByText(/^Did /).textContent)).toEqual([
      "Did Margaret finish Aesop's Fables?", "Did Frank finish Treasure Island?", "Did Frank and Margaret finish Poems?",
    ]);
    for (const r of rows) expect(within(r).getAllByRole("button")).toHaveLength(3);
    expect(within(rows[0]!).getByRole("button", { name: "Not yet: Aesop's Fables" })).toBeInTheDocument();
  });

  it("answering one removes its row and comes back to the list; the last answer closes the sheet and the card goes", async () => {
    three();
    const user = userEvent.setup();
    renderAt("/");
    await user.click(await screen.findByRole("button", { name: "Answer them" }));
    await user.click(await screen.findByRole("button", { name: "Yes, finished: Treasure Island" }));
    await user.click(await screen.findByRole("button", { name: "Save" }));
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]).toMatchObject({ path: "/api/assignments/a", body: { endedAs: "finished", endedOn: "2026-10-23" } });
    const sheet = await screen.findByRole("dialog", { name: "2 assignments ended" });
    expect(within(sheet).getAllByRole("listitem")).toHaveLength(2);
    expect(within(sheet).queryByText("Did Frank finish Treasure Island?")).not.toBeInTheDocument();
    await user.click(within(sheet).getByRole("button", { name: "We stopped: Aesop's Fables" }));
    await user.click(await screen.findByRole("button", { name: "Save" }));
    // One left: the sheet is the list of one, still with its three choices.
    await user.click(await screen.findByRole("button", { name: "Not yet: Poems" }));
    await user.click(await screen.findByRole("button", { name: "Save" }));
    await waitFor(() => expect(screen.queryByRole("region", { name: "A question for you" })).not.toBeInTheDocument());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(patches().map((p) => p.body)).toEqual([
      { endedAs: "finished", endedOn: "2026-10-23" }, { endedAs: "stopped", endedOn: "2026-10-28" }, { endDate: "2026-11-04" },
    ]);
  });

  it("Cancel in an answer goes back to the list", async () => {
    three();
    const user = userEvent.setup();
    renderAt("/");
    await user.click(await screen.findByRole("button", { name: "Answer them" }));
    await user.click(await screen.findByRole("button", { name: "Yes, finished: Poems" }));
    await user.click(await screen.findByRole("button", { name: "Cancel" }));
    expect(await screen.findByRole("dialog", { name: "3 assignments ended" })).toBeInTheDocument();
    expect(patches()).toHaveLength(0);
  });
});

describe("where the question sits (S12-03)", () => {
  const CALENDAR = { weekStart: "mon" as const, schoolDays: [1, 2, 3, 4, 5] as ChildPlan["weekdays"] & number[] };
  const LATE: EngineAssignment = { id: "late", subjectId: "lit", childIds: ["c1"], unitType: "pages", totalUnits: 100, start: "2026-09-07", end: "2026-12-18" };
  /** A real plan with two slow weeks, so the briefing's late line shows too. */
  function slowPlan(): ChildPlan {
    const checkIns: ProgressCheckIn[] = [
      { assignmentId: "late", childId: "c1", weekStart: "2026-09-14", position: 5, mode: "keepEndDate" },
      { assignmentId: "late", childId: "c1", weekStart: "2026-09-21", position: 10, mode: "keepEndDate" },
    ];
    return planAll([LATE], { calendar: CALENDAR, asOf: "2026-10-28", checkIns })[0]!;
  }
  function withBriefing() {
    stub([book({}), book({ id: "late", title: "Long book", startDate: "2026-09-07", endDate: "2026-12-18" })]);
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: "2026-08-01", to: "2027-06-30", plans: [slowPlan()] });
    fakeApi.on("GET /api/me", 200, { ...DEMO_ME, setupDeferred: ["breaks"] });
  }

  it("is first, above the briefing and the other cards, on a phone", async () => {
    withBriefing();
    width(false);
    renderAt("/");
    await screen.findByRole("region", { name: "Needs you" });
    const home = (await screen.findByRole("main")).querySelector(".home") as HTMLElement;
    const parts = [...home.querySelectorAll(".home-question, .home-briefing, .home-checklist, .home-card:not(.home-checklist):not(.home-question-card)")];
    expect(parts.map((el) => el.classList.contains("home-question") ? "question" : el.classList.contains("home-briefing") ? "briefing" : el.classList.contains("home-checklist") ? "checklist" : el.querySelector("h2")!.textContent))
      .toEqual(["question", "briefing", "checklist", "Schedule", "Records"]);
  });

  it("from 840 px spans both panes, above the briefing and the panes", async () => {
    withBriefing();
    width(true);
    renderAt("/");
    await screen.findByRole("region", { name: "Needs you" });
    const home = (await screen.findByRole("main")).querySelector(".home") as HTMLElement;
    const question = home.querySelector(".home-question")!;
    const panes = home.querySelector(".home-panes")!;
    expect(panes.contains(question)).toBe(false);
    expect(question.compareDocumentPosition(home.querySelector(".home-briefing")!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(question.compareDocumentPosition(panes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});
