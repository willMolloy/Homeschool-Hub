import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Assignment } from "../src/api/types";
import { fakeApi } from "./helpers/fake-api";
import { FRANK, MAGGIE, MATH, READING, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

const make = (n: number, over: Partial<Assignment> = {}): Assignment => ({
  id: rowId(n), subjectId: MATH.id, title: `Book ${n}`, unitType: "lessons", totalUnits: 20, weightPerUnit: null,
  startDate: "2026-08-17", endDate: "2026-09-18", childIds: [FRANK.id], archived: false, weekdays: null, ...over,
});

async function setup(list: Assignment[]) {
  withRoster();
  fakeApi.on("GET /api/assignments", 200, list);
  const user = userEvent.setup();
  renderAt("/schedule/assignments");
  await screen.findByRole("list", { name: "Assignments" });
  await user.click(screen.getByRole("button", { name: "Copy to a new year" }));
  return { user, form: screen.getByRole("form", { name: "Copy to a new year" }) };
}
const date = (form: HTMLElement, label: string, value: string) => fireEvent.change(within(form).getByLabelText(label), { target: { value } });
let made = 0;
const echo = (body: unknown): [number, unknown] => [201, (body as { assignments: object[] }).assignments.map((a) => ({ ...a, id: rowId(1000 + made++), archived: false }))];

describe("Copy to a new year (S7-01)", () => {
  it("sits beside Add several and Import CSV and asks for the two first days before listing anything", async () => {
    const { form } = await setup([make(1)]);
    expect(within(form).getByLabelText("This year's first day")).toHaveValue("");
    expect(within(form).queryByRole("checkbox")).toBeNull();
    expect(within(form).getByText(/Pick both days/)).toBeInTheDocument();
  });

  it("lists active assignments starting on or after the first day, all ticked, grouped by child, with their new dates", async () => {
    const list = [
      make(1),
      make(2, { subjectId: READING.id, title: "Charlotte's Web", childIds: [MAGGIE.id], startDate: "2026-10-05", endDate: "2026-11-06" }),
      make(3, { title: "Last spring", startDate: "2026-03-01", endDate: "2026-05-01" }),
      make(4, { title: "Archived one", archived: true }),
    ];
    const { form } = await setup(list);
    date(form, "This year's first day", "2026-08-17");
    date(form, "Next year's first day", "2027-08-16");
    const group = within(form).getByRole("group", { name: "To copy" });
    expect(within(group).getAllByRole("checkbox")).toHaveLength(2);
    for (const box of within(group).getAllByRole("checkbox")) expect(box).toBeChecked();
    expect(within(group).getByRole("group", { name: "Frank" })).toHaveTextContent("Book 1");
    expect(within(group).getByRole("group", { name: "Maggie" })).toHaveTextContent("Charlotte's Web");
    expect(group).toHaveTextContent("Math · Aug 16, 2027 – Sep 17, 2027");
    expect(group).not.toHaveTextContent("Last spring");
    expect(group).not.toHaveTextContent("Archived one");
    expect(within(form).getByText("2 assignments to copy")).toBeInTheDocument();
  });

  it("Untick all clears the choice and Copy needs something ticked", async () => {
    const { user, form } = await setup([make(1), make(2)]);
    date(form, "This year's first day", "2026-08-17");
    date(form, "Next year's first day", "2027-08-16");
    await user.click(within(form).getByRole("button", { name: "Untick all" }));
    for (const box of within(form).getAllByRole("checkbox")) expect(box).not.toBeChecked();
    expect(within(form).getByRole("button", { name: "Copy" })).toBeDisabled();
    await user.click(within(form).getByRole("button", { name: "Tick all" }));
    for (const box of within(form).getAllByRole("checkbox")) expect(box).toBeChecked();
  });

  it("copies the plan fields shifted by the difference, null weight and days staying null", async () => {
    const list = [
      make(1, { weightPerUnit: null, weekdays: null }),
      make(2, { title: "Reading list", subjectId: READING.id, unitType: "pages", totalUnits: 184, weightPerUnit: 1.4, weekdays: [1, 3, 5], childIds: [FRANK.id, MAGGIE.id], startDate: "2026-09-01", endDate: "2026-12-18" }),
    ];
    const { user, form } = await setup(list);
    fakeApi.on("POST /api/assignments/bulk", echo);
    date(form, "This year's first day", "2026-08-17");
    date(form, "Next year's first day", "2027-08-16");
    await user.click(within(form).getByRole("button", { name: /^Copy/ }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]).toEqual({
      method: "POST", path: "/api/assignments/bulk",
      body: { assignments: [
        { subjectId: MATH.id, title: "Book 1", unitType: "lessons", totalUnits: 20, weightPerUnit: null, startDate: "2027-08-16", endDate: "2027-09-17", childIds: [FRANK.id], weekdays: null },
        { subjectId: READING.id, title: "Reading list", unitType: "pages", totalUnits: 184, weightPerUnit: 1.4, startDate: "2027-08-31", endDate: "2027-12-17", childIds: [FRANK.id, MAGGIE.id], weekdays: [1, 3, 5] },
      ] },
    });
    expect(screen.queryByRole("form")).toBeNull();
    expect(await screen.findAllByText("Book 1")).toHaveLength(2);
  });

  it("an unticked assignment is not copied", async () => {
    const { user, form } = await setup([make(1), make(2)]);
    fakeApi.on("POST /api/assignments/bulk", echo);
    date(form, "This year's first day", "2026-08-17");
    date(form, "Next year's first day", "2027-08-16");
    await user.click(within(form).getByRole("checkbox", { name: /Book 1/ }));
    await user.click(within(form).getByRole("button", { name: /^Copy/ }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect((writes()[0]!.body as { assignments: { title: string }[] }).assignments.map((a) => a.title)).toEqual(["Book 2"]);
  });

  it("60 assignments send two bulk requests of 50 and 10", async () => {
    const list = Array.from({ length: 60 }, (_, i) => make(i + 1, { title: `T${String(i + 1).padStart(2, "0")}` }));
    const { user, form } = await setup(list);
    fakeApi.on("POST /api/assignments/bulk", echo);
    date(form, "This year's first day", "2026-08-17");
    date(form, "Next year's first day", "2027-08-16");
    await user.click(within(form).getByRole("button", { name: /^Copy/ }));
    await waitFor(() => expect(writes()).toHaveLength(2));
    expect(writes().map((w) => (w.body as { assignments: unknown[] }).assignments.length)).toEqual([50, 10]);
    await waitFor(() => expect(screen.queryByRole("form")).toBeNull());
  });

  it("a failing second chunk names it and reports how many were created; a retry sends only the rest", async () => {
    const list = Array.from({ length: 60 }, (_, i) => make(i + 1, { title: `T${String(i + 1).padStart(2, "0")}` }));
    const { user, form } = await setup(list);
    let calls = 0;
    fakeApi.on("POST /api/assignments/bulk", (body) => {
      calls += 1;
      return calls === 2 ? [400, { error: "invalid_range", message: "Assignment 3: The end date must be on or after the start date." }] : echo(body);
    });
    date(form, "This year's first day", "2026-08-17");
    date(form, "Next year's first day", "2027-08-16");
    await user.click(within(form).getByRole("button", { name: /^Copy/ }));
    const alert = await within(form).findByRole("alert");
    expect(alert).toHaveTextContent("Part 2 of 2 didn't save: T53: The end date must be on or after the start date.");
    expect(alert).toHaveTextContent("50 copies were created.");
    expect(screen.getByRole("form", { name: "Copy to a new year" })).toBeInTheDocument();
    expect(within(form).getByText("10 assignments to copy")).toBeInTheDocument();
    await user.click(within(form).getByRole("button", { name: /^Copy/ }));
    await waitFor(() => expect(writes()).toHaveLength(3));
    expect((writes()[2]!.body as { assignments: unknown[] }).assignments).toHaveLength(10);
  });

  it("says so when nothing starts on or after the first day; Cancel sends nothing", async () => {
    const { user, form } = await setup([make(1)]);
    date(form, "This year's first day", "2027-01-01");
    date(form, "Next year's first day", "2027-08-16");
    expect(within(form).getByText("No assignments start on or after that day.")).toBeInTheDocument();
    await user.click(within(form).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("form")).toBeNull();
    expect(writes()).toEqual([]);
  });
});
