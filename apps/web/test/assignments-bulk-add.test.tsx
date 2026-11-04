import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Assignment } from "../src/api/types";
import { fakeApi } from "./helpers/fake-api";
import { FRANK, MATH, READING, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

const SAXON: Assignment = {
  id: rowId(1), subjectId: MATH.id, title: "Saxon 5/4", unitType: "lessons", totalUnits: 20, weightPerUnit: null,
  startDate: "2026-11-02", endDate: "2026-11-26", childIds: [FRANK.id], archived: false, weekdays: null,
};

async function setup() {
  withRoster();
  fakeApi.on("GET /api/assignments", 200, [SAXON]);
  const user = userEvent.setup();
  renderAt("/schedule/assignments");
  await screen.findByRole("list", { name: "Assignments" });
  await user.click(screen.getByRole("button", { name: "Add several" }));
  return { user, form: screen.getByRole("form", { name: "Add several assignments" }) };
}
const row = (form: HTMLElement, n: number) => within(form).getByRole("group", { name: `Row ${n}` });
const date = (form: HTMLElement, label: string, value: string) => fireEvent.change(within(form).getByLabelText(label), { target: { value } });

async function fillShared(user: ReturnType<typeof userEvent.setup>, form: HTMLElement) {
  await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
  await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
  date(form, "Start", "2026-11-02");
  date(form, "End", "2026-12-18");
  await user.selectOptions(within(form).getByLabelText("Unit"), "pages");
}
async function fillRow(user: ReturnType<typeof userEvent.setup>, form: HTMLElement, n: number, title: string, total: string) {
  if (title) await user.type(within(row(form, n)).getByLabelText("Title"), title);
  if (total) await user.type(within(row(form, n)).getByLabelText("Total"), total);
}

describe("Add several assignments (S3a-04)", () => {
  it("starts with 3 empty rows and only the essentials", async () => {
    const { form } = await setup();
    expect(within(form).getAllByRole("group", { name: /^Row \d/ })).toHaveLength(3);
    expect(within(form).queryByLabelText(/Weight/)).toBeNull();
    expect(screen.queryByRole("button", { name: "Add several" })).toBeNull();
  });

  it("sends one bulk POST with the non-empty rows, ignores the empty one and adds the new cards", async () => {
    const { user, form } = await setup();
    fakeApi.on("POST /api/assignments/bulk", (body) => [201, (body as { assignments: object[] }).assignments.map((a, i) => ({ ...a, id: rowId(10 + i), archived: false }))]);
    await fillShared(user, form);
    await fillRow(user, form, 1, "  Charlotte's Web ", "184");
    await fillRow(user, form, 3, "Little House", "300");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    const shared = { subjectId: READING.id, unitType: "pages", weightPerUnit: null, startDate: "2026-11-02", endDate: "2026-12-18", childIds: [FRANK.id], weekdays: null };
    expect(writes()).toEqual([{
      method: "POST", path: "/api/assignments/bulk",
      body: { assignments: [{ ...shared, title: "Charlotte's Web", totalUnits: 184 }, { ...shared, title: "Little House", totalUnits: 300 }] },
    }]);
    expect(await screen.findByText("Little House")).toBeInTheDocument();
    expect(screen.getByText("Charlotte's Web")).toBeInTheDocument();
    expect(screen.queryByRole("form")).toBeNull();
  });

  it("S7b-06: three books in sequence, each with its own dates, go in with one Save; an untouched row uses the shared dates", async () => {
    const { user, form } = await setup();
    fakeApi.on("POST /api/assignments/bulk", (body) => [201, (body as { assignments: object[] }).assignments.map((a, i) => ({ ...a, id: rowId(10 + i), archived: false }))]);
    await fillShared(user, form);
    await fillRow(user, form, 1, "Book One", "100");
    await fillRow(user, form, 2, "Book Two", "120");
    await fillRow(user, form, 3, "Book Three", "140");
    // Row 1 is left alone (the shared dates); rows 2 and 3 get their own.
    await user.click(within(form).getByRole("button", { name: "Dates for row 2" }));
    // Prefilled from the shared dates.
    expect(within(row(form, 2)).getByLabelText("Start")).toHaveValue("Nov 2, 2026");
    expect(within(row(form, 2)).getByLabelText("End")).toHaveValue("Dec 18, 2026");
    expect(within(row(form, 1)).queryByLabelText("Start")).toBeNull();
    date(row(form, 2), "Start", "2026-11-02"); date(row(form, 2), "End", "2026-12-18");
    await user.click(within(form).getByRole("button", { name: "Dates for row 3" }));
    date(row(form, 3), "Start", "2027-01-04"); date(row(form, 3), "End", "2027-02-26");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    const sent = (writes()[0]!.body as { assignments: { title: string; startDate: string; endDate: string }[] }).assignments;
    expect(sent.map((a) => [a.title, a.startDate, a.endDate])).toEqual([
      ["Book One", "2026-11-02", "2026-12-18"], ["Book Two", "2026-11-02", "2026-12-18"], ["Book Three", "2027-01-04", "2027-02-26"],
    ]);
  });

  it("S7b-06: a row's own dates follow the shared ones until changed; closing Dates goes back to the shared dates", async () => {
    const { user, form } = await setup();
    await fillShared(user, form);
    await fillRow(user, form, 1, "One", "5");
    await user.click(within(form).getByRole("button", { name: "Dates for row 1" }));
    fireEvent.change(within(form).getAllByLabelText("Start")[0]!, { target: { value: "2026-11-09" } }); // the shared Start comes first
    expect(within(row(form, 1)).getByLabelText("Start")).toHaveValue("Nov 9, 2026");
    date(row(form, 1), "End", "2026-11-20");
    await user.click(within(form).getByRole("button", { name: "Dates for row 1" }));
    expect(within(form).queryByRole("group", { name: "Row 1" })!.querySelector('input[type="date"]')).toBeNull();
    fakeApi.on("POST /api/assignments/bulk", (body) => [201, (body as { assignments: object[] }).assignments.map((a, i) => ({ ...a, id: rowId(10 + i), archived: false }))]);
    await user.click(within(form).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect((writes()[0]!.body as { assignments: { startDate: string; endDate: string }[] }).assignments[0]).toMatchObject({ startDate: "2026-11-09", endDate: "2026-12-18" });
  });

  it("S7b-06: bad dates on one row show on that row only and nothing is sent; with every row dated the shared dates aren't needed", async () => {
    const { user, form } = await setup();
    await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    await fillRow(user, form, 1, "One", "5");
    await fillRow(user, form, 2, "Two", "6");
    for (const n of [1, 2]) await user.click(within(form).getByRole("button", { name: `Dates for row ${n}` }));
    date(row(form, 1), "Start", "2026-12-18"); date(row(form, 1), "End", "2026-11-02"); // backwards
    date(row(form, 2), "Start", "2027-01-04"); date(row(form, 2), "End", "2027-02-26");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(await within(row(form, 1)).findByRole("alert")).toHaveTextContent(/start|before|after/i);
    expect(within(row(form, 2)).queryByRole("alert")).toBeNull();
    expect(writes()).toEqual([]);
    // Fixing it sends both, without any shared dates ever being filled in.
    fakeApi.on("POST /api/assignments/bulk", (body) => [201, (body as { assignments: object[] }).assignments.map((a, i) => ({ ...a, id: rowId(10 + i), archived: false }))]);
    date(row(form, 1), "Start", "2026-11-02"); date(row(form, 1), "End", "2026-12-18");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
  });

  it("Add row and Remove change the rows", async () => {
    const { user, form } = await setup();
    await user.click(within(form).getByRole("button", { name: "Add row" }));
    expect(within(form).getAllByRole("group", { name: /^Row \d/ })).toHaveLength(4);
    await user.click(within(form).getByRole("button", { name: "Remove row 2" }));
    expect(within(form).getAllByRole("group", { name: /^Row \d/ })).toHaveLength(3);
  });

  it("a row missing its total shows an error on that row and sends nothing", async () => {
    const { user, form } = await setup();
    await fillShared(user, form);
    await fillRow(user, form, 1, "One", "5");
    await fillRow(user, form, 2, "Two", "");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(await within(row(form, 2)).findByText("Total is required.")).toBeInTheDocument();
    expect(within(row(form, 1)).queryByRole("alert")).toBeNull();
    expect(writes()).toEqual([]);
  });

  it("needs at least one non-empty row, a subject, children and dates", async () => {
    const { user, form } = await setup();
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(await within(form).findByText("Add at least one title and total.")).toBeInTheDocument();
    expect(within(form).getByText("Pick a subject.")).toBeInTheDocument();
    expect(within(form).getByText("Pick at least one child.")).toBeInTheDocument();
    expect(within(form).getByText("Pick a start and an end date.")).toBeInTheDocument();
    expect(writes()).toEqual([]);
  });

  it("a 400 with a field name shows the row without it (S3b-01)", async () => {
    const { user, form } = await setup();
    fakeApi.on("POST /api/assignments/bulk", 400, { error: "invalid_reference", message: "Assignment 1: subjectId: every id must be one of your active subjects." });
    await fillShared(user, form);
    await fillRow(user, form, 1, "One", "4");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(await within(form).findByText("Row 1: every id must be one of your active subjects.")).toBeInTheDocument();
    expect(within(form).queryByText(/subjectId/)).toBeNull();
  });

  it("a 400 keeps the rows, shows the message and names the row on screen", async () => {
    const { user, form } = await setup();
    fakeApi.on("POST /api/assignments/bulk", 400, { error: "invalid_range", message: "Assignment 2: The end date must be on or after the start date." });
    await fillShared(user, form);
    await fillRow(user, form, 2, "Two", "5");
    await fillRow(user, form, 3, "Three", "6");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(await within(form).findByText("Row 3: The end date must be on or after the start date.")).toBeInTheDocument();
    expect(within(row(form, 2)).getByLabelText("Title")).toHaveValue("Two");
    expect(within(row(form, 3)).getByLabelText("Total")).toHaveValue(6);
    expect(within(form).getByLabelText("Start")).toHaveValue("Nov 2, 2026");
  });

  it("Cancel sends nothing and discards everything", async () => {
    const { user, form } = await setup();
    await fillRow(user, form, 1, "One", "5");
    await user.click(within(form).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("form")).toBeNull();
    expect(writes()).toEqual([]);
    await user.click(screen.getByRole("button", { name: "Add several" }));
    expect(within(row(screen.getByRole("form"), 1)).getByLabelText("Title")).toHaveValue("");
  });
});
