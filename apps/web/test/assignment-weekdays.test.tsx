/** S4-07: the Days chips on the assignment forms (single, Add several, copies from the Assignments screen and the timeline). */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION } from "@hh/engine";
import type { Assignment, Subject } from "../src/api/types";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { FRANK, MATH, READING, patchMerging, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { SAMPLE_ASSIGNMENTS, SAMPLE_BLOCKED, SAMPLE_CHILDREN, SAMPLE_EVENTS, SAMPLE_SUBJECTS, samplePlans } from "./helpers/timeline-fixtures";
import { renderAt } from "./render";

const FRIDAY_ONLY: Subject = { ...MATH, defaultWeekdays: [5] };
const MON_TO_FRI = MATH; // no default: every school day (Mon-Fri)

const SAXON: Assignment = {
  id: rowId(1), subjectId: MATH.id, title: "Saxon 5/4", unitType: "lessons", totalUnits: 20, weightPerUnit: null,
  startDate: "2026-11-02", endDate: "2026-11-26", childIds: [FRANK.id], archived: false, weekdays: null,
};
const MON_WED: Assignment = { ...SAXON, id: rowId(2), title: "Piano duets", weekdays: [1, 3] };

type User = ReturnType<typeof userEvent.setup>;

async function openAdd(subjects: Subject[] = [MON_TO_FRI, READING], assignments: Assignment[] = [SAXON]) {
  withRoster([FRANK], subjects);
  fakeApi.on("GET /api/assignments", 200, assignments);
  let n = 20;
  fakeApi.on("POST /api/assignments", (body) => [201, { ...(body as object), id: rowId(n++), archived: false }]);
  for (const s of subjects) fakeApi.on(`PATCH /api/subjects/${s.id}`, patchMerging(s));
  for (const a of assignments) fakeApi.on(`PATCH /api/assignments/${a.id}`, patchMerging(a));
  const user = userEvent.setup();
  renderAt("/schedule/assignments");
  await screen.findByRole("list", { name: "Assignments" });
  await user.click(screen.getByRole("button", { name: "Add assignment" }));
  return { user, form: screen.getByRole("form", { name: "Add assignment" }) };
}

const chip = (form: HTMLElement, day: string) => within(form).getByRole("checkbox", { name: day });
const checkedDays = (form: HTMLElement) =>
  within(within(form).getByRole("group", { name: "Days" })).getAllByRole("checkbox").filter((c) => (c as HTMLInputElement).checked).map((c) => c.getAttribute("aria-label"));
async function fillBasics(user: User, form: HTMLElement, subjectId: string) {
  await user.selectOptions(within(form).getByLabelText("Subject"), subjectId);
  await user.type(within(form).getByLabelText("Title"), "Picture study");
  // Frank is the only child, so he is already picked.
  fireEvent.change(within(form).getByLabelText("Start"), { target: { value: "2026-11-02" } });
  fireEvent.change(within(form).getByLabelText("End"), { target: { value: "2026-12-18" } });
  await user.type(within(form).getByLabelText("Total"), "10");
  // The weight suggestion loads first; Add waits for it.
  await waitFor(() => expect(within(form).getByRole("button", { name: "Add" })).toBeEnabled());
}

describe("Days chips on the assignment form (S4-07)", () => {
  it("prefills from the subject's default and saves null; the Days row sits under the dates", async () => {
    const { user, form } = await openAdd([FRIDAY_ONLY, READING]);
    await fillBasics(user, form, MATH.id);
    expect(checkedDays(form)).toEqual(["Friday"]);
    expect(within(form).queryByRole("button", { name: /Set as default/ })).toBeNull();
    const labels = [...form.querySelectorAll("label, legend")].map((e) => e.textContent!.trim());
    expect(labels.slice(labels.indexOf("End"), labels.indexOf("End") + 8)).toEqual(["End", "Days", "Mon", "Tue", "Wed", "Thu", "Fri", "Unit"]);
    await user.click(within(form).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]!.body).toMatchObject({ subjectId: MATH.id, weekdays: null });
    expect(fakeApi.bodyKeyViolations).toEqual([]);
  });

  it("prefills every school day when the subject has no default", async () => {
    const { user, form } = await openAdd();
    await fillBasics(user, form, MATH.id);
    expect(checkedDays(form)).toEqual(["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"]);
    await user.click(within(form).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]!.body).toMatchObject({ weekdays: null });
  });

  it("customising saves the list; matching the default again saves null", async () => {
    const { user, form } = await openAdd();
    await fillBasics(user, form, MATH.id);
    for (const d of ["Tuesday", "Thursday", "Friday"]) await user.click(chip(form, d));
    expect(checkedDays(form)).toEqual(["Monday", "Wednesday"]);
    await user.click(within(form).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]!.body).toMatchObject({ weekdays: [1, 3] });
  });

  it("tapping a chip off and on again matches the subject: null, and no Set as default", async () => {
    const { user, form } = await openAdd();
    await fillBasics(user, form, MATH.id);
    await user.click(chip(form, "Tuesday"));
    expect(within(form).getByRole("button", { name: "Set as default for Math" })).toBeInTheDocument();
    await user.click(chip(form, "Tuesday"));
    expect(within(form).queryByRole("button", { name: /Set as default/ })).toBeNull();
    await user.click(within(form).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]!.body).toMatchObject({ weekdays: null });
  });

  it("Set as default patches the subject, then the assignment saves null", async () => {
    const { user, form } = await openAdd();
    await fillBasics(user, form, MATH.id);
    for (const d of ["Tuesday", "Thursday", "Friday"]) await user.click(chip(form, d));
    await user.click(within(form).getByRole("button", { name: "Set as default for Math" }));
    await waitFor(() => expect(within(form).queryByRole("button", { name: /Set as default/ })).toBeNull());
    expect(checkedDays(form)).toEqual(["Monday", "Wednesday"]);
    await user.click(within(form).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(writes()).toHaveLength(2));
    expect(writes()).toEqual([
      { method: "PATCH", path: `/api/subjects/${MATH.id}`, body: { defaultWeekdays: [1, 3] } },
      expect.objectContaining({ method: "POST", path: "/api/assignments", body: expect.objectContaining({ weekdays: null }) }),
    ]);
    expect(fakeApi.bodyKeyViolations).toEqual([]);
  });

  it("choosing every school day on a subject with a default offers to clear it (null)", async () => {
    const { user, form } = await openAdd([FRIDAY_ONLY, READING]);
    await fillBasics(user, form, MATH.id);
    for (const d of ["Monday", "Tuesday", "Wednesday", "Thursday"]) await user.click(chip(form, d));
    await user.click(within(form).getByRole("button", { name: "Set as default for Math" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]).toMatchObject({ method: "PATCH", body: { defaultWeekdays: null } });
  });

  it("the last chip can't be switched off", async () => {
    const { user, form } = await openAdd([FRIDAY_ONLY, READING]);
    await fillBasics(user, form, MATH.id);
    await user.click(chip(form, "Friday"));
    expect(checkedDays(form)).toEqual(["Friday"]);
  });

  it("changing the subject re-prefills until a chip is tapped", async () => {
    const { user, form } = await openAdd([FRIDAY_ONLY, { ...READING, defaultWeekdays: [2, 4] }]);
    await user.selectOptions(within(form).getByLabelText("Subject"), MATH.id);
    expect(checkedDays(form)).toEqual(["Friday"]);
    await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
    expect(checkedDays(form)).toEqual(["Tuesday", "Thursday"]);
    await user.click(chip(form, "Monday"));
    await user.selectOptions(within(form).getByLabelText("Subject"), MATH.id);
    expect(checkedDays(form)).toEqual(["Monday", "Tuesday", "Thursday"]);
  });

  it("editing: an own list shows as chips; an uncustomised one follows the subject; only a change is sent", async () => {
    const { user, form } = await openAdd([FRIDAY_ONLY, READING], [SAXON, MON_WED]);
    await user.click(within(form).getByRole("button", { name: "Cancel" }));
    await user.click(screen.getByRole("button", { name: /Saxon 5\/4/ }));
    let edit = screen.getByRole("form", { name: "Edit Saxon 5/4" });
    expect(checkedDays(edit)).toEqual(["Friday"]);
    // Nothing changed: Save closes the form without a request.
    await user.click(within(edit).getByRole("button", { name: "Save" }));
    expect(writes()).toEqual([]);
    await user.click(screen.getByRole("button", { name: /Saxon 5\/4/ }));
    edit = screen.getByRole("form", { name: "Edit Saxon 5/4" });
    await user.click(chip(edit, "Monday"));
    await user.click(within(edit).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    expect(writes()[0]).toMatchObject({ method: "PATCH", path: `/api/assignments/${SAXON.id}`, body: { weekdays: [1, 5] } });
    await user.click(await screen.findByRole("button", { name: /Piano duets/ }));
    edit = screen.getByRole("form", { name: "Edit Piano duets" });
    expect(checkedDays(edit)).toEqual(["Monday", "Wednesday"]);
  });
});

describe("Days chips on Add several (S4-07)", () => {
  it("prefills from the subject and sends the shared days on every row", async () => {
    withRoster([FRANK], [MON_TO_FRI, READING]);
    fakeApi.on("GET /api/assignments", 200, [SAXON]);
    fakeApi.on("POST /api/assignments/bulk", (body) => [201, (body as { assignments: object[] }).assignments.map((a, i) => ({ ...a, id: rowId(10 + i), archived: false }))]);
    const user = userEvent.setup();
    renderAt("/schedule/assignments");
    await screen.findByRole("list", { name: "Assignments" });
    await user.click(screen.getByRole("button", { name: "Add several" }));
    const form = screen.getByRole("form", { name: "Add several assignments" });
    await user.selectOptions(within(form).getByLabelText("Subject"), MATH.id);
    expect(checkedDays(form)).toHaveLength(5);
    fireEvent.change(within(form).getByLabelText("Start"), { target: { value: "2026-11-02" } });
    fireEvent.change(within(form).getByLabelText("End"), { target: { value: "2026-12-18" } });
    for (const d of ["Tuesday", "Thursday", "Friday"]) await user.click(chip(form, d));
    const rows = [1, 2].map((n) => within(form).getByRole("group", { name: `Row ${n}` }));
    for (const [i, r] of rows.entries()) {
      await user.type(within(r).getByLabelText("Title"), `Book ${i + 1}`);
      await user.type(within(r).getByLabelText("Total"), "10");
    }
    await user.click(within(form).getByRole("button", { name: "Save" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    const sent = (writes()[0]!.body as { assignments: { weekdays: number[] | null }[] }).assignments;
    expect(sent.map((a) => a.weekdays)).toEqual([[1, 3], [1, 3]]);
  });
});

describe("Copies carry the original's own days (S4-07)", () => {
  it("from the Assignments screen: [1,3] stays [1,3], null stays null", async () => {
    const { user, form } = await openAdd([MON_TO_FRI, READING], [SAXON, MON_WED]);
    await user.click(within(form).getByRole("button", { name: "Cancel" }));
    for (const [title, expected] of [["Piano duets", [1, 3]], ["Saxon 5/4", null]] as const) {
      await user.click(screen.getByRole("button", { name: new RegExp(title) }));
      await user.click(within(screen.getByRole("form", { name: `Edit ${title}` })).getByRole("button", { name: "Copy" }));
      const add = screen.getByRole("form", { name: "Add assignment" });
      if (expected) expect(checkedDays(add)).toEqual(["Monday", "Wednesday"]);
      await user.click(within(add).getByRole("button", { name: "Add" }));
      await waitFor(() => expect(writes().filter((w) => w.method === "POST")).toHaveLength(expected ? 1 : 2));
      expect(writes().filter((w) => w.method === "POST").at(-1)!.body).toMatchObject({ title: `${title} (copy)`, weekdays: expected });
    }
  });
});

describe("Copies from the timeline (S4-07)", () => {
  async function copyFirst(weekdays: number[] | null) {
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: DEMO_ME.today, from: "x", to: "y", plans: samplePlans() });
    fakeApi.on("GET /api/children", 200, SAMPLE_CHILDREN);
    fakeApi.on("GET /api/subjects", 200, SAMPLE_SUBJECTS);
    fakeApi.on("GET /api/assignments", 200, SAMPLE_ASSIGNMENTS.map((a) => ({ ...a, weekdays })));
    fakeApi.on("GET /api/blocked-ranges", 200, SAMPLE_BLOCKED);
    fakeApi.on("GET /api/events", 200, SAMPLE_EVENTS);
    fakeApi.on("POST /api/assignments", (body) => [201, { ...(body as object), id: "copy1", archived: false }]);
    renderAt("/timeline");
    const svg = await screen.findByRole("img", { name: "Year timeline" });
    const band = svg.querySelectorAll("path.tl-band")[0]!;
    const [x, y] = band.getAttribute("d")!.slice(1).split(/[ ,LCQVHZ]+/).filter(Boolean).map(Number);
    fireEvent.click(svg, { clientX: x! + 1, clientY: y! + 1 });
    const bar = await screen.findByRole("region", { name: /^Edit / });
    await userEvent.click(within(bar).getByRole("button", { name: "Copy" }));
    const dialog = await screen.findByRole("dialog", { name: "Add assignment" });
    await userEvent.click(within(dialog).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(fakeApi.calls.filter((c) => c.method === "POST")).toHaveLength(1));
    return fakeApi.calls.find((c) => c.method === "POST")!.body;
  }

  it("a copy of a Mon/Wed assignment posts [1,3]", async () => {
    expect(await copyFirst([1, 3])).toMatchObject({ weekdays: [1, 3] });
  });

  it("a copy of an uncustomised assignment posts null", async () => {
    expect(await copyFirst(null)).toMatchObject({ weekdays: null });
  });
});
