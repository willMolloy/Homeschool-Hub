/** S5-02: "What changes" in the event form. */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { EventPreview, EventPreviewRow } from "../src/api/types";
import { fakeApi } from "./helpers/fake-api";
import { FRANK, MATH, READING, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

const row = (n: number, over: Partial<EventPreviewRow> = {}): EventPreviewRow => ({
  assignmentId: rowId(n), childId: FRANK.id, title: `Book ${n}`, childName: "Frank", unitType: "pages",
  before: { perDay: 5, end: "2026-11-20" }, after: { perDay: 6, end: "2026-11-20" }, ...over,
});
const previews = () => fakeApi.calls.filter((c) => c.path === "/api/plan/preview-event");

async function openForm(answer: EventPreview | [number, unknown]) {
  withRoster();
  fakeApi.on("GET /api/events", 200, []);
  fakeApi.on("POST /api/plan/preview-event", Array.isArray(answer) ? answer : [200, answer]);
  fakeApi.on("POST /api/events", (body) => [201, { ...(body as object), id: rowId(50), archived: false }]);
  const user = userEvent.setup();
  renderAt("/schedule/events");
  await user.click(await screen.findByRole("button", { name: "Add event" }));
  const form = screen.getByRole("form", { name: "Add event" });
  return { user, form };
}

async function makeValid(user: ReturnType<typeof userEvent.setup>, form: HTMLElement) {
  await user.type(within(form).getByLabelText("Name"), "Co-op");
  await user.click(within(form).getByRole("checkbox", { name: "Wednesday" }));
}

describe("Event preview in the form (S5-02)", () => {
  it("a valid draft shows what changes, in the ticket's format, with the end date when it moves", async () => {
    const { user, form } = await openForm({
      changes: [row(1, { title: "Treasure Island" }), row(2, { title: "Fractions", unitType: "lessons", before: { perDay: 1, end: "2026-11-20" }, after: { perDay: 1.5, end: "2026-11-24" } })],
      more: 0,
    });
    expect(within(form).queryByText("What changes")).toBeNull();
    await makeValid(user, form);
    expect(await within(form).findByText("What changes")).toBeInTheDocument();
    expect(within(form).getByText("Treasure Island (Frank): 5 → 6 pages a day")).toBeInTheDocument();
    expect(within(form).getByText("Fractions (Frank): 1 → 1.5 lessons a day · Ends Nov 24, 2026")).toBeInTheDocument();
    expect(previews()[0]!.body).toMatchObject({ event: { name: "Co-op", weekdays: [3], childIds: [] } });
  });

  it("nothing changes → 'No change to the plan.'", async () => {
    const { user, form } = await openForm({ changes: [], more: 0 });
    await makeValid(user, form);
    expect(await within(form).findByText("No change to the plan.")).toBeInTheDocument();
  });

  it("shows 5 rows, then 'and N more' counting the server's rest too", async () => {
    const { user, form } = await openForm({ changes: [1, 2, 3, 4, 5, 6, 7].map((n) => row(n)), more: 3 });
    await makeValid(user, form);
    expect(await within(form).findByText("Book 1 (Frank): 5 → 6 pages a day")).toBeInTheDocument();
    expect(within(form).getByText("Book 5 (Frank): 5 → 6 pages a day")).toBeInTheDocument();
    expect(within(form).queryByText(/Book 6/)).toBeNull();
    expect(within(form).getByText("and 5 more")).toBeInTheDocument();
  });

  it("changing a rule updates the list", async () => {
    const { user, form } = await openForm({ changes: [], more: 0 });
    fakeApi.on("POST /api/plan/preview-event", (body) => {
      const rules = (body as { event: { subjectRules: object } }).event.subjectRules;
      return [200, { changes: Object.keys(rules).length ? [row(1, { title: "Math book" })] : [], more: 0 }];
    });
    await makeValid(user, form);
    expect(await within(form).findByText("No change to the plan.")).toBeInTheDocument();
    await user.selectOptions(within(form).getByLabelText("Math"), "skip");
    expect(await within(form).findByText("Math book (Frank): 5 → 6 pages a day")).toBeInTheDocument();
    expect(previews().at(-1)!.body).toMatchObject({ event: { subjectRules: { [MATH.id]: "skip" } } });
  });

  it("one request after rapid changes (debounced)", async () => {
    const { user, form } = await openForm({ changes: [], more: 0 });
    await makeValid(user, form);
    await user.type(within(form).getByLabelText("Name"), "-day");
    await user.selectOptions(within(form).getByLabelText("Reading"), "lighter");
    await within(form).findByText("No change to the plan.");
    await new Promise((r) => setTimeout(r, 600));
    expect(previews()).toHaveLength(1);
    expect(previews()[0]!.body).toMatchObject({ event: { name: "Co-op-day", subjectRules: { [READING.id]: "lighter" } } });
  });

  it("no request while the form isn't valid", async () => {
    const { user, form } = await openForm({ changes: [], more: 0 });
    await user.type(within(form).getByLabelText("Name"), "Co-op");
    await new Promise((r) => setTimeout(r, 600));
    expect(previews()).toHaveLength(0);
    expect(within(form).queryByText("What changes")).toBeNull();
  });

  it("a preview error shows nothing and Save still works", async () => {
    const { user, form } = await openForm([500, { error: "internal_error", message: "Something went wrong." }]);
    await makeValid(user, form);
    await waitFor(() => expect(previews()).toHaveLength(1));
    expect(within(form).queryByText("What changes")).toBeNull();
    await user.click(within(form).getByRole("button", { name: "Add" }));
    expect(writes()).toHaveLength(1);
    expect(writes()[0]).toMatchObject({ method: "POST", path: "/api/events" });
    expect(await screen.findByText("Co-op")).toBeInTheDocument();
  });

  it("Save isn't held up by a preview that hasn't answered", async () => {
    const { user, form } = await openForm({ changes: [], more: 0 });
    fakeApi.on("POST /api/plan/preview-event", () => new Promise(() => {}));
    await makeValid(user, form);
    await user.click(within(form).getByRole("button", { name: "Add" }));
    expect(writes()).toHaveLength(1);
  });

  it("editing sends the event's id so the preview is against the stored version", async () => {
    withRoster();
    const stored = {
      id: rowId(21), name: "Piano", weekdays: [2], startDate: null, endDate: null, capacityFraction: 0.5,
      defaultRule: "normal", subjectRules: {}, childIds: [], archived: false,
    };
    fakeApi.on("GET /api/events", 200, [stored]);
    fakeApi.on("POST /api/plan/preview-event", 200, { changes: [], more: 0 });
    const user = userEvent.setup();
    renderAt("/schedule/events");
    await user.click(await screen.findByRole("button", { name: /Piano/ }));
    const form = screen.getByRole("form", { name: "Edit Piano" });
    expect(await within(form).findByText("No change to the plan.")).toBeInTheDocument();
    expect(previews()[0]!.body).toMatchObject({ eventId: stored.id, event: { name: "Piano", weekdays: [2] } });
  });
});
