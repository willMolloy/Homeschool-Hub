/** S12-06: an ended assignment's sheet and form say how it ended with Change: the same choices, or Not ended to reopen. */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import type { Assignment } from "../src/api/types";
import { defaultDay } from "../src/features/completion/answers";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_EVENTS, SAMPLE_SUBJECTS, samplePlans } from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

const ID = SAMPLE_ASSIGNMENTS[1]!.id;
const TITLE = SAMPLE_ASSIGNMENTS[1]!.title;
const ended = (over: Partial<Assignment> = {}): Assignment[] =>
  SAMPLE_ASSIGNMENTS.map((a) => (a.id === ID ? { ...a, endedAs: "finished", endedOn: "2026-10-22", ...over } : a));

/** A stateful fake for the sample family: PATCH changes the assignment the list then returns. */
function stub(initial: Assignment[]) {
  let list = initial;
  fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
  fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
  fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
  fakeApi.on("GET /api/assignments", () => [200, list]);
  fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
  fakeApi.on("GET /api/events", 200, SAMPLE_EVENTS);
  for (const a of initial) {
    fakeApi.on(`PATCH /api/assignments/${a.id}`, (b) => {
      const body = b as Partial<Assignment>;
      list = list.map((x) => (x.id === a.id ? { ...x, ...body, endedOn: body.endedAs === null ? null : body.endedOn ?? x.endedOn } as Assignment : x));
      return [200, list.find((x) => x.id === a.id)];
    });
  }
}
const patches = () => fakeApi.calls.filter((c) => c.method === "PATCH" && c.path === `/api/assignments/${ID}`);
function tap(svg: Element) {
  const band = svg.querySelector(`path.tl-band[data-assignment="${ID}"]`)!;
  const [x, y] = band.getAttribute("d")!.slice(1).split(/[ ,LCQVHZ]+/).filter(Boolean).map(Number);
  fireEvent.click(svg, { clientX: x! + 1, clientY: y! + 1 });
}
async function openSheet() {
  renderAt("/timeline");
  tap(await screen.findByRole("img", { name: "Year timeline" }));
  return screen.findByRole("region", { name: /^Edit / });
}

describe("changing an answer from the Year edit sheet (S12-06)", () => {
  it("shows the words and Change; an open assignment shows neither", async () => {
    stub(ended());
    const sheet = await openSheet();
    expect(within(sheet).getByText("Finished Oct 22")).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: `Change how ${TITLE} ended` })).toHaveTextContent("Change");
  });

  it("an open assignment has no ended line", async () => {
    stub(SAMPLE_ASSIGNMENTS);
    const sheet = await openSheet();
    expect(within(sheet).queryByText(/^(Finished|Stopped) /)).toBeNull();
    expect(within(sheet).queryByRole("button", { name: /^Change how/ })).toBeNull();
  });

  it("offers the same three choices and Not ended", async () => {
    stub(ended());
    const user = userEvent.setup();
    const sheet = await openSheet();
    await user.click(within(sheet).getByRole("button", { name: /^Change how/ }));
    const dlg = await screen.findByRole("dialog", { name: `Change ${TITLE}` });
    expect(within(dlg).getAllByRole("button").map((b) => b.textContent).filter((t) => t !== "×")).toEqual(["Yes, finished", "Not yet", "We stopped", "Not ended"]);
  });

  it("Finished to Stopped: asks for the day (the day it ended is offered) and sends stopped", async () => {
    stub(ended());
    const user = userEvent.setup();
    const sheet = await openSheet();
    await user.click(within(sheet).getByRole("button", { name: /^Change how/ }));
    await user.click(await screen.findByRole("button", { name: "We stopped" }));
    expect(await screen.findByLabelText("Stopped on")).toHaveValue("Oct 22, 2026");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]!.body).toEqual({ endedAs: "stopped", endedOn: "2026-10-22" });
    expect(await screen.findByText("Stopped Oct 22")).toBeInTheDocument();
  });

  it("Not yet reopens it with a new end in one change", async () => {
    stub(ended());
    const user = userEvent.setup();
    const sheet = await openSheet();
    await user.click(within(sheet).getByRole("button", { name: /^Change how/ }));
    await user.click(await screen.findByRole("button", { name: "Not yet" }));
    expect(await screen.findByLabelText("New end date")).toHaveValue("Nov 4, 2026");
    await user.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]!.body).toEqual({ endedAs: null, endDate: "2026-11-04" });
  });

  it("Not ended reopens it at once: the ended line goes and the bar is drawn as open again", async () => {
    stub(ended());
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
    const user = userEvent.setup();
    const sheet = await openSheet();
    await user.click(within(sheet).getByRole("button", { name: /^Change how/ }));
    await user.click(await screen.findByRole("button", { name: "Not ended" }));
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]!.body).toEqual({ endedAs: null });
    await waitFor(() => expect(screen.queryByText("Finished Oct 22")).not.toBeInTheDocument());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows the API's message when the change is refused, and keeps the answer", async () => {
    stub(ended());
    fakeApi.on(`PATCH /api/assignments/${ID}`, 400, { error: "invalid_range", message: "It can't end before it starts." });
    const user = userEvent.setup();
    const sheet = await openSheet();
    await user.click(within(sheet).getByRole("button", { name: /^Change how/ }));
    await user.click(await screen.findByRole("button", { name: "Not ended" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("It can't end before it starts.");
    expect(within(sheet).getByText("Finished Oct 22")).toBeInTheDocument();
  });
});

describe("changing an answer from the Assignments list (S12-06)", () => {
  async function openForm() {
    stub(ended({ endedAs: "stopped", endedOn: "2026-10-26" }));
    fakeApi.on("GET /api/assignments?includeArchived=false", () => [200, ended({ endedAs: "stopped", endedOn: "2026-10-26" })]);
    const user = userEvent.setup();
    renderAt("/setup/assignments");
    expect(await screen.findByText("Stopped Oct 26")).toBeInTheDocument(); // the card says it too
    await user.click(await screen.findByRole("button", { name: new RegExp(TITLE) }));
    return { user, form: await screen.findByRole("form", { name: `Edit ${TITLE}` }) };
  }

  it("the card and the edit form say 'Stopped Oct 26', and Change reopens it without saving the form", async () => {
    const { user, form } = await openForm();
    expect(within(form).getByText("Stopped Oct 26")).toBeInTheDocument();
    await user.click(within(form).getByRole("button", { name: /^Change how/ }));
    await user.click(await screen.findByRole("button", { name: "Not ended" }));
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]!.body).toEqual({ endedAs: null });
    // The ended line is gone from the list, and the form's own Save was never sent.
    await waitFor(() => expect(screen.queryByText("Stopped Oct 26")).not.toBeInTheDocument());
  });

  it("choosing a day and pressing Enter in the sheet saves that change only, not the assignment form", async () => {
    const { user, form } = await openForm();
    await user.click(within(form).getByRole("button", { name: /^Change how/ }));
    await user.click(await screen.findByRole("button", { name: "Yes, finished" }));
    const day = await screen.findByLabelText("Finished on");
    expect(day).toHaveValue("Oct 26, 2026");
    await user.type(day, "{Enter}");
    await waitFor(() => expect(patches()).toHaveLength(1));
    expect(patches()[0]!.body).toEqual({ endedAs: "finished", endedOn: "2026-10-26" });
  });
});

describe("the day each answer starts on (S12-06)", () => {
  const a = { ...SAMPLE_ASSIGNMENTS[0]!, startDate: "2026-10-01", endDate: "2026-10-23" } as Assignment;
  it("is the day it already ended on when changing; otherwise the end, today, or a week on", () => {
    expect(defaultDay("finished", a, "2026-10-28")).toBe("2026-10-23");
    expect(defaultDay("finished", { ...a, endDate: "2026-12-01" }, "2026-10-28")).toBe("2026-10-28");
    expect(defaultDay("stopped", a, "2026-10-28")).toBe("2026-10-28");
    expect(defaultDay("stopped", { ...a, startDate: "2026-11-02" }, "2026-10-28")).toBe("2026-11-02");
    expect(defaultDay("finished", { ...a, endedAs: "stopped", endedOn: "2026-10-15" }, "2026-10-28")).toBe("2026-10-15");
    expect(defaultDay("notyet", { ...a, endedAs: "stopped", endedOn: "2026-10-15" }, "2026-10-28")).toBe("2026-11-04");
  });
});

describe("reopening brings the question back (S12-06)", () => {
  it("a finished assignment whose end has passed waits again once it is not ended", async () => {
    const { isWaiting } = await import("../src/features/completion/waiting");
    const done = { ...SAMPLE_ASSIGNMENTS[0]!, endDate: "2026-10-16", endedAs: "finished", endedOn: "2026-10-16" } as Assignment;
    expect(isWaiting(done, "2026-10-28")).toBe(false);
    expect(isWaiting({ ...done, endedAs: null, endedOn: null }, "2026-10-28")).toBe(true);
    expect(isWaiting({ ...done, endDate: "2026-11-20", endedAs: null, endedOn: null }, "2026-10-28")).toBe(false);
  });
});
