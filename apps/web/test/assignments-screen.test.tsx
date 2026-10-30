import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Assignment, Subject } from "../src/api/types";
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
    // The built-in suggestion arrives first (S2b-11); typing replaces it.
    await waitFor(() => expect(within(form).getByLabelText("Weight per page")).toHaveValue(1));
    await user.clear(within(form).getByLabelText("Weight per page"));
    await user.type(within(form).getByLabelText("Weight per page"), "1.4");
    date("Start", "2026-11-02", form);
    date("End", "2026-12-04", form);
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    await user.click(within(form).getByRole("button", { name: "Add" }));
    expect(writes()).toEqual([{
      method: "POST", path: "/api/assignments",
      body: { subjectId: MATH.id, title: "Fractions", unitType: "pages", totalUnits: 45.5, weightPerUnit: 1.4, startDate: "2026-11-02", endDate: "2026-12-04", childIds: [FRANK.id], weekdays: null },
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
    expect(within(form).getByLabelText("Weight per lesson")).toHaveAttribute("placeholder", "15");
    expect(await within(form).findByText("Using the default weight for lessons (15).")).toBeInTheDocument();
    expect(within(form).getByLabelText("Weight per lesson")).toHaveValue(15);
    date("Start", "2026-11-02", form);
    date("End", "2026-11-02", form);
    await user.click(within(form).getByRole("checkbox", { name: "Maggie" }));
    await addReady(form);
    await user.click(within(form).getByRole("button", { name: "Add" }));
    const body = writes()[0]!.body as Record<string, unknown>;
    expect(body.weightPerUnit).toBeNull();
    expect(body).not.toHaveProperty("minutesPerUnit");
  });

  it("minutes shows 'Weight per minute' (built-in 0.5) and sends 0.75 (D21)", async () => {
    const user = await setup();
    fakeApi.on("POST /api/assignments", (body) => [201, { ...(body as object), id: rowId(9), archived: false }]);
    await user.click(screen.getByRole("button", { name: "Add assignment" }));
    const form = screen.getByRole("form", { name: "Add assignment" });
    await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
    await user.type(within(form).getByLabelText("Title"), "Piano");
    await user.selectOptions(within(form).getByLabelText("Unit"), "minutes");
    await user.type(within(form).getByLabelText("Total"), "600");
    expect(await within(form).findByText("Using the default weight for minutes (0.5).")).toBeInTheDocument();
    await user.clear(within(form).getByLabelText("Weight per minute"));
    await user.type(within(form).getByLabelText("Weight per minute"), "0.75");
    date("Start", "2026-11-02", form);
    date("End", "2026-11-26", form);
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    await user.click(within(form).getByRole("button", { name: "Add" }));
    expect(writes()[0]!.body).toMatchObject({ unitType: "minutes", weightPerUnit: 0.75 });
  });

  it.each([
    ["0", "Weight must be more than 0 and at most 100."],
    ["-1", "Weight must be more than 0 and at most 100."],
    ["101", "Weight must be more than 0 and at most 100."],
    ["1.234", "Weight can have at most 2 decimal places."],
  ])("weight %s → client error, no request", async (raw, msg) => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Charlotte's Web/ }));
    const form = screen.getByRole("form", { name: "Edit Charlotte's Web" });
    const input = within(form).getByLabelText("Weight per page");
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
    expect(within(form).getByLabelText("Weight per lesson")).toHaveValue(null);
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    await user.clear(within(form).getByLabelText("Total"));
    await user.type(within(form).getByLabelText("Total"), "25");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(writes()).toEqual([{ method: "PATCH", path: `/api/assignments/${SAXON.id}`, body: { totalUnits: 25, childIds: [MAGGIE.id] } }]);
    expect(await screen.findByText("25 lessons · weight ~15 (default)")).toBeInTheDocument();
  });

  it("clearing the weight on edit sends null; no change sends nothing", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Charlotte's Web/ }));
    let form = screen.getByRole("form", { name: "Edit Charlotte's Web" });
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(writes()).toEqual([]);
    await user.click(screen.getByRole("button", { name: /Charlotte's Web/ }));
    form = screen.getByRole("form", { name: "Edit Charlotte's Web" });
    await user.clear(within(form).getByLabelText("Weight per page"));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(writes()).toEqual([{ method: "PATCH", path: `/api/assignments/${NOVEL.id}`, body: { weightPerUnit: null } }]);
  });

  it("edit with only the weight changed sends just {weightPerUnit}", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Charlotte's Web/ }));
    const form = screen.getByRole("form", { name: "Edit Charlotte's Web" });
    expect(within(form).getByLabelText("Weight per page")).toHaveValue(1.4);
    await user.clear(within(form).getByLabelText("Weight per page"));
    await user.type(within(form).getByLabelText("Weight per page"), "2.25");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(writes()).toEqual([{ method: "PATCH", path: `/api/assignments/${NOVEL.id}`, body: { weightPerUnit: 2.25 } }]);
    expect(await screen.findByText("184 pages · weight 2.25")).toBeInTheDocument();
  });

  it("a unit change resets the weight to the new unit's suggestion and sends both fields (D7)", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Charlotte's Web/ }));
    const form = screen.getByRole("form", { name: "Edit Charlotte's Web" });
    await user.selectOptions(within(form).getByLabelText("Unit"), "minutes");
    await waitFor(() => expect(within(form).getByLabelText("Weight per minute")).toHaveValue(0.5));
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(writes()).toEqual([{ method: "PATCH", path: `/api/assignments/${NOVEL.id}`, body: { unitType: "minutes", weightPerUnit: null } }]);
  });

  it("a unit change with a new weight typed sends that weight", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Charlotte's Web/ }));
    const form = screen.getByRole("form", { name: "Edit Charlotte's Web" });
    await user.selectOptions(within(form).getByLabelText("Unit"), "chapters");
    await waitFor(() => expect(within(form).getByLabelText("Weight per chapter")).toHaveValue(10));
    await user.clear(within(form).getByLabelText("Weight per chapter"));
    await user.type(within(form).getByLabelText("Weight per chapter"), "12");
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(writes()).toEqual([{ method: "PATCH", path: `/api/assignments/${NOVEL.id}`, body: { unitType: "chapters", weightPerUnit: 12 } }]);
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
    expect(await within(form).findByText("Using Maggie's usual weight for pages (1.4).")).toBeInTheDocument();
    expect(within(form).getByLabelText("Weight per page")).toHaveValue(1.4);
    expect(suggestionCalls().at(-1)?.path).toBe(`/api/weights/suggestion?unitType=pages&childIds=${MAGGIE.id}&subjectId=${READING.id}`);
    expect((await add(user, form)).weightPerUnit).toBe(1.4);
  });

  it("adding Frank → the mixed hint; the request carries both children", async () => {
    const { user, form } = await openAdd();
    await user.selectOptions(within(form).getByLabelText("Unit"), "pages");
    await user.click(within(form).getByRole("checkbox", { name: "Maggie" }));
    await within(form).findByText("Using Maggie's usual weight for pages (1.4).");
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    expect(await within(form).findByText("Using Maggie's usual weight (1.4). Frank has no history yet.")).toBeInTheDocument();
    const ids = [FRANK.id, MAGGIE.id].sort().join(",");
    expect(suggestionCalls().at(-1)?.path).toContain(`childIds=${encodeURIComponent(ids)}`);
  });

  it("a typed 2 holds across child changes; Use restores the suggestion", async () => {
    const { user, form } = await openAdd();
    await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
    await user.selectOptions(within(form).getByLabelText("Unit"), "pages");
    await user.click(within(form).getByRole("checkbox", { name: "Maggie" }));
    const input = within(form).getByLabelText("Weight per page");
    await waitFor(() => expect(input).toHaveValue(1.4));
    await user.clear(input);
    await user.type(input, "2");
    expect(within(form).getByText(/Your weight \(2\)\. Maggie's usual is 1\.4\./)).toBeInTheDocument();
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    await waitFor(() => expect(suggestionCalls().at(-1)?.path).toContain(FRANK.id));
    await new Promise((r) => setTimeout(r, 300));
    expect(input).toHaveValue(2);
    await user.click(within(form).getByRole("button", { name: "Use 1.4" }));
    expect(input).toHaveValue(1.4);
    expect(within(form).getByText("Using Maggie's usual weight (1.4). Frank has no history yet.")).toBeInTheDocument();
    expect((await add(user, form)).weightPerUnit).toBe(1.4);
  });

  it("Math (lessons, subject default 20) → the hint shows 20 and null is sent", async () => {
    const { user, form } = await openAdd();
    await user.selectOptions(within(form).getByLabelText("Subject"), MATH.id);
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    expect(await within(form).findByText("Using the Math default (20 per lesson).")).toBeInTheDocument();
    expect(within(form).getByLabelText("Weight per lesson")).toHaveValue(20);
    expect(within(form).getByLabelText("Weight per lesson")).toHaveAttribute("placeholder", "20 from Math");
    expect((await add(user, form)).weightPerUnit).toBeNull();
  });

  it("a typed value equal to the suggestion is still sent explicitly", async () => {
    const { user, form } = await openAdd();
    await user.selectOptions(within(form).getByLabelText("Subject"), MATH.id);
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    const input = within(form).getByLabelText("Weight per lesson");
    await waitFor(() => expect(input).toHaveValue(20));
    await user.clear(input);
    await user.type(input, "20");
    expect(within(form).getByText("Using the Math default (20 per lesson).")).toBeInTheDocument();
    expect((await add(user, form)).weightPerUnit).toBe(20);
  });

  it("built-in → null", async () => {
    const { user, form } = await openAdd();
    await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    expect(await within(form).findByText("Using the default weight for lessons (15).")).toBeInTheDocument();
    expect((await add(user, form)).weightPerUnit).toBeNull();
  });

  it("a suggestion error → the built-in hint, and save still works", async () => {
    const { user, form } = await openAdd();
    fakeApi.on("GET /api/weights/suggestion", 500, { error: "internal" });
    await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
    await user.selectOptions(within(form).getByLabelText("Unit"), "pages");
    await user.click(within(form).getByRole("checkbox", { name: "Maggie" }));
    expect(await within(form).findByText("Using the default weight for pages (1).")).toBeInTheDocument();
    expect((await add(user, form)).weightPerUnit).toBeNull();
  });

  it("edit makes no request until the unit changes; a null weight shows its effective value", async () => {
    const user = await setup([SAXON, NOVEL], [MATH_20, READING, LATIN]);
    fakeApi.on("GET /api/weights/suggestion", suggestions);
    await user.click(screen.getByRole("button", { name: /Saxon 5\/4/ }));
    const form = screen.getByRole("form", { name: "Edit Saxon 5/4" });
    const input = within(form).getByLabelText("Weight per lesson");
    expect(input).toHaveValue(null);
    expect(input).toHaveAttribute("placeholder", "20 from Math");
    await new Promise((r) => setTimeout(r, 300));
    expect(suggestionCalls()).toEqual([]);
    await user.selectOptions(within(form).getByLabelText("Unit"), "pages");
    expect(await within(form).findByText("Using Maggie's usual weight (1.4). Frank has no history yet.")).toBeInTheDocument();
    expect(within(form).getByLabelText("Weight per page")).toHaveValue(1.4);
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
      await within(form).findByText("Using Maggie's usual weight for pages (1.4).");
      await addReady(form);
      // Swap Maggie for Frank (no history): her 1.4 is still on show while his answer loads.
      fireEvent.click(within(form).getByRole("checkbox", { name: "Maggie" }));
      fireEvent.click(within(form).getByRole("checkbox", { name: "Frank" }));
      expect(addButton(form)).toBeDisabled();
      fireEvent.click(addButton(form));
      expect(writes()).toEqual([]);
      expect(await within(form).findByText("Using the default weight for pages (1).")).toBeInTheDocument();
      expect((await add(user, form)).weightPerUnit).toBeNull();
    });

    it("a typed weight saves while the suggestion is still loading", async () => {
      const { user, form } = await openAdd();
      await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
      await addReady(form);
      fireEvent.click(within(form).getByRole("checkbox", { name: "Maggie" }));
      expect(addButton(form)).toBeDisabled();
      fireEvent.change(within(form).getByLabelText("Weight per lesson"), { target: { value: "3" } });
      expect(addButton(form)).toBeEnabled();
      await user.click(addButton(form));
      await waitFor(() => expect(writes()).toHaveLength(1));
      expect((writes()[0]!.body as Record<string, unknown>).weightPerUnit).toBe(3);
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
