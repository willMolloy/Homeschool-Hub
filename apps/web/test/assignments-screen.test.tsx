import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { weightFromMinutesPerDay } from "@hh/engine";
import type { Assignment, Subject } from "../src/api/types";
import { schoolDaysBetween } from "../src/features/schedule/effort";
import { fakeApi } from "./helpers/fake-api";
import { FRANK, LATIN, MAGGIE, MATH, OLD_KID, READING, patchMerging, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

const SAXON: Assignment = {
  id: rowId(1), subjectId: MATH.id, title: "Saxon 5/4", unitType: "lessons", totalUnits: 20, weightPerUnit: null,
  startDate: "2026-11-02", endDate: "2026-11-26", childIds: [FRANK.id, MAGGIE.id], archived: false, weekdays: null,
};
const NOVEL: Assignment = {
  id: rowId(2), subjectId: READING.id, title: "Charlotte's Web", unitType: "pages", totalUnits: 184, weightPerUnit: 1.4,
  startDate: "2026-10-15", endDate: "2026-12-18", childIds: [MAGGIE.id], archived: false, weekdays: null,
};
const OLD: Assignment = {
  id: rowId(3), subjectId: LATIN.id, title: "Latin primer", unitType: "chapters", totalUnits: 10, weightPerUnit: 20,
  startDate: "2026-01-05", endDate: "2026-05-29", childIds: [OLD_KID.id], archived: true, weekdays: null,
};

async function setup(rows = [SAXON, NOVEL], subjects?: Subject[]) {
  withRoster(undefined, subjects);
  fakeApi.on("GET /api/assignments", 200, rows);
  fakeApi.on("GET /api/assignments?includeArchived=true", 200, [...rows, OLD]);
  for (const r of [SAXON, NOVEL, OLD]) fakeApi.on(`PATCH /api/assignments/${r.id}`, patchMerging(r));
  const user = userEvent.setup();
  renderAt("/schedule/assignments");
  await screen.findByRole("list", { name: "Assignments" });
  return user;
}
const cards = () => within(screen.getByRole("list", { name: "Assignments" })).getAllByRole("listitem");
const date = (label: string, value: string, scope: HTMLElement) => fireEvent.change(within(scope).getByLabelText(label), { target: { value } });
/** S6-09: the radio for a preset ("30 minutes") or "Custom" in the form's effort question. */
const effort = (form: HTMLElement, name: string) => within(within(form).getByRole("group", { name: "About how long will that take?" })).getByRole("radio", { name });
/** S6-09: the weight a pick of `minutes` a day comes to for `total` units between the dates, Monday to Friday. */
const weightFor = (minutes: number, total: number, start: string, end: string) =>
  weightFromMinutesPerDay(minutes, total / schoolDaysBetween(start, end, [1, 2, 3, 4, 5]));
/** S2c-04: Add waits for the weight suggestion for the current inputs. */
const addReady = (form: HTMLElement) => waitFor(() => expect(within(form).getByRole("button", { name: "Add" })).toBeEnabled());

describe("Assignments screen", () => {
  it("list renders subject and child names, sorted by start", async () => {
    await setup();
    const [first, second] = cards();
    expect(first).toHaveTextContent("Charlotte's Web");
    expect(first).toHaveTextContent("Reading · Maggie");
    expect(first).toHaveTextContent("184 pages · weight 1.4");
    expect(second).toHaveTextContent("Saxon 5/4");
    expect(second).toHaveTextContent("Math · Frank, Maggie");
    expect(second).toHaveTextContent("20 lessons · weight ~15 (default)");
    expect(second).toHaveTextContent("Nov 2, 2026 – Nov 26, 2026");
  });

  it("empty state", async () => {
    withRoster();
    fakeApi.on("GET /api/assignments", 200, []);
    renderAt("/schedule/assignments");
    expect(await screen.findByText("No assignments yet.")).toBeInTheDocument();
  });

  it("load error → Retry", async () => {
    withRoster();
    fakeApi.on("GET /api/assignments", 500, { error: "internal" });
    renderAt("/schedule/assignments");
    expect(await screen.findByText("Couldn't load assignments.")).toBeInTheDocument();
    fakeApi.on("GET /api/assignments", 200, [SAXON]);
    await userEvent.setup().click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByRole("list", { name: "Assignments" })).toBeInTheDocument();
  });

  it("add submits the right body and the new card appears", async () => {
    const user = await setup();
    fakeApi.on("POST /api/assignments", (body) => [201, { ...(body as object), id: rowId(9), archived: false }]);
    await user.click(screen.getByRole("button", { name: "Add assignment" }));
    const form = screen.getByRole("form", { name: "Add assignment" });
    // Archived subjects/children aren't offered for new work.
    expect(within(form).queryByRole("option", { name: /Latin/ })).toBeNull();
    expect(within(form).queryByRole("checkbox", { name: /Old Kid/ })).toBeNull();
    await user.selectOptions(within(form).getByLabelText("Subject"), MATH.id);
    await user.type(within(form).getByLabelText("Title"), "  Fractions ");
    await user.selectOptions(within(form).getByLabelText("Unit"), "pages");
    await user.type(within(form).getByLabelText("Total"), "45.5");
    date("Start", "2026-11-02", form);
    date("End", "2026-12-04", form);
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    // S6-09: 45.5 pages over 25 school days is 1.82 a day; "30 minutes" a day is 30 / 1.82 / 2 = 8.24 a page.
    expect(within(form).getByText("About 1.8 pages a day")).toBeInTheDocument();
    await user.click(effort(form, "30 minutes"));
    await user.click(within(form).getByRole("button", { name: "Add" }));
    expect(writes()).toEqual([{
      method: "POST", path: "/api/assignments",
      body: { subjectId: MATH.id, title: "Fractions", unitType: "pages", totalUnits: 45.5, weightPerUnit: 8.24, startDate: "2026-11-02", endDate: "2026-12-04", childIds: [FRANK.id], weekdays: null },
    }]);
    expect(await screen.findByText("Fractions")).toBeInTheDocument();
    expect(screen.queryByRole("form")).toBeNull();
  });

  it("an untouched built-in suggestion → null (S2b-11: follows the subject default live)", async () => {
    const user = await setup();
    fakeApi.on("POST /api/assignments", (body) => [201, { ...(body as object), id: rowId(9), archived: false }]);
    await user.click(screen.getByRole("button", { name: "Add assignment" }));
    const form = screen.getByRole("form", { name: "Add assignment" });
    await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
    await user.type(within(form).getByLabelText("Title"), "Poems");
    await user.type(within(form).getByLabelText("Total"), "12");
    date("Start", "2026-11-02", form);
    date("End", "2026-11-02", form);
    // S6-09: the hint names the suggestion and what it comes to in minutes (12 lessons in one day).
    expect(await within(form).findByText("Using the default weight for lessons (15). That's about 360 min a day.")).toBeInTheDocument();
    expect(within(form).getByRole("radio", { name: "Custom" })).toBeChecked();
    await user.click(within(form).getByRole("checkbox", { name: "Maggie" }));
    await addReady(form);
    await user.click(within(form).getByRole("button", { name: "Add" }));
    const body = writes()[0]!.body as Record<string, unknown>;
    expect(body.weightPerUnit).toBeNull();
    expect(body).not.toHaveProperty("minutesPerUnit");
  });

  it("minutes: the built-in 0.5 shows as about 32 min a day; picking 45 minutes sends the weight for it (D21)", async () => {
    const user = await setup();
    fakeApi.on("POST /api/assignments", (body) => [201, { ...(body as object), id: rowId(9), archived: false }]);
    await user.click(screen.getByRole("button", { name: "Add assignment" }));
    const form = screen.getByRole("form", { name: "Add assignment" });
    await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
    await user.type(within(form).getByLabelText("Title"), "Piano");
    await user.selectOptions(within(form).getByLabelText("Unit"), "minutes");
    await user.type(within(form).getByLabelText("Total"), "600");
    date("Start", "2026-11-02", form);
    date("End", "2026-11-26", form);
    expect(await within(form).findByText("Using the default weight for minutes (0.5). That's about 32 min a day.")).toBeInTheDocument();
    expect(effort(form, "30 minutes")).toBeChecked();
    await user.click(effort(form, "45 minutes"));
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    await user.click(within(form).getByRole("button", { name: "Add" }));
    expect(writes()[0]!.body).toMatchObject({ unitType: "minutes", weightPerUnit: weightFor(45, 600, "2026-11-02", "2026-11-26") });
    expect(weightFor(45, 600, "2026-11-02", "2026-11-26")).toBe(0.71);
  });

  it.each([
    ["0", "Minutes must be more than 0 and at most 1,440."],
    ["-1", "Minutes must be more than 0 and at most 1,440."],
    ["1441", "Minutes must be more than 0 and at most 1,440."],
    ["1.234", "Minutes can have at most 2 decimal places."],
  ])("custom minutes %s → client error, no request", async (raw, msg) => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Charlotte's Web/ }));
    const form = screen.getByRole("form", { name: "Edit Charlotte's Web" });
    await user.click(effort(form, "Custom"));
    const input = within(form).getByLabelText("Minutes a day");
    await user.clear(input);
    await user.type(input, raw);
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(within(form).getByText(msg)).toBeInTheDocument();
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(writes()).toEqual([]);
  });

  it("card variants: own weight, the subject's default, the built-in", async () => {
    const plain: Assignment = { ...NOVEL, id: rowId(4), title: "Plain pages", weightPerUnit: null, subjectId: MATH.id };
    const fromSubject: Assignment = { ...NOVEL, id: rowId(5), title: "Subject pages", weightPerUnit: null };
    const otherUnit: Assignment = { ...SAXON, id: rowId(6), title: "Reading lessons", subjectId: READING.id };
    await setup([NOVEL, plain, fromSubject, otherUnit], [MATH, { ...READING, defaultWeight: { unitType: "pages", weightPerUnit: 2 } }, LATIN]);
    const text = (title: string) => screen.getByRole("button", { name: new RegExp(title) }).textContent;
    expect(text("Charlotte's Web")).toContain("184 pages · weight 1.4");
    expect(text("Subject pages")).toContain("184 pages · weight ~2 (subject)");
    expect(text("Plain pages")).toContain("184 pages · weight ~1 (default)");
    // Reading's default is for pages, so a Reading lessons assignment uses the built-in (D23).
    expect(text("Reading lessons")).toContain("20 lessons · weight ~15 (default)");
  });

  it("edit PATCHes only changed fields and replaces children", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Saxon 5\/4/ }));
    const form = screen.getByRole("form", { name: "Edit Saxon 5/4" });
    expect(within(form).getByLabelText("Title")).toHaveValue("Saxon 5/4");
    expect(within(form).getByLabelText("Total")).toHaveValue(20);
    // S6-09: no weight of its own, so the built-in 15 a lesson: 20 lessons over 19 days is about 32 min a day.
    expect(effort(form, "30 minutes")).toBeChecked();
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    await user.clear(within(form).getByLabelText("Total"));
    await user.type(within(form).getByLabelText("Total"), "25");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(writes()).toEqual([{ method: "PATCH", path: `/api/assignments/${SAXON.id}`, body: { totalUnits: 25, childIds: [MAGGIE.id] } }]);
    expect(await screen.findByText("25 lessons · weight ~15 (default)")).toBeInTheDocument();
  });

  it("no change sends nothing, and an edit that leaves the effort alone never sends a weight", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Charlotte's Web/ }));
    let form = screen.getByRole("form", { name: "Edit Charlotte's Web" });
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(writes()).toEqual([]);
    await user.click(screen.getByRole("button", { name: /Charlotte's Web/ }));
    form = screen.getByRole("form", { name: "Edit Charlotte's Web" });
    await user.clear(within(form).getByLabelText("Total"));
    await user.type(within(form).getByLabelText("Total"), "200");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(writes()).toEqual([{ method: "PATCH", path: `/api/assignments/${NOVEL.id}`, body: { totalUnits: 200 } }]);
  });

  it("edit with only the effort changed sends just {weightPerUnit}", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Charlotte's Web/ }));
    const form = screen.getByRole("form", { name: "Edit Charlotte's Web" });
    // Weight 1.4 over 47 school days (3.9 pages a day) is about 11 minutes a day, closest to "15 minutes".
    expect(effort(form, "15 minutes")).toBeChecked();
    expect(within(form).getByText("That's about 11 min a day now.")).toBeInTheDocument();
    await user.click(effort(form, "60 minutes"));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    const w = weightFor(60, 184, "2026-10-15", "2026-12-18");
    expect(writes()).toEqual([{ method: "PATCH", path: `/api/assignments/${NOVEL.id}`, body: { weightPerUnit: w } }]);
    expect(await screen.findByText(`184 pages · weight ${w}`)).toBeInTheDocument();
  });

  it("a unit change goes back to the new unit's suggestion and sends both fields (D7)", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Charlotte's Web/ }));
    const form = screen.getByRole("form", { name: "Edit Charlotte's Web" });
    await user.selectOptions(within(form).getByLabelText("Unit"), "minutes");
    expect(await within(form).findByText(/^Using the default weight for minutes \(0\.5\)\./)).toBeInTheDocument();
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(writes()).toEqual([{ method: "PATCH", path: `/api/assignments/${NOVEL.id}`, body: { unitType: "minutes", weightPerUnit: null } }]);
  });

  it("a unit change with a new effort picked sends that weight", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Charlotte's Web/ }));
    const form = screen.getByRole("form", { name: "Edit Charlotte's Web" });
    await user.selectOptions(within(form).getByLabelText("Unit"), "chapters");
    expect(await within(form).findByText(/^Using the default weight for chapters \(10\)\./)).toBeInTheDocument();
    await user.click(effort(form, "45 minutes"));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(writes()).toEqual([{ method: "PATCH", path: `/api/assignments/${NOVEL.id}`, body: { unitType: "chapters", weightPerUnit: weightFor(45, 184, "2026-10-15", "2026-12-18") } }]);
  });

  it("end before start → error, no request", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Saxon 5\/4/ }));
    const form = screen.getByRole("form", { name: "Edit Saxon 5/4" });
    date("End", "2026-11-01", form);
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(within(form).getByText("The end date must be on or after the start date.")).toBeInTheDocument();
    expect(within(form).getByLabelText("End")).toHaveAttribute("aria-invalid", "true");
    expect(writes()).toEqual([]);
  });

  it("client checks on add: subject, title, total, children", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: "Add assignment" }));
    const form = screen.getByRole("form", { name: "Add assignment" });
    await user.type(within(form).getByLabelText("Total"), "0");
    await addReady(form);
    await user.click(within(form).getByRole("button", { name: "Add" }));
    for (const msg of ["Pick a subject.", "Title is required.", "Total must be more than 0 and at most 100,000.", "Pick a start and an end date.", "Pick at least one child."]) {
      expect(within(form).getByText(msg)).toBeInTheDocument();
    }
    expect(writes()).toEqual([]);
  });

  it("archive (confirmed) removes the card; Show archived lists it and Unarchive works", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Saxon 5\/4/ }));
    await user.click(screen.getByRole("button", { name: "Archive" }));
    const dialog = screen.getByRole("dialog", { name: "Archive Saxon 5/4?" });
    await user.click(within(dialog).getByRole("button", { name: "Archive" }));
    expect(writes()).toEqual([{ method: "PATCH", path: `/api/assignments/${SAXON.id}`, body: { archived: true } }]);
    expect(screen.queryByText("Saxon 5/4")).toBeNull();

    await user.click(screen.getByLabelText("Show archived"));
    const old = await screen.findByRole("button", { name: /Latin primer/ });
    expect(old).toHaveTextContent("Archived");
    expect(old).toHaveTextContent("Latin · Old Kid");
    await user.click(old);
    const form = screen.getByRole("form", { name: "Edit Latin primer" });
    // The archived subject/child stay visible (selected) so the row can still be edited.
    expect(within(form).getByLabelText("Subject")).toHaveValue(LATIN.id);
    expect(within(form).getByRole("checkbox", { name: /Old Kid/ })).toBeChecked();
    await user.click(within(form).getByRole("button", { name: "Unarchive" }));
    expect(writes().at(-1)).toEqual({ method: "PATCH", path: `/api/assignments/${OLD.id}`, body: { archived: false } });
  });

  it("server 400 shown in the form", async () => {
    const user = await setup();
    fakeApi.on(`PATCH /api/assignments/${SAXON.id}`, 400, { error: "invalid_reference", message: "childIds: Unknown or archived child." });
    await user.click(screen.getByRole("button", { name: /Saxon 5\/4/ }));
    const form = screen.getByRole("form", { name: "Edit Saxon 5/4" });
    await user.clear(within(form).getByLabelText("Title"));
    await user.type(within(form).getByLabelText("Title"), "Saxon 6/5");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(await within(form).findByText("Unknown or archived child.")).toBeInTheDocument();
    expect(screen.getByRole("form", { name: "Edit Saxon 5/4" })).toBeInTheDocument();
  });

  it("roster load failure → Retry", async () => {
    fakeApi.on("GET /api/children", 500, { error: "internal" });
    fakeApi.on("GET /api/subjects", 200, []);
    renderAt("/schedule/assignments");
    expect(await screen.findByText("Couldn't load your children and subjects.")).toBeInTheDocument();
  });
});

describe("Assignment weight suggestion (S2b-11)", () => {
  const MATH_20: Subject = { ...MATH, defaultWeight: { unitType: "lessons", weightPerUnit: 20 } };

  /** Maggie has a usual pages/chapters weight of 1.4; Frank has no history; Math has 20 per lesson. */
  function suggestions(_b: unknown, _p: string, q: URLSearchParams): [number, unknown] {
    const unitType = q.get("unitType") as Assignment["unitType"];
    const learned = unitType === "pages" || unitType === "chapters";
    const ids = q.get("childIds")?.split(",") ?? [];
    const children = ids.map((id) => ({
      childId: id, name: id === MAGGIE.id ? "Maggie" : "Frank", usual: learned && id === MAGGIE.id ? 1.4 : null, choices: 0,
    }));
    const builtIn = { pages: 1, chapters: 10, lessons: 15, minutes: 0.5 }[unitType];
    const subjectDefault = q.get("subjectId") === MATH.id ? MATH_20.defaultWeight : null;
    const common = { unitType, builtInDefault: builtIn, subjectDefault, learned, children };
    if (children.some((c) => c.usual != null)) return [200, { ...common, weightPerUnit: 1.4, source: "child" }];
    if (subjectDefault?.unitType === unitType) return [200, { ...common, weightPerUnit: 20, source: "subject" }];
    return [200, { ...common, weightPerUnit: builtIn, source: "builtin" }];
  }

  async function openAdd() {
    const user = await setup([SAXON, NOVEL], [MATH_20, READING, LATIN]);
    fakeApi.on("GET /api/weights/suggestion", suggestions);
    fakeApi.on("POST /api/assignments", (body) => [201, { ...(body as object), id: rowId(9), archived: false }]);
    await user.click(screen.getByRole("button", { name: "Add assignment" }));
    const form = screen.getByRole("form", { name: "Add assignment" });
    await user.type(within(form).getByLabelText("Title"), "Fractions");
    await user.type(within(form).getByLabelText("Total"), "10");
    date("Start", "2026-11-02", form);
    date("End", "2026-11-26", form);
    return { user, form };
  }
  const add = async (user: ReturnType<typeof userEvent.setup>, form: HTMLElement) => {
    await addReady(form);
    await user.click(within(form).getByRole("button", { name: "Add" }));
    await waitFor(() => expect(writes()).toHaveLength(1));
    return writes()[0]!.body as Record<string, unknown>;
  };
  const suggestionCalls = () => fakeApi.calls.filter((c) => c.path.startsWith("/api/weights/suggestion"));

  it("Maggie + pages → her usual 1.4 is pre-filled, hinted and sent explicitly", async () => {
    const { user, form } = await openAdd();
    await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
    await user.selectOptions(within(form).getByLabelText("Unit"), "pages");
    await user.click(within(form).getByRole("checkbox", { name: "Maggie" }));
    expect(await within(form).findByText(/^Using Maggie's usual weight for pages \(1\.4\)\. That's about 1 min a day\.$/)).toBeInTheDocument();
    expect(suggestionCalls().at(-1)?.path).toBe(`/api/weights/suggestion?unitType=pages&childIds=${MAGGIE.id}&subjectId=${READING.id}`);
    expect((await add(user, form)).weightPerUnit).toBe(1.4);
  });

  it("adding Frank → the mixed hint; the request carries both children", async () => {
    const { user, form } = await openAdd();
    await user.selectOptions(within(form).getByLabelText("Unit"), "pages");
    await user.click(within(form).getByRole("checkbox", { name: "Maggie" }));
    await within(form).findByText(/^Using Maggie's usual weight for pages \(1\.4\)\./);
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    expect(await within(form).findByText(/^Using Maggie's usual weight \(1\.4\)\. Frank has no history yet\./)).toBeInTheDocument();
    const ids = [FRANK.id, MAGGIE.id].sort().join(",");
    expect(suggestionCalls().at(-1)?.path).toContain(`childIds=${encodeURIComponent(ids)}`);
  });

  it("a picked 30 minutes holds across child changes; Use goes back to the suggestion", async () => {
    const { user, form } = await openAdd();
    await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
    await user.selectOptions(within(form).getByLabelText("Unit"), "pages");
    await user.click(within(form).getByRole("checkbox", { name: "Maggie" }));
    await within(form).findByText(/^Using Maggie's usual weight for pages/);
    await user.click(effort(form, "30 minutes"));
    expect(within(form).getByText("The suggestion is about 1 min a day.")).toBeInTheDocument();
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    await waitFor(() => expect(suggestionCalls().at(-1)?.path).toContain(FRANK.id));
    await new Promise((r) => setTimeout(r, 300));
    expect(effort(form, "30 minutes")).toBeChecked();
    await user.click(within(form).getByRole("button", { name: /^Use about \d+ min$/ }));
    expect(effort(form, "30 minutes")).not.toBeChecked();
    expect(within(form).getByText(/^Using Maggie's usual weight \(1\.4\)\. Frank has no history yet\./)).toBeInTheDocument();
    expect((await add(user, form)).weightPerUnit).toBe(1.4);
  });

  it("Math (lessons, subject default 20) → the hint shows 20 and null is sent", async () => {
    const { user, form } = await openAdd();
    await user.selectOptions(within(form).getByLabelText("Subject"), MATH.id);
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    // 20 a lesson over 19 days (10 lessons) is about 21 minutes a day, closest to "15 minutes".
    expect(await within(form).findByText("Using the Math default (20 per lesson). That's about 21 min a day.")).toBeInTheDocument();
    expect(effort(form, "15 minutes")).toBeChecked();
    expect((await add(user, form)).weightPerUnit).toBeNull();
  });

  it("picking the preselected preset is a choice: it is sent as a weight, not as the suggestion", async () => {
    const { user, form } = await openAdd();
    await user.selectOptions(within(form).getByLabelText("Subject"), MATH.id);
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    await within(form).findByText(/^Using the Math default \(20 per lesson\)\./);
    await user.click(effort(form, "15 minutes"));
    expect((await add(user, form)).weightPerUnit).toBe(weightFor(15, 10, "2026-11-02", "2026-11-26"));
  });

  it("built-in → null", async () => {
    const { user, form } = await openAdd();
    await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    expect(await within(form).findByText(/^Using the default weight for lessons \(15\)\./)).toBeInTheDocument();
    expect((await add(user, form)).weightPerUnit).toBeNull();
  });

  it("a suggestion error → the built-in hint, and save still works", async () => {
    const { user, form } = await openAdd();
    fakeApi.on("GET /api/weights/suggestion", 500, { error: "internal" });
    await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
    await user.selectOptions(within(form).getByLabelText("Unit"), "pages");
    await user.click(within(form).getByRole("checkbox", { name: "Maggie" }));
    expect(await within(form).findByText(/^Using the default weight for pages \(1\)\./)).toBeInTheDocument();
    expect((await add(user, form)).weightPerUnit).toBeNull();
  });

  it("edit makes no request until the unit changes; a null weight shows its effective value", async () => {
    const user = await setup([SAXON, NOVEL], [MATH_20, READING, LATIN]);
    fakeApi.on("GET /api/weights/suggestion", suggestions);
    await user.click(screen.getByRole("button", { name: /Saxon 5\/4/ }));
    const form = screen.getByRole("form", { name: "Edit Saxon 5/4" });
    // The Math default of 20 a lesson is about 42 minutes a day over 19 days: closest to "45 minutes".
    expect(effort(form, "45 minutes")).toBeChecked();
    expect(within(form).getByText("That's about 42 min a day now.")).toBeInTheDocument();
    await new Promise((r) => setTimeout(r, 300));
    expect(suggestionCalls()).toEqual([]);
    await user.selectOptions(within(form).getByLabelText("Unit"), "pages");
    expect(await within(form).findByText(/^Using Maggie's usual weight \(1\.4\)\. Frank has no history yet\./)).toBeInTheDocument();
    expect(suggestionCalls()).toHaveLength(1);
  });

  describe("a loading or stale suggestion isn't saved (S2c-04)", () => {
    const addButton = (form: HTMLElement) => within(form).getByRole("button", { name: "Add" });

    it("Add is disabled and busy until the suggestion for the current inputs arrives", async () => {
      const { form } = await openAdd();
      await waitFor(() => expect(addButton(form)).toBeEnabled());
      fireEvent.click(within(form).getByRole("checkbox", { name: "Maggie" }));
      expect(addButton(form)).toBeDisabled();
      expect(addButton(form)).toHaveAttribute("aria-busy", "true");
      expect(addButton(form)).toHaveTextContent("Add");
      fireEvent.submit(form); // Enter does nothing either
      expect(writes()).toEqual([]);
      await waitFor(() => expect(addButton(form)).toBeEnabled());
      expect(addButton(form)).not.toHaveAttribute("aria-busy");
    });

    it("a children change → the new children's suggestion is sent, not the old one", async () => {
      const { user, form } = await openAdd();
      await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
      await user.selectOptions(within(form).getByLabelText("Unit"), "pages");
      await user.click(within(form).getByRole("checkbox", { name: "Maggie" }));
      await within(form).findByText(/^Using Maggie's usual weight for pages \(1\.4\)\./);
      await addReady(form);
      // Swap Maggie for Frank (no history): her 1.4 is still on show while his answer loads.
      fireEvent.click(within(form).getByRole("checkbox", { name: "Maggie" }));
      fireEvent.click(within(form).getByRole("checkbox", { name: "Frank" }));
      expect(addButton(form)).toBeDisabled();
      fireEvent.click(addButton(form));
      expect(writes()).toEqual([]);
      expect(await within(form).findByText(/^Using the default weight for pages \(1\)\./)).toBeInTheDocument();
      expect((await add(user, form)).weightPerUnit).toBeNull();
    });

    it("a picked effort saves while the suggestion is still loading", async () => {
      const { user, form } = await openAdd();
      await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
      await addReady(form);
      fireEvent.click(within(form).getByRole("checkbox", { name: "Maggie" }));
      expect(addButton(form)).toBeDisabled();
      fireEvent.click(effort(form, "30 minutes"));
      expect(addButton(form)).toBeEnabled();
      await user.click(addButton(form));
      await waitFor(() => expect(writes()).toHaveLength(1));
      expect((writes()[0]!.body as Record<string, unknown>).weightPerUnit).toBe(weightFor(30, 10, "2026-11-02", "2026-11-26"));
    });

    it("a failed suggestion request enables Add with the built-in", async () => {
      const { user, form } = await openAdd();
      fakeApi.on("GET /api/weights/suggestion", 500, { error: "internal" });
      fireEvent.click(within(form).getByRole("checkbox", { name: "Frank" }));
      expect(addButton(form)).toBeDisabled();
      await waitFor(() => expect(addButton(form)).toBeEnabled());
      await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
      expect((await add(user, form)).weightPerUnit).toBeNull();
    });
  });
});
