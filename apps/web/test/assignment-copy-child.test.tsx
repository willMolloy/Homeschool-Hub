import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Assignment } from "../src/api/types";
import { fakeApi } from "./helpers/fake-api";
import type { Child } from "../src/api/types";
import { FRANK, MAGGIE, MATH, READING, rowId, withRoster, writes } from "./helpers/schedule-fixtures";

// S7b-12: "Together art" is shared with Leo, not Maggie, so copying Frank's work to Maggie still has a shared one to copy.
const LEO: Child = { id: "10000000-0000-4000-8000-000000000104", name: "Leo", color: null, sortOrder: 3, archived: false };
import { renderAt } from "./render";

const make = (n: number, over: Partial<Assignment> = {}): Assignment => ({
  id: rowId(n), subjectId: MATH.id, title: `Book ${n}`, unitType: "lessons", totalUnits: 20, weightPerUnit: null,
  startDate: "2026-09-01", endDate: "2026-10-01", childIds: [FRANK.id], archived: false, weekdays: null, ...over,
});
const LIST = [
  make(1, { title: "Saxon 5/4", startDate: "2026-09-07", endDate: "2026-10-30", weightPerUnit: 2, weekdays: [1, 2, 3] }),
  make(2, { title: "Story of the World", subjectId: READING.id, unitType: "chapters", totalUnits: 42, startDate: "2026-09-14", endDate: "2026-12-18" }),
  make(3, { title: "Maggie's phonics", subjectId: READING.id, childIds: [MAGGIE.id] }),
  make(4, { title: "Together art", childIds: [FRANK.id, LEO.id], startDate: "2026-09-21", endDate: "2026-11-20" }),
];

async function setup(list: Assignment[] = LIST) {
  withRoster([FRANK, MAGGIE, LEO]);
  fakeApi.on("GET /api/assignments", 200, list);
  const user = userEvent.setup();
  renderAt("/schedule/assignments");
  await screen.findByRole("list", { name: "Assignments" });
  await user.click(screen.getByRole("button", { name: "Copy to another child" }));
  const form = screen.getByRole("form", { name: "Copy to another child" });
  return { user, form };
}
let made = 0;
const echo = (body: unknown): [number, unknown] => [201, (body as { assignments: object[] }).assignments.map((a) => ({ ...a, id: rowId(2000 + made++), archived: false }))];
const titles = (form: HTMLElement) => within(within(form).getByRole("group", { name: "To copy" })).getAllByRole("checkbox").map((b) => b.closest("label")!.querySelector("strong")!.textContent);

describe("Copy to another child (S7-02)", () => {
  it("shows nothing until a source child is picked, then that child's assignments, all ticked", async () => {
    const { user, form } = await setup();
    expect(within(form).queryByRole("checkbox")).toBeNull();
    await user.selectOptions(within(form).getByLabelText("Copy from"), FRANK.id);
    expect(titles(form)).toEqual(["Saxon 5/4", "Story of the World", "Together art"]);
    for (const b of within(form).getAllByRole("checkbox")) expect(b).toBeChecked();
  });

  it("filters by subject", async () => {
    const { user, form } = await setup();
    await user.selectOptions(within(form).getByLabelText("Copy from"), FRANK.id);
    await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
    expect(titles(form)).toEqual(["Story of the World"]);
  });

  it("the target can't be the source", async () => {
    const { user, form } = await setup();
    await user.selectOptions(within(form).getByLabelText("Copy from"), FRANK.id);
    const target = within(form).getByLabelText("Copy to");
    expect(within(target).queryByRole("option", { name: "Frank" })).toBeNull();
    expect(within(target).getByRole("option", { name: "Maggie" })).toBeInTheDocument();
  });

  it("copies the plan fields to the target child only, with the dates unchanged, and leaves the originals", async () => {
    const { user, form } = await setup();
    fakeApi.on("POST /api/assignments/bulk", echo);
    await user.selectOptions(within(form).getByLabelText("Copy from"), FRANK.id);
    await user.click(within(form).getByRole("checkbox", { name: /Story of the World/ }));
    await user.click(within(form).getByRole("checkbox", { name: /Together art/ }));
    await user.selectOptions(within(form).getByLabelText("Copy to"), MAGGIE.id);
    await user.click(within(form).getByRole("button", { name: /^Copy/ }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]).toEqual({
      method: "POST", path: "/api/assignments/bulk",
      body: { assignments: [{ subjectId: MATH.id, title: "Saxon 5/4", unitType: "lessons", totalUnits: 20, weightPerUnit: 2, startDate: "2026-09-07", endDate: "2026-10-30", childIds: [MAGGIE.id], weekdays: [1, 2, 3] }],
        undo: { label: "Copied 1 assignment to Maggie" } }, // S7b-11: the copy is one undo entry (this key is new)
    });
    expect(writes().every((w) => w.method === "POST")).toBe(true);
    expect(screen.queryByRole("form")).toBeNull();
    expect(await screen.findAllByText("Saxon 5/4")).toHaveLength(2);
  });

  it("a shared assignment is copied for the target alone", async () => {
    const { user, form } = await setup();
    fakeApi.on("POST /api/assignments/bulk", echo);
    await user.selectOptions(within(form).getByLabelText("Copy from"), FRANK.id);
    await user.selectOptions(within(form).getByLabelText("Copy to"), MAGGIE.id);
    await user.click(within(form).getByRole("button", { name: /^Copy/ }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    const sent = (writes()[0]!.body as { assignments: { childIds: string[] }[] }).assignments;
    expect(sent).toHaveLength(3);
    for (const a of sent) expect(a.childIds).toEqual([MAGGIE.id]);
  });

  it("a new start date moves the earliest ticked assignment there and the others keep their gaps", async () => {
    const { user, form } = await setup();
    fakeApi.on("POST /api/assignments/bulk", echo);
    await user.selectOptions(within(form).getByLabelText("Copy from"), FRANK.id);
    await user.selectOptions(within(form).getByLabelText("Copy to"), MAGGIE.id);
    fireEvent.change(within(form).getByLabelText("New start date (optional)"), { target: { value: "2027-01-04" } });
    // Saxon starts 2026-09-07: +119 days. Story of the World (+7 days after it) starts 2027-01-11; Together art 2027-01-18.
    expect(within(form).getByRole("checkbox", { name: /Together art/ })).toHaveAccessibleName(/Jan 18, 2027 – Mar 19, 2027/);
    await user.click(within(form).getByRole("button", { name: /^Copy/ }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    const sent = (writes()[0]!.body as { assignments: { title: string; startDate: string; endDate: string }[] }).assignments;
    expect(sent.map((a) => [a.title, a.startDate, a.endDate])).toEqual([
      ["Saxon 5/4", "2027-01-04", "2027-02-26"],
      ["Story of the World", "2027-01-11", "2027-04-16"],
      ["Together art", "2027-01-18", "2027-03-19"],
    ]);
  });

  it("with the first one unticked the shift is based on the earliest one left", async () => {
    const { user, form } = await setup();
    fakeApi.on("POST /api/assignments/bulk", echo);
    await user.selectOptions(within(form).getByLabelText("Copy from"), FRANK.id);
    await user.selectOptions(within(form).getByLabelText("Copy to"), MAGGIE.id);
    await user.click(within(form).getByRole("checkbox", { name: /Saxon/ }));
    fireEvent.change(within(form).getByLabelText("New start date (optional)"), { target: { value: "2027-01-04" } });
    await user.click(within(form).getByRole("button", { name: /^Copy/ }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    const sent = (writes()[0]!.body as { assignments: { title: string; startDate: string }[] }).assignments;
    expect(sent.map((a) => [a.title, a.startDate])).toEqual([["Story of the World", "2027-01-04"], ["Together art", "2027-01-11"]]);
  });

  it("asks for a target before sending anything", async () => {
    const { user, form } = await setup();
    await user.selectOptions(within(form).getByLabelText("Copy from"), FRANK.id);
    await user.click(within(form).getByRole("button", { name: /^Copy/ }));
    expect(await within(form).findByText("Pick the child to copy to.")).toBeInTheDocument();
    expect(writes()).toEqual([]);
  });

  it("uses the same chunked save: 60 copies send 50 then 10", async () => {
    const many = Array.from({ length: 60 }, (_, i) => make(i + 1, { title: `T${String(i + 1).padStart(2, "0")}` }));
    const { user, form } = await setup(many);
    fakeApi.on("POST /api/assignments/bulk", echo);
    await user.selectOptions(within(form).getByLabelText("Copy from"), FRANK.id);
    await user.selectOptions(within(form).getByLabelText("Copy to"), MAGGIE.id);
    await user.click(within(form).getByRole("button", { name: /^Copy/ }));
    await waitFor(() => expect(writes()).toHaveLength(2));
    expect(writes().map((w) => (w.body as { assignments: unknown[] }).assignments.length)).toEqual([50, 10]);
  });

  it("says when the child has nothing to copy; Cancel sends nothing", async () => {
    const { user, form } = await setup([make(1, { childIds: [MAGGIE.id] })]);
    await user.selectOptions(within(form).getByLabelText("Copy from"), FRANK.id);
    expect(within(form).getByText("Frank has no assignments to copy.")).toBeInTheDocument();
    await user.click(within(form).getByRole("button", { name: "Cancel" }));
    expect(screen.queryByRole("form")).toBeNull();
    expect(writes()).toEqual([]);
  });
});

describe("Copy to another child leaves out what the child already has (S7b-12)", () => {
  async function pick(list: Assignment[], from = FRANK.id, to = MAGGIE.id) {
    const { user, form } = await setup(list);
    await user.selectOptions(within(form).getByLabelText("Copy from"), from);
    await user.selectOptions(within(form).getByLabelText("Copy to"), to);
    return { user, form };
  }

  it("the review's case: Frank's History, already shared with Margaret, offers 0 and says so", async () => {
    const shared = make(1, { title: "History spine", childIds: [FRANK.id, MAGGIE.id] });
    const { form } = await pick([shared]);
    expect(within(form).getByText("1 already has Maggie.")).toBeInTheDocument();
    expect(within(form).queryByRole("checkbox")).toBeNull();
    expect(within(form).queryByRole("button", { name: /^Copy/ })).toBeNull();
    expect(writes()).toEqual([]);
  });

  it("an identical copy the child already has (same subject, title, dates) is left out; one with other dates is not", async () => {
    const list = [
      make(1, { title: "Saxon", startDate: "2026-09-07", endDate: "2026-10-30" }),
      make(2, { title: "Saxon", childIds: [MAGGIE.id], startDate: "2026-09-07", endDate: "2026-10-30" }), // Maggie's identical one
      make(3, { title: "Story", startDate: "2026-09-14", endDate: "2026-12-18" }),
      make(4, { title: "Story", childIds: [MAGGIE.id], startDate: "2026-09-15", endDate: "2026-12-18" }), // other dates: not identical
    ];
    const { form } = await pick(list);
    expect(titles(form)).toEqual(["Story"]);
    expect(within(form).getByText("1 already has Maggie.")).toBeInTheDocument();
  });

  it("with a new start date, a copy that already exists on the shifted dates is also left out", async () => {
    const list = [
      make(1, { title: "A", startDate: "2026-09-07", endDate: "2026-10-30" }),
      make(2, { title: "C", startDate: "2026-09-14", endDate: "2026-11-06" }),
      make(3, { title: "A", childIds: [MAGGIE.id], startDate: "2027-01-04", endDate: "2027-02-26" }), // A as it would be copied
    ];
    const { form } = await pick(list);
    expect(titles(form)).toEqual(["A", "C"]); // not identical as is: Maggie's A starts on Jan 4
    fireEvent.change(within(form).getByLabelText("New start date (optional)"), { target: { value: "2027-01-04" } });
    expect(within(form).getByText("1 already has Maggie.")).toBeInTheDocument();
    expect(titles(form)).toEqual(["C"]);
  });

  it("several that she has say 'N already have'", async () => {
    const list = [make(1, { title: "A", childIds: [FRANK.id, MAGGIE.id] }), make(2, { title: "B", childIds: [FRANK.id, MAGGIE.id] }), make(3, { title: "C" })];
    const { form } = await pick(list);
    expect(within(form).getByText("2 already have Maggie.")).toBeInTheDocument();
    expect(titles(form)).toEqual(["C"]);
  });

  it("nothing is left out before a target is chosen, and the target field stays when the list empties", async () => {
    const shared = make(1, { title: "History spine", childIds: [FRANK.id, MAGGIE.id] });
    const { user, form } = await setup([shared]);
    await user.selectOptions(within(form).getByLabelText("Copy from"), FRANK.id);
    expect(titles(form)).toEqual(["History spine"]);
    await user.selectOptions(within(form).getByLabelText("Copy to"), MAGGIE.id);
    expect(within(form).getByLabelText("Copy to")).toHaveValue(MAGGIE.id);
    await user.selectOptions(within(form).getByLabelText("Copy to"), LEO.id);
    expect(titles(form)).toEqual(["History spine"]); // Leo doesn't have it
  });
});
