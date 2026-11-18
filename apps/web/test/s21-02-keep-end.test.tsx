/** S21-02: confirming keep saves the break and does not send a new end date. A push cannot be confirmed yet. */
import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Assignment } from "../src/api/types";
import { fakeApi } from "./helpers/fake-api";
import { FRANK, MAGGIE, MATH, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
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

async function openFebruary(rows: Assignment[]) {
  withRoster();
  fakeApi.on("GET /api/blocked-ranges", 200, []);
  fakeApi.on("GET /api/assignments", 200, rows);
  fakeApi.on("POST /api/blocked-ranges", (body) => [201, { ...(body as object), id: rowId(19) }]);
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

describe("keep the end date (S21-02)", () => {
  it("confirming keep on every book saves one break and does not send a new end date", async () => {
    const shared = book({ id: rowId(2), title: "Shared reader", childIds: [FRANK.id, MAGGIE.id] });
    const { user, sheet } = await openFebruary([book(), shared]);
    expect(within(sheet).getByText("The end date moves for everyone on this book.")).toBeInTheDocument();
    for (const keep of within(sheet).getAllByRole("radio", { name: /Keep the end date/ })) await user.click(keep);
    expect(within(sheet).getByRole("button", { name: "Confirm" })).toBeEnabled();
    await user.click(within(sheet).getByRole("button", { name: "Confirm" }));
    expect(writes()).toEqual([{
      method: "POST",
      path: "/api/blocked-ranges",
      body: {
        label: "February", kind: "vacation", startDate: "2026-02-01", endDate: "2026-02-28", childIds: [],
        adjustments: [],
      },
    }]);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("Confirm stays off until every book has an answer", async () => {
    const { user, sheet } = await openFebruary([book(), book({ id: rowId(2), title: "Pilgrim's Progress" })]);
    const [first] = within(sheet).getAllByRole("group");
    await user.click(within(first!).getByRole("radio", { name: /Keep the end date/ }));
    expect(within(sheet).getByRole("button", { name: "Confirm" })).toBeDisabled();
    expect(writes()).toEqual([]);
  });
});