/** S6-08: the undo bar after a plan change, Undo, and Reset to original on the timeline's edit bar. */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { addDays, ENGINE_VERSION, type LocalDate } from "@hh/engine";
import type { Assignment } from "../src/api/types";
import { onPlanChange } from "../src/api/client";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { FRANK, MAGGIE, MATH, patchMerging, rowId, withRoster } from "./helpers/schedule-fixtures";
import { SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_EVENTS, SAMPLE_SUBJECTS, samplePlans } from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

const calls = (method: string, prefix: string) => fakeApi.calls.filter((c) => c.method === method && c.path.startsWith(prefix));
const bar = () => screen.queryByRole("button", { name: "Undo" });

/** After the next change the API reports `label`; `undone()` is what POST /api/undo does. */
function offer(label: string | null) {
  fakeApi.on("GET /api/undo", 200, label ? { label, createdAt: "2026-10-28T15:00:00.000Z" } : null);
}

describe("onPlanChange (the requests that can be undone)", () => {
  const fire = async (method: string, path: string, status = 200) => {
    fakeApi.on(`${method} ${path}`, status, status === 204 ? undefined : {});
    const seen = vi.fn();
    const off = onPlanChange(seen);
    const { apiDelete, apiPatch, apiPost, apiPut } = await import("../src/api/client");
    const send = { PATCH: () => apiPatch(path, {}), POST: () => apiPost(path), PUT: () => apiPut(path, {}), DELETE: () => apiDelete(path) }[method]!;
    await send().catch(() => {});
    off();
    return seen.mock.calls.length;
  };

  it.each([
    ["PATCH", "/api/assignments/a1"], ["POST", "/api/assignments/a1/reset"], ["POST", "/api/blocked-ranges"], ["POST", "/api/blocked-ranges/bulk"],
    ["PATCH", "/api/blocked-ranges/b1"], ["DELETE", "/api/blocked-ranges/b1"], ["PUT", "/api/week-overrides"], ["DELETE", "/api/week-overrides/o1"],
  ])("%s %s is announced once", async (method, path) => {
    expect(await fire(method, path, method === "DELETE" ? 204 : 200)).toBe(1);
  });

  it.each([
    ["POST", "/api/assignments"], ["POST", "/api/assignments/bulk"], ["PATCH", "/api/children/c1"], ["POST", "/api/subjects"],
    ["PATCH", "/api/family"], ["POST", "/api/undo"], ["PUT", "/api/check-ins/2026-10-19"], ["POST", "/api/events"],
  ])("%s %s is not", async (method, path) => {
    expect(await fire(method, path)).toBe(0);
  });

  it("a failed request is not announced", async () => {
    expect(await fire("PATCH", "/api/assignments/a1", 400)).toBe(0);
  });
});

describe("the undo bar after a timeline edit", () => {
  const SELECTED = SAMPLE_ASSIGNMENTS.find((a) => a.id === "ti")!;
  function stubTimeline() {
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
    fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
    fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
    fakeApi.on("GET /api/assignments", 200, SAMPLE_ASSIGNMENTS);
    fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
    fakeApi.on("GET /api/events", 200, SAMPLE_EVENTS);
    for (const a of SAMPLE_ASSIGNMENTS) fakeApi.on(`PATCH /api/assignments/${a.id}`, (body) => [200, { ...a, ...(body as Partial<Assignment>) }]);
  }
  async function selectBar() {
    renderAt("/timeline");
    const svg = await screen.findByRole("img", { name: "Year timeline" });
    const band = svg.querySelector(`path.tl-band[data-assignment="${SELECTED.id}"]`)!;
    const [x, y] = band.getAttribute("d")!.slice(1).split(/[ ,LCQVHZ]+/).filter(Boolean).map(Number);
    fireEvent.click(svg, { clientX: x! + 1, clientY: y! + 1 });
    return screen.findByRole("region", { name: /^Edit / });
  }
  const planGets = () => calls("GET", "/api/plan").length;
  /** A move through the End date picker (S6b-05 removed the week-step buttons). */
  const move = (edit: HTMLElement) => fireEvent.change(within(edit).getByLabelText("End"), { target: { value: addDays(SELECTED.endDate as LocalDate, 7) } });

  it("no bar until something changes", async () => {
    stubTimeline();
    await selectBar();
    expect(bar()).toBeNull();
  });

  it("a move shows the label; Undo sends POST /api/undo, reloads the page and the bar goes", async () => {
    stubTimeline();
    const user = userEvent.setup();
    const edit = await selectBar();
    offer("Moved Treasure Island");
    fakeApi.on("POST /api/undo", 200, { label: "Moved Treasure Island" });
    move(edit);
    expect(await screen.findByText("Moved Treasure Island.")).toBeInTheDocument();
    expect(calls("PATCH", "/api/assignments/ti")).toHaveLength(1);
    const before = planGets();
    offer(null);
    await user.click(screen.getByRole("button", { name: "Undo" }));
    await waitFor(() => expect(bar()).toBeNull());
    expect(calls("POST", "/api/undo")).toHaveLength(1);
    await waitFor(() => expect(planGets()).toBeGreaterThan(before)); // the page remounted and reloaded
    expect(screen.queryByText("Moved Treasure Island.")).toBeNull();
  });

  it("the undo button can be reached and pressed from the keyboard", async () => {
    stubTimeline();
    const user = userEvent.setup();
    const edit = await selectBar();
    offer("Moved Treasure Island");
    fakeApi.on("POST /api/undo", 200, { label: "x" });
    move(edit);
    const undo = await screen.findByRole("button", { name: "Undo" });
    undo.focus();
    expect(undo).toHaveFocus();
    await user.keyboard("{Enter}");
    await waitFor(() => expect(calls("POST", "/api/undo")).toHaveLength(1));
  });

  it("a 409 says the change can't be undone any more, and offers nothing more", async () => {
    stubTimeline();
    const user = userEvent.setup();
    const edit = await selectBar();
    offer("Moved Treasure Island");
    fakeApi.on("POST /api/undo", 409, { error: "cannot_undo", message: "That change can't be undone any more." });
    move(edit);
    await user.click(await screen.findByRole("button", { name: "Undo" }));
    expect(await screen.findByText("That change can't be undone any more.")).toBeInTheDocument();
    expect(bar()).toBeNull();
  });

  it("any other failure says so and keeps the offer so it can be tried again", async () => {
    stubTimeline();
    const user = userEvent.setup();
    const edit = await selectBar();
    offer("Moved Treasure Island");
    fakeApi.on("POST /api/undo", 500, { error: "internal_error" });
    move(edit);
    await user.click(await screen.findByRole("button", { name: "Undo" }));
    expect(await screen.findByText("Couldn't undo. Try again.")).toBeInTheDocument();
    expect(bar()).toBeEnabled();
  });

  it("the bar goes when you go to another page", async () => {
    stubTimeline();
    const user = userEvent.setup();
    const edit = await selectBar();
    offer("Moved Treasure Island");
    move(edit);
    await screen.findByText("Moved Treasure Island.");
    await user.click(screen.getByRole("link", { name: "Kids" }));
    await waitFor(() => expect(screen.queryByText("Moved Treasure Island.")).toBeNull());
  });

  describe("Reset to original", () => {
    it("asks first; Cancel sends nothing", async () => {
      stubTimeline();
      const user = userEvent.setup();
      const edit = await selectBar();
      await user.click(within(edit).getByRole("button", { name: "More" }));
      await user.click(within(edit).getByRole("button", { name: "Reset to original" }));
      const dialog = await screen.findByRole("dialog");
      expect(within(dialog).getByRole("heading", { name: "Put Treasure Island back to how you created it?" })).toBeInTheDocument();
      await user.click(within(dialog).getByRole("button", { name: "Cancel" }));
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(calls("POST", "/api/assignments/ti/reset")).toHaveLength(0);
    });

    it("confirming sends the reset, redraws the bar and offers to undo the reset", async () => {
      stubTimeline();
      const user = userEvent.setup();
      const edit = await selectBar();
      fakeApi.on("POST /api/assignments/ti/reset", 200, { assignment: { ...SELECTED, endDate: "2026-11-20" }, kept: [] });
      offer("Reset Treasure Island");
      const before = planGets();
      await user.click(within(edit).getByRole("button", { name: "More" }));
      await user.click(within(edit).getByRole("button", { name: "Reset to original" }));
      await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Reset" }));
      expect(await screen.findByText("Reset Treasure Island.")).toBeInTheDocument();
      expect(screen.queryByRole("dialog")).toBeNull();
      expect(calls("POST", "/api/assignments/ti/reset")).toHaveLength(1);
      expect(planGets()).toBeGreaterThan(before);
      // Undoing the reset works like any other undo.
      fakeApi.on("POST /api/undo", 200, { label: "Reset Treasure Island" });
      offer(null);
      await user.click(screen.getByRole("button", { name: "Undo" }));
      await waitFor(() => expect(calls("POST", "/api/undo")).toHaveLength(1));
    });

    it("a refused reset shows the message in the dialog and keeps it open", async () => {
      stubTimeline();
      const user = userEvent.setup();
      const edit = await selectBar();
      fakeApi.on("POST /api/assignments/ti/reset", 409, { error: "no_original", message: "This assignment has no saved original to go back to." });
      await user.click(within(edit).getByRole("button", { name: "More" }));
      await user.click(within(edit).getByRole("button", { name: "Reset to original" }));
      const dialog = await screen.findByRole("dialog");
      await user.click(within(dialog).getByRole("button", { name: "Reset" }));
      expect(await within(dialog).findByRole("alert")).toHaveTextContent("This assignment has no saved original to go back to.");
      expect(bar()).toBeNull();
    });
  });
});

describe("the undo bar after other changes", () => {
  it("an assignment form save shows it", async () => {
    withRoster();
    const A: Assignment = {
      id: rowId(1), subjectId: MATH.id, title: "Saxon 5/4", unitType: "lessons", totalUnits: 20, weightPerUnit: null,
      startDate: "2026-11-02", endDate: "2026-11-26", childIds: [FRANK.id, MAGGIE.id], archived: false, weekdays: null,
    };
    fakeApi.on("GET /api/assignments", 200, [A]);
    fakeApi.on(`PATCH /api/assignments/${A.id}`, patchMerging(A));
    const user = userEvent.setup();
    renderAt("/schedule/assignments");
    await user.click(await screen.findByRole("button", { name: /Saxon 5\/4/ }));
    const form = screen.getByRole("form", { name: "Edit Saxon 5/4" });
    await user.clear(within(form).getByLabelText("Title"));
    await user.type(within(form).getByLabelText("Title"), "Saxon 6/5");
    offer("Changed Saxon 6/5");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Changed Saxon 6/5.")).toBeInTheDocument();
  });

  it("a new assignment does not (the API does not record a creation)", async () => {
    withRoster();
    fakeApi.on("GET /api/assignments", 200, []);
    fakeApi.on("POST /api/assignments", (body) => [201, { ...(body as object), id: rowId(9), archived: false }]);
    const user = userEvent.setup();
    renderAt("/schedule/assignments");
    await user.click(await screen.findByRole("button", { name: "Add assignment" }));
    const form = screen.getByRole("form", { name: "Add assignment" });
    await user.selectOptions(within(form).getByLabelText("Subject"), MATH.id);
    await user.type(within(form).getByLabelText("Title"), "New one");
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    fireEvent.change(within(form).getByLabelText("Start"), { target: { value: "2026-11-02" } });
    fireEvent.change(within(form).getByLabelText("End"), { target: { value: "2026-11-13" } });
    await user.type(within(form).getByLabelText("Total"), "10");
    await waitFor(() => expect(within(form).getByRole("button", { name: "Add" })).toBeEnabled()); // the weight suggestion is in
    await user.click(within(form).getByRole("button", { name: "Add" }));
    await screen.findByText("New one");
    expect(calls("GET", "/api/undo")).toHaveLength(0);
  });

  it("a day off created shows it", async () => {
    withRoster();
    fakeApi.on("GET /api/blocked-ranges", 200, []);
    fakeApi.on("POST /api/blocked-ranges", (body) => [201, { ...(body as object), id: rowId(19) }]);
    const user = userEvent.setup();
    renderAt("/schedule/days-off");
    await user.click(await screen.findByRole("button", { name: "Add days off" }));
    const form = screen.getByRole("form", { name: "Add days off" });
    fireEvent.change(within(form).getByLabelText("First day"), { target: { value: "2026-12-21" } });
    fireEvent.change(within(form).getByLabelText("Last day"), { target: { value: "2027-01-01" } });
    offer("Added a day off");
    await user.click(within(form).getByRole("button", { name: "Add" }));
    expect(await screen.findByText("Added a day off.")).toBeInTheDocument();
  });
});
