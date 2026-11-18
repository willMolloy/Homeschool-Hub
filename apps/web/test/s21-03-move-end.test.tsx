/** S21-03: push the end back, or to a day she picks. A day inside the break is refused. Another book can keep its end. */
import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { listBreakOverlaps } from "@hh/engine";
import { describe, expect, it } from "vitest";
import type { Assignment } from "../src/api/types";
import { formatDate } from "../src/lib/dates";
import { fakeApi } from "./helpers/fake-api";
import { FRANK, MATH, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

const book = (over: Partial<Assignment> = {}): Assignment => ({
  id: rowId(1),
  subjectId: MATH.id,
  title: "The Hobbit",
  unitType: "pages",
  totalUnits: 100,
  weightPerUnit: null,
  minutesPerDay: null,
  startDate: "2026-01-05",
  endDate: "2026-05-21",
  childIds: [FRANK.id],
  archived: false,
  weekdays: null,
  endedAs: null,
  endedOn: null,
  ...over,
});

const HOBBIT = book();
const OTHER = book({ id: rowId(2), title: "Pilgrim's Progress" });

function pushedEnd(a: Assignment = HOBBIT): string {
  const [row] = listBreakOverlaps({
    breaks: [{ start: "2026-02-01", end: "2026-02-28", childIds: [] }],
    assignments: [{ id: a.id, title: a.title, start: a.startDate, end: a.endDate, childIds: a.childIds, weekdays: null, subjectId: a.subjectId }],
    existing: [],
    schoolDays: [1, 2, 3, 4, 5],
  });
  return row!.pushedEnd;
}

async function openFebruary(rows: Assignment[]) {
  withRoster();
  fakeApi.on("GET /api/blocked-ranges", 200, []);
  fakeApi.on("GET /api/assignments", 200, rows);
  fakeApi.on("POST /api/blocked-ranges", (body) => [201, { ...(body as object), id: rowId(19), endDate: (body as { endDate?: string }).endDate }]);
  const user = userEvent.setup();
  renderAt("/setup/days-off");
  await screen.findByText("No days off yet.");
  await user.click(screen.getByRole("button", { name: "Add days off" }));
  const form = screen.getByRole("form", { name: "Add days off" });
  fireEvent.change(within(form).getByLabelText("First day"), { target: { value: "2026-02-01" } });
  fireEvent.change(within(form).getByLabelText("Last day"), { target: { value: "2026-02-28" } });
  await user.type(within(form).getByLabelText("Label"), "February");
  await user.click(within(form).getByRole("button", { name: "Add" }));
  const sheet = await screen.findByRole("dialog", { name: "February break covers planned work" });
  return { user, sheet };
}

describe("move the end date (S21-03)", () => {
  it("a day inside the break is refused, and a day she picks is saved", async () => {
    const { user, sheet } = await openFebruary([HOBBIT]);
    await user.click(within(sheet).getByRole("radio", { name: /Push the end to a day I pick/ }));
    const field = within(sheet).getByLabelText("End date");
    expect(field).toHaveValue(formatDate(pushedEnd()));
    fireEvent.change(field, { target: { value: "2026-02-10" } });
    expect(within(sheet).getByRole("alert")).toHaveTextContent("Pick a day after Feb 28, 2026.");
    expect(within(sheet).getByRole("button", { name: "Confirm" })).toBeDisabled();
    fireEvent.change(field, { target: { value: "2026-06-15" } });
    expect(within(sheet).queryByRole("alert")).toBeNull();
    await user.click(within(sheet).getByRole("button", { name: "Confirm" }));
    expect(writes()[0]!.body).toMatchObject({
      label: "February",
      adjustments: [{ assignmentId: HOBBIT.id, endDate: "2026-06-15" }],
    });
  });

  it("one book can keep its end while another is pushed back", async () => {
    const { user, sheet } = await openFebruary([HOBBIT, OTHER]);
    const [hobbit, other] = within(sheet).getAllByRole("group");
    await user.click(within(hobbit!).getByRole("radio", { name: /Keep the end date/ }));
    await user.click(within(other!).getByRole("radio", { name: /Push the end back/ }));
    await user.click(within(sheet).getByRole("button", { name: "Confirm" }));
    const body = writes()[0]!.body as { adjustments: { assignmentId: string; endDate: string }[] };
    expect(body.adjustments).toEqual([{ assignmentId: OTHER.id, endDate: pushedEnd(OTHER) }]);
    expect(writes()).toHaveLength(1);
  });
});