/** S21-01: a break that covers open books asks first. Cancel saves nothing. No overlap still saves. */
import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Assignment, BlockedRange } from "../src/api/types";
import { fakeApi } from "./helpers/fake-api";
import { FRANK, MAGGIE, MATH, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { newFamily } from "./helpers/setup-flow";
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
const PARTIAL = book({ id: rowId(2), title: "First week", endDate: "2026-02-06" });
const FINISHED = book({ id: rowId(3), title: "Finished book", endedAs: "finished", endedOn: "2026-01-30" });
const MAGGIE_BOOK = book({ id: rowId(4), title: "Maggie's reader", childIds: [MAGGIE.id] });

function books(rows: Assignment[]) {
  withRoster();
  fakeApi.on("GET /api/blocked-ranges", 200, [] as BlockedRange[]);
  fakeApi.on("GET /api/assignments", 200, rows);
  fakeApi.on("POST /api/blocked-ranges", (body) => [201, { ...(body as object), id: rowId(19) }]);
}

async function addFebruary(user: ReturnType<typeof userEvent.setup>, who?: "Frank") {
  await user.click(screen.getByRole("button", { name: "Add days off" }));
  const form = screen.getByRole("form", { name: "Add days off" });
  fireEvent.change(within(form).getByLabelText("First day"), { target: { value: "2026-02-01" } });
  fireEvent.change(within(form).getByLabelText("Last day"), { target: { value: "2026-02-28" } });
  await user.type(within(form).getByLabelText("Label"), "February");
  if (who) {
    await user.click(within(form).getByRole("radio", { name: "Only some children" }));
    await user.click(within(form).getByRole("checkbox", { name: who }));
  }
  await user.click(within(form).getByRole("button", { name: "Add" }));
  const sheet = await screen.findByRole("dialog", { name: "February break covers planned work" });
  return { form, sheet };
}

describe("ask before a break covers open work (S21-01)", () => {
  it("lists both open books, including a partial overlap, and leaves a finished book off", async () => {
    books([HOBBIT, PARTIAL, FINISHED]);
    const user = userEvent.setup();
    renderAt("/setup/days-off");
    await screen.findByText("No days off yet.");
    const { sheet } = await addFebruary(user);
    expect(within(sheet).getByText("The Hobbit")).toBeInTheDocument();
    expect(within(sheet).getByText("First week")).toBeInTheDocument();
    expect(within(sheet).queryByText("Finished book")).toBeNull();
    expect(within(sheet).getByText("Covers 20 school days in February.")).toBeInTheDocument();
    expect(within(sheet).getByText("Covers 5 school days in February.")).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Confirm" })).toBeDisabled();
    await user.click(within(sheet).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(writes()).toEqual([]);
    expect(screen.getByRole("form", { name: "Add days off" })).toBeInTheDocument();
  });

  it("a break for one child skips the other child's book", async () => {
    books([HOBBIT, MAGGIE_BOOK]);
    const user = userEvent.setup();
    renderAt("/setup/days-off");
    await screen.findByText("No days off yet.");
    const { sheet } = await addFebruary(user, "Frank");
    expect(within(sheet).getByText("The Hobbit")).toBeInTheDocument();
    expect(within(sheet).queryByText("Maggie's reader")).toBeNull();
  });

  it("Use this for the rest fills the rows not answered, and still does not save", async () => {
    books([HOBBIT, PARTIAL]);
    const user = userEvent.setup();
    renderAt("/setup/days-off");
    await screen.findByText("No days off yet.");
    const { sheet } = await addFebruary(user);
    const keeps = within(sheet).getAllByRole("radio", { name: /Keep the end date/ });
    expect(within(sheet).queryByRole("button", { name: "Use this for the rest" })).toBeNull();
    await user.click(keeps[0]!);
    await user.click(within(sheet).getByRole("button", { name: "Use this for the rest" }));
    expect(within(sheet).getAllByRole("radio", { name: /Keep the end date/ }).every((r) => (r as HTMLInputElement).checked)).toBe(true);
    expect(within(sheet).getByRole("button", { name: "Confirm" })).toBeEnabled();
    expect(writes()).toEqual([]);
  });

  it("a break that overlaps nothing saves with no sheet", async () => {
    books([HOBBIT]);
    const user = userEvent.setup();
    renderAt("/setup/days-off");
    await screen.findByText("No days off yet.");
    await user.click(screen.getByRole("button", { name: "Add days off" }));
    const form = screen.getByRole("form", { name: "Add days off" });
    fireEvent.change(within(form).getByLabelText("First day"), { target: { value: "2026-07-06" } });
    fireEvent.change(within(form).getByLabelText("Last day"), { target: { value: "2026-07-10" } });
    await user.click(within(form).getByRole("button", { name: "Add" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(writes()).toEqual([{
      method: "POST", path: "/api/blocked-ranges",
      body: { label: null, kind: "vacation", startDate: "2026-07-06", endDate: "2026-07-10", childIds: [] },
    }]);
  });

  it("first-run Add a break asks when that break covers a book, and Cancel does not save", async () => {
    const f = newFamily({ setupStep: 5 });
    f.schoolYear = { start: "2026-08-17", end: "2027-05-21" };
    fakeApi.on("GET /api/assignments", 200, [book({ startDate: "2026-10-01", endDate: "2026-10-30", title: "October book" })]);
    const user = userEvent.setup();
    renderAt("/welcome");
    await screen.findByRole("heading", { level: 1, name: "Any breaks this year?" });
    await user.click(screen.getByRole("button", { name: "Add a break" }));
    await user.type(screen.getByLabelText("Name of the break"), "October break");
    const own = within(screen.getByRole("group", { name: "Add a break" }));
    fireEvent.change(own.getByLabelText("First day"), { target: { value: "2026-10-12" } });
    fireEvent.change(own.getByLabelText("Last day"), { target: { value: "2026-10-16" } });
    await user.click(own.getByRole("button", { name: "Add" }));
    await user.click(screen.getByRole("button", { name: "Add breaks" }));
    const sheet = await screen.findByRole("dialog", { name: "October break covers planned work" });
    expect(within(sheet).getByText("October book")).toBeInTheDocument();
    expect(within(sheet).getByRole("button", { name: "Confirm" })).toBeDisabled();
    await user.click(within(sheet).getByRole("button", { name: "Cancel" }));
    expect(writes()).toEqual([]);
    expect(screen.getByRole("heading", { level: 1, name: "Any breaks this year?" })).toBeInTheDocument();
  });
});
