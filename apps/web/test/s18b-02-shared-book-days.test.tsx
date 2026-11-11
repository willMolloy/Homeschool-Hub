// S18b-02: one set of school days per assignment. A different schedule is a separate workbook, named by its days,
// and from one copy the parent can open the same update on the other without moving its progress.
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ENGINE_VERSION, planAll, type Assignment as EngineAssignment, type ChildPlan } from "@hh/engine";
import type { Assignment } from "../src/api/types";
import { bookTitle, otherCopies, resolvedWeekdays, twinIds } from "../src/features/schedule/bookCopies";
import { OtherCopies, copyRows } from "../src/features/schedule/OtherCopies";
import { selectionFor } from "../src/features/timeline/select";
import { buildTimelineModel } from "../src/features/timeline/model";
import { fakeApi } from "./helpers/fake-api";
import { FRANK, MAGGIE, MATH, READING, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

const ELIAS = { ...FRANK, id: rowId(11), name: "Elias", sortOrder: 0 };
const CLARA = { ...MAGGIE, id: rowId(12), name: "Clara", sortOrder: 1 };
const WREN = { ...FRANK, id: rowId(13), name: "Wren", color: "#7dcea0", sortOrder: 2 };
const BIBLE = { ...READING, id: rowId(21), name: "Bible", sortOrder: 0 };
const book = (n: number, over: Partial<Assignment>): Assignment => ({
  id: rowId(n), subjectId: BIBLE.id, title: "Gospel of Luke", unitType: "chapters", totalUnits: 24, weightPerUnit: null,
  startDate: "2026-08-17", endDate: "2026-12-18", childIds: [WREN.id], archived: false, weekdays: [2, 3, 4, 5], ...over,
});
const SHARED = book(1, { childIds: [ELIAS.id, CLARA.id], weekdays: [1, 2, 3, 4], startDate: "2026-08-17" });
const WRENS = book(2, { childIds: [WREN.id], weekdays: [2, 3, 4, 5], startDate: "2026-08-18" });
const MATHS = book(3, { subjectId: MATH.id, title: "Math 2", childIds: [WREN.id], weekdays: [2, 3, 4, 5], startDate: "2026-08-19" });

describe("a shared book is one workbook (S18b-02)", () => {
  it("matches another workbook of the same book, including a Copy suffix, and ignores an archived one", () => {
    expect(bookTitle("Gospel of Luke (copy)")).toBe(bookTitle("gospel   of luke"));
    const archived = book(4, { archived: true, childIds: [WREN.id] });
    const copy = book(5, { title: "Gospel of Luke (copy)", childIds: [WREN.id] });
    expect(otherCopies([SHARED, WRENS, archived, copy, MATHS], SHARED).map((a) => a.id)).toEqual([WRENS.id, copy.id]);
    expect(twinIds([MATHS])).toEqual(new Set());
    expect(resolvedWeekdays({ weekdays: [1, 2, 3, 4] }, [2, 3, 4, 5], [1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4]);
    expect(resolvedWeekdays({ weekdays: null }, null, [1, 2, 3, 4, 5])).toEqual([1, 2, 3, 4, 5]);
  });

  it("names the two workbooks by their days on the year view, and leaves a book with no twin untitled that way", () => {
    const engine = (id: string, childIds: string[]): EngineAssignment => ({
      id, subjectId: id === "math" ? MATH.id : BIBLE.id, childIds, unitType: id === "math" ? "lessons" : "chapters", totalUnits: 24, start: "2026-08-17", end: "2026-12-18",
    });
    const plans = planAll([engine(SHARED.id, SHARED.childIds), engine(WRENS.id, WRENS.childIds), engine("math", [WREN.id])], {
      calendar: { weekStart: "mon", schoolDays: [1, 2, 3, 4, 5] }, asOf: "2026-11-05",
    });
    const assignments = [SHARED, WRENS, { ...MATHS, id: "math" }];
    const model = buildTimelineModel({
      from: "2026-08-17", to: "2026-12-18", today: "2026-11-05", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5],
      plans, assignments, children: [ELIAS, CLARA, WREN], subjects: [BIBLE, MATH], blocked: [], events: [],
    });
    const titles = model.lanes.flatMap((l) => l.children.flatMap((c) => c.assignments.map((a) => [a.assignmentId, a.title])));
    expect(titles).toContainEqual([SHARED.id, "Gospel of Luke · Mon–Thu"]);
    expect(titles).toContainEqual([WRENS.id, "Gospel of Luke · Tue–Fri"]);
    expect(titles).toContainEqual(["math", "Math 2"]);
    expect(selectionFor(model, assignments, WRENS.id)!.subtitle).toBe("Bible · Wren · Tue–Fri");
    expect(selectionFor(model, assignments, SHARED.id)!.subtitle).toBe("Bible · Elias, Clara · Mon–Thu");
    expect(selectionFor(model, assignments, "math")!.subtitle).toBe("Math · Wren");
  });
});

describe("Other copies open the same update and leave the rest (S18b-02)", () => {
  const rows = copyRows(SHARED, [SHARED, WRENS], (id) => ({ [ELIAS.id]: "Elias", [CLARA.id]: "Clara", [WREN.id]: "Wren" }[id] ?? ""), (a) => a.weekdays ?? []);

  it("names the other workbook and calls only the update that was asked for", async () => {
    const user = userEvent.setup();
    const calls: string[] = [];
    render(<OtherCopies rows={rows} kinds={["amount", "status", "finish"]}
      onAmount={() => calls.push("amount")} onStatus={() => calls.push("status")} onFinish={() => calls.push("finish")} />);
    expect(screen.getByText("Wren · Tue–Fri")).toBeInTheDocument();
    expect(screen.getByText("Separate workbooks. Updating one leaves the others where they are.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "This week's amount" }));
    await user.click(screen.getByRole("button", { name: "Update status for Wren · Tue–Fri" }));
    await user.click(screen.getByRole("button", { name: "Did Wren finish Gospel of Luke?" }));
    expect(calls).toEqual(["amount", "status", "finish"]);
  });
});

describe("Set up lists the days, and a copy can be given its own (S18b-02)", () => {
  it("Assignments tells the two Gospels apart by their days, and a book with no twin is not", async () => {
    withRoster([ELIAS, CLARA, WREN], [BIBLE, MATH]);
    fakeApi.on("GET /api/assignments", 200, [SHARED, WRENS, MATHS]);
    renderAt("/schedule/assignments");
    const list = await screen.findByRole("list", { name: "Assignments" });
    const text = within(list).getAllByRole("listitem").map((li) => li.textContent);
    expect(text.some((t) => t!.includes("Elias, Clara · Mon–Thu"))).toBe(true);
    expect(text.some((t) => t!.includes("Wren · Tue–Fri"))).toBe(true);
    expect(text.find((t) => t!.includes("Math 2"))).not.toMatch(/Tue–Fri/);
  });

  it("from one copy, this week's amount opens that child's week and writes nothing", async () => {
    withRoster([ELIAS, CLARA, WREN], [BIBLE, MATH]);
    fakeApi.on("GET /api/assignments", 200, [SHARED, WRENS, MATHS]);
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: "2026-10-26", to: "2026-11-01", plans: [] });
    fakeApi.on("GET /api/events", 200, []);
    fakeApi.on("GET /api/week-overrides", 200, { overrides: [] });
    const user = userEvent.setup();
    const { router } = renderAt("/schedule/assignments");
    await screen.findByRole("list", { name: "Assignments" });
    await user.click(screen.getByRole("button", { name: /Elias, Clara/ }));
    const form = screen.getByRole("form", { name: "Edit Gospel of Luke" });
    await user.click(within(form).getByRole("button", { name: "This week's amount" }));
    expect(router.state.location.pathname).toBe("/schedule");
    expect(router.state.location.search).toContain("view=week");
    expect(await screen.findByRole("dialog", { name: /Wren/ })).toBeInTheDocument();
    expect(writes()).toEqual([]);
  });

  it("Update status on the other copy saves only that copy", async () => {
    withRoster([ELIAS, CLARA, WREN], [BIBLE, MATH]);
    fakeApi.on("GET /api/assignments", 200, [SHARED, WRENS, MATHS]);
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: "x", to: "y", plans: [] });
    fakeApi.on("GET /api/check-ins", 200, {
      weekStart: "2026-10-19", weekEnd: "2026-10-25", status: null, addable: [],
      items: [{ assignmentId: WRENS.id, childId: WREN.id, childName: "Wren", title: "Gospel of Luke", unitType: "chapters", plannedFrom: 1, plannedTo: 2, totalUnits: 24, actual: null, mode: null }],
    });
    fakeApi.on("PUT /api/check-ins/2026-10-19", 200, { weekStart: "2026-10-19", weekEnd: "2026-10-25", status: "reviewed", items: [], addable: [], planChanged: false });
    const user = userEvent.setup();
    renderAt("/schedule/assignments");
    await screen.findByRole("list", { name: "Assignments" });
    await user.click(screen.getByRole("button", { name: /Elias, Clara/ }));
    await user.click(within(screen.getByRole("form", { name: "Edit Gospel of Luke" })).getByRole("button", { name: "Update status for Wren · Tue–Fri" }));
    const sheet = within(await screen.findByRole("dialog"));
    expect(sheet.getByText(/Wren/)).toBeInTheDocument();
    await user.click(sheet.getByRole("button", { name: "Fell behind" }));
    await user.click(sheet.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(writes().some((w) => w.method === "PUT")).toBe(true));
    const put = writes().find((w) => w.method === "PUT")!.body as { items: { assignmentId: string }[] };
    expect(put.items.map((i) => i.assignmentId)).toEqual([WRENS.id]);
    expect(JSON.stringify(put)).not.toContain(SHARED.id);
  });

  it("the finish question opens on the other copy and does not save it", async () => {
    withRoster([ELIAS, CLARA, WREN], [BIBLE, MATH]);
    fakeApi.on("GET /api/assignments", 200, [SHARED, WRENS, MATHS]);
    const user = userEvent.setup();
    renderAt("/schedule/assignments");
    await screen.findByRole("list", { name: "Assignments" });
    await user.click(screen.getByRole("button", { name: /Elias, Clara/ }));
    await user.click(within(screen.getByRole("form", { name: "Edit Gospel of Luke" })).getByRole("button", { name: "Did Wren finish Gospel of Luke?" }));
    const sheet = await screen.findByRole("dialog");
    expect(within(sheet).getByText("Did Wren finish Gospel of Luke?")).toBeInTheDocument();
    expect(writes()).toEqual([]);
  });

  it("Copy to another child can set the copies' days, and leaves the original's days", async () => {
    const source = book(1, { childIds: [ELIAS.id], weekdays: [1, 2, 3, 4], title: "The Hobbit (read aloud)" });
    withRoster([ELIAS, WREN], [BIBLE]);
    fakeApi.on("GET /api/assignments", 200, [source]);
    fakeApi.on("POST /api/assignments/bulk", (body) => [201, (body as { assignments: object[] }).assignments.map((a, i) => ({ ...a, id: rowId(80 + i), archived: false }))]);
    const user = userEvent.setup();
    renderAt("/schedule/assignments");
    await screen.findByRole("list", { name: "Assignments" });
    await user.click(screen.getByRole("button", { name: "Copy to another child" }));
    const form = screen.getByRole("form", { name: "Copy to another child" });
    await user.selectOptions(within(form).getByLabelText("Copy from"), ELIAS.id);
    await user.selectOptions(within(form).getByLabelText("Copy to"), WREN.id);
    await user.click(within(form).getByRole("button", { name: "Set the copies' school days" }));
    for (const day of ["Monday", "Friday"]) await user.click(within(form).getByRole("checkbox", { name: day }));
    await user.click(within(form).getByRole("button", { name: /^Copy/ }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    const sent = (writes()[0]!.body as { assignments: { childIds: string[]; weekdays: number[] }[] }).assignments;
    expect(sent).toEqual([expect.objectContaining({ childIds: [WREN.id], weekdays: [2, 3, 4, 5], title: "The Hobbit (read aloud)" })]);
    expect(writes().every((w) => w.method === "POST")).toBe(true);
  });

  it("the copy form says the copy has its own school days", async () => {
    withRoster([ELIAS, WREN], [BIBLE]);
    fakeApi.on("GET /api/assignments", 200, [WRENS]);
    const user = userEvent.setup();
    renderAt("/schedule/assignments");
    await user.click(await screen.findByRole("button", { name: /Gospel of Luke/ }));
    await user.click(within(screen.getByRole("form", { name: "Edit Gospel of Luke" })).getByRole("button", { name: "Copy" }));
    expect(screen.getByRole("form", { name: "Add assignment" })).toHaveTextContent("This copy is its own workbook. Set its school days here. The original keeps its days.");
  });
});

describe("this week's amount opens from a link (S18b-02)", () => {
  const plan = (assignmentId: string, childId: string): ChildPlan => ({
    engineVersion: ENGINE_VERSION, assignmentId, childId, subjectId: "lit", unitType: "pages", weightPerUnit: 1,
    weightSource: "assignment", weekdays: null, weekdaysSource: "default", totalUnits: 24, doneUnits: 0, remainingUnits: 24, baseRate: 1, rate: 1,
    plannedEnd: "2026-12-18", end: "2026-12-18", mode: null, unplacedUnits: 0, noCapacity: false, complete: false, checkInWeeks: [], warnings: [],
    days: [{ date: "2026-10-27", capacity: 1, schoolDay: true, units: 1, thickness: 1, kind: "planned", position: 1 }],
  } as unknown as ChildPlan);
  const full = (id: string, childIds: string[], weekdays: number[]): Assignment => ({
    id, subjectId: "lit", title: "Gospel of Luke", unitType: "chapters", totalUnits: 24, weightPerUnit: null,
    startDate: "2026-08-17", endDate: "2026-12-18", childIds, archived: false, weekdays,
  });

  function stub() {
    fakeApi.on("GET /api/plan", 200, { engineVersion: ENGINE_VERSION, asOf: "2026-10-28", from: "2026-10-26", to: "2026-11-01", plans: [plan("shared", "c1"), plan("wren", "c2")] });
    fakeApi.on("GET /api/children", 200, [
      { id: "c1", name: "Elias", color: null, sortOrder: 0, archived: false },
      { id: "c2", name: "Wren", color: null, sortOrder: 1, archived: false },
    ]);
    fakeApi.on("GET /api/subjects", 200, [{ id: "lit", name: "Bible", color: null, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null }]);
    fakeApi.on("GET /api/assignments", 200, [full("shared", ["c1"], [1, 2, 3, 4]), full("wren", ["c2"], [2, 3, 4, 5])]);
    fakeApi.on("GET /api/events", 200, []);
    fakeApi.on("GET /api/week-overrides", 200, { overrides: [] });
  }

  it("?adjust= opens that child's week, and the other copy's amount switches child without saving", async () => {
    stub();
    const user = userEvent.setup();
    renderAt("/schedule?view=week&adjust=c1");
    const sheet = within(await screen.findByRole("dialog", { name: /Elias/ }));
    expect(sheet.getByText("Wren · Tue–Fri")).toBeInTheDocument();
    await user.click(sheet.getByRole("button", { name: "This week's amount" }));
    expect(writes()).toEqual([]);
    expect(await screen.findByRole("dialog", { name: /Wren/ })).toBeInTheDocument();
  });
});
