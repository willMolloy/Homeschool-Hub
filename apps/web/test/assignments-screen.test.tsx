import { fireEvent, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import type { Assignment, Subject } from "../src/api/types";
import { fakeApi } from "./helpers/fake-api";
import { FRANK, LATIN, MAGGIE, MATH, OLD_KID, READING, patchMerging, rowId, withRoster, writes } from "./helpers/schedule-fixtures";
import { renderAt } from "./render";

const SAXON: Assignment = {
  id: rowId(1), subjectId: MATH.id, title: "Saxon 5/4", unitType: "lessons", totalUnits: 20, weightPerUnit: null,
  startDate: "2026-11-02", endDate: "2026-11-26", childIds: [FRANK.id, MAGGIE.id], archived: false,
};
const NOVEL: Assignment = {
  id: rowId(2), subjectId: READING.id, title: "Charlotte's Web", unitType: "pages", totalUnits: 184, weightPerUnit: 1.4,
  startDate: "2026-10-15", endDate: "2026-12-18", childIds: [MAGGIE.id], archived: false,
};
const OLD: Assignment = {
  id: rowId(3), subjectId: LATIN.id, title: "Latin primer", unitType: "chapters", totalUnits: 10, weightPerUnit: 20,
  startDate: "2026-01-05", endDate: "2026-05-29", childIds: [OLD_KID.id], archived: true,
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
    await user.type(within(form).getByLabelText("Weight per page"), "1.4");
    date("Start", "2026-11-02", form);
    date("End", "2026-12-04", form);
    await user.click(within(form).getByRole("checkbox", { name: "Frank" }));
    await user.click(within(form).getByRole("button", { name: "Add" }));
    expect(writes()).toEqual([{
      method: "POST", path: "/api/assignments",
      body: { subjectId: MATH.id, title: "Fractions", unitType: "pages", totalUnits: 45.5, weightPerUnit: 1.4, startDate: "2026-11-02", endDate: "2026-12-04", childIds: [FRANK.id] },
    }]);
    expect(await screen.findByText("Fractions")).toBeInTheDocument();
    expect(screen.queryByRole("form")).toBeNull();
  });

  it("weight blank → null (built-in shown as the hint)", async () => {
    const user = await setup();
    fakeApi.on("POST /api/assignments", (body) => [201, { ...(body as object), id: rowId(9), archived: false }]);
    await user.click(screen.getByRole("button", { name: "Add assignment" }));
    const form = screen.getByRole("form", { name: "Add assignment" });
    await user.selectOptions(within(form).getByLabelText("Subject"), READING.id);
    await user.type(within(form).getByLabelText("Title"), "Poems");
    await user.type(within(form).getByLabelText("Total"), "12");
    expect(within(form).getByLabelText("Weight per lesson")).toHaveAttribute("placeholder", "15");
    expect(within(form).getByText("Relative effort; 1 point ≈ 2 minutes. Blank = the subject's default or the built-in (15).")).toBeInTheDocument();
    date("Start", "2026-11-02", form);
    date("End", "2026-11-02", form);
    await user.click(within(form).getByRole("checkbox", { name: "Maggie" }));
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
    expect(within(form).getByText(/the built-in \(0\.5\)/)).toBeInTheDocument();
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

  it("a unit change clears the weight and sends both fields (D7)", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Charlotte's Web/ }));
    const form = screen.getByRole("form", { name: "Edit Charlotte's Web" });
    await user.selectOptions(within(form).getByLabelText("Unit"), "minutes");
    expect(within(form).getByLabelText("Weight per minute")).toHaveValue(null);
    await user.click(within(form).getByRole("button", { name: "Save" }));
    expect(writes()).toEqual([{ method: "PATCH", path: `/api/assignments/${NOVEL.id}`, body: { unitType: "minutes", weightPerUnit: null } }]);
  });

  it("a unit change with a new weight typed sends that weight", async () => {
    const user = await setup();
    await user.click(screen.getByRole("button", { name: /Charlotte's Web/ }));
    const form = screen.getByRole("form", { name: "Edit Charlotte's Web" });
    await user.selectOptions(within(form).getByLabelText("Unit"), "chapters");
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
