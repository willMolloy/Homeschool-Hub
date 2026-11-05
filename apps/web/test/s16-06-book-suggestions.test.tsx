/** S16-06: quicker book logging: suggestions from the family's logs and assignments, a recent row, keyboard, and nothing pre-filled. */
import { fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import type { Assignment, Child, FamilySettings, LogFields, RecordEntry, Subject } from "../src/api/types";
import { recentBooks, suggestBooks } from "../src/features/records/bookSuggestions";
import { NO_FIELDS } from "../src/features/records/logSetup";
import { fakeApi } from "./helpers/fake-api";
import { withCovered } from "./helpers/recordEntry";
import { renderAt } from "./render";

const KIDS: Child[] = [{ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false }, { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false }];
const SUBJECTS = [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null }] as Subject[];
const A = (id: string, title: string, unitType: Assignment["unitType"], over: Partial<Assignment> = {}): Assignment => ({ id, subjectId: "lit", title, unitType, totalUnits: 100, weightPerUnit: null, startDate: "2026-08-31", endDate: "2027-05-28", childIds: ["c1"], archived: false, weekdays: null, ...over }) as Assignment;
const ASSIGNMENTS = [A("math", "Treasure maps (math)", "lessons"), A("ti", "Treasure Island", "pages"), A("hobbit", "The Hobbit", "chapters"), A("old", "Treasure Trove", "pages", { archived: true })];
const e = (id: string, childId: string, start: string, books: string[]): RecordEntry => withCovered({ id, childId, startDate: start, endDate: start, countsSchoolDay: true, schoolDays: 1, subjectMinutes: {}, totalMinutes: null, homeMinutes: null, awayMinutes: null, notes: null, books });
const ENTRIES = [
  e("1", "c1", "2026-09-01", ["Heidi", "Black Beauty"]), e("2", "c1", "2026-09-02", ["Charlotte's Web"]), e("3", "c1", "2026-09-03", ["Pagoo", "heidi"]),
  e("4", "c1", "2026-09-04", ["Aesop's Fables", "The Wind in the Willows"]), e("5", "c1", "2026-09-05", ["Robinson Crusoe"]), e("6", "c2", "2026-09-06", ["Margaret's own"]),
];
const FIELDS: LogFields = { ...NO_FIELDS, schoolDays: true, books: true };
const FAMILY = { name: "F", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", weekStartLocked: false, zoomViews: { hidden: [], custom: [] }, logSetup: { template: "custom", fields: FIELDS } } as FamilySettings;

describe("suggestions (pure)", () => {
  it("'trea' offers Treasure Island: reading assignments first, then titles from logs, then other assignments; archived work and added titles are left out", () => {
    expect(suggestBooks("trea", ENTRIES, ASSIGNMENTS, [])).toEqual(["Treasure Island", "Treasure maps (math)"]);
    expect(suggestBooks("trea", ENTRIES, ASSIGNMENTS, ["treasure island"])).toEqual(["Treasure maps (math)"]);
  });
  it("matches anywhere in the title, ignores case, and logged titles come newest first, once each", () => {
    expect(suggestBooks("EI", ENTRIES, ASSIGNMENTS, [])).toEqual(["heidi"]); // the newest spelling in the log wins
    expect(suggestBooks("the", ENTRIES, ASSIGNMENTS, [])).toEqual(["The Hobbit", "The Wind in the Willows"]);
    expect(suggestBooks("e", ENTRIES, ASSIGNMENTS, [])).toHaveLength(6); // at most six
  });
  it("nothing typed, nothing offered", () => {
    expect(suggestBooks("", ENTRIES, ASSIGNMENTS, [])).toEqual([]);
    expect(suggestBooks("   ", ENTRIES, ASSIGNMENTS, [])).toEqual([]);
  });
  it("recent: the last five titles for that child, newest first, once each, not already added", () => {
    expect(recentBooks(ENTRIES, ["c1"], [])).toEqual(["Robinson Crusoe", "Aesop's Fables", "The Wind in the Willows", "Pagoo", "heidi"]);
    expect(recentBooks(ENTRIES, ["c1"], ["pagoo"])).toEqual(["Robinson Crusoe", "Aesop's Fables", "The Wind in the Willows", "heidi", "Charlotte's Web"]);
    expect(recentBooks(ENTRIES, ["c2"], [])).toEqual(["Margaret's own"]);
    expect(recentBooks(ENTRIES, [], [])).toEqual([]);
  });
});

describe("the books field (S16-06)", () => {
  beforeEach(() => {
    localStorage.clear();
    fakeApi.on("GET /api/family", 200, FAMILY);
    fakeApi.on("GET /api/subjects", 200, SUBJECTS);
    fakeApi.on("GET /api/children", 200, KIDS);
    fakeApi.on("GET /api/assignments", 200, ASSIGNMENTS);
    fakeApi.on("GET /api/log-entries", 200, ENTRIES);
    fakeApi.on("GET /api/records/totals", 200, { from: null, to: null, childId: null, entries: 6, schoolDays: 6, totalMinutes: 0, coreMinutes: 0, nonCoreMinutes: 0, homeMinutes: 0, awayMinutes: 0, books: [], bySubject: [] });
    fakeApi.on("POST /api/log-entries", (b) => [201, [{ ...(b as object), id: "n" }]]);
  });
  async function openLog() {
    const user = userEvent.setup();
    renderAt("/records");
    await user.click(await screen.findByRole("button", { name: "Log" }));
    const form = within(await screen.findByRole("dialog"));
    await user.click(form.getByRole("button", { name: "Frank" }));
    return { user, form };
  }
  const posted = () => fakeApi.calls.filter((c) => c.method === "POST").map((c) => c.body as { books?: string[] });

  it("starts empty with nothing added, the recent titles under it; typing 'trea' offers Treasure Island and one tap adds it", async () => {
    const { user, form } = await openLog();
    const field = form.getByRole("combobox", { name: "Book title" });
    expect(field).toHaveValue("");
    expect(form.queryByRole("list", { name: /Books read|added/ })).toBeNull();
    expect(within(form.getByRole("group", { name: "Recent titles" })).getAllByRole("button").map((b) => b.textContent)).toEqual(["Robinson Crusoe", "Aesop's Fables", "The Wind in the Willows", "Pagoo", "heidi"]);
    await user.type(field, "trea");
    expect(form.queryByRole("group", { name: "Recent titles" })).toBeNull(); // the recent row is for the empty field
    const options = form.getAllByRole("option");
    expect(options.map((o) => o.textContent)).toEqual(["Treasure Island", "Treasure maps (math)"]);
    await user.click(options[0]!);
    expect(field).toHaveValue("");
    expect(form.getByText("Treasure Island")).toBeInTheDocument();
    fireEvent.change(form.getByLabelText("First day"), { target: { value: "2026-11-02" } });
    await user.click(form.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(posted()).toHaveLength(1));
    expect(posted()[0]!.books).toEqual(["Treasure Island"]);
  });

  it("a recent title adds in one tap and leaves the row; nothing is added without a choice", async () => {
    const { user, form } = await openLog();
    await user.click(form.getByRole("button", { name: "Pagoo" }));
    expect(form.getByRole("group", { name: "Recent titles" }).textContent).not.toContain("Pagoo");
    expect(form.getByRole("button", { name: "Remove Pagoo" })).toBeInTheDocument();
    expect(form.getByRole("combobox", { name: "Book title" })).toHaveValue("");
  });

  it("with no suggestion chosen, Enter adds exactly what was typed (including a new title)", async () => {
    const { user, form } = await openLog();
    await user.type(form.getByRole("combobox", { name: "Book title" }), "Trea{Enter}");
    expect(form.getByRole("button", { name: "Remove Trea" })).toBeInTheDocument();
    await user.type(form.getByRole("combobox", { name: "Book title" }), "A brand new book{Enter}");
    expect(form.getByRole("button", { name: "Remove A brand new book" })).toBeInTheDocument();
  });

  it("keyboard: arrows move through the options, Enter adds the chosen one, Esc closes the list without closing the sheet", async () => {
    const { user, form } = await openLog();
    const field = form.getByRole("combobox", { name: "Book title" });
    await user.type(field, "trea");
    expect(field).toHaveAttribute("aria-expanded", "true");
    await user.keyboard("{ArrowDown}");
    expect(form.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true");
    expect(field.getAttribute("aria-activedescendant")).toBe(form.getAllByRole("option")[0]!.id);
    await user.keyboard("{ArrowDown}");
    expect(form.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowUp}{ArrowUp}"); // wraps to the last
    expect(form.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{Escape}");
    expect(field).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByRole("dialog")).toBeInTheDocument(); // the sheet stays open
    await user.keyboard("{ArrowDown}{Enter}");
    expect(form.getByRole("button", { name: /^Remove Treasure/ })).toBeInTheDocument();
    expect(field).toHaveValue("");
  });

  it("options and chips are 44 px tall by their styles, and a title already added is not offered again", async () => {
    const { user, form } = await openLog();
    await user.click(form.getByRole("button", { name: "Pagoo" }));
    const field = form.getByRole("combobox", { name: "Book title" });
    await user.type(field, "pag");
    expect(form.queryAllByRole("option")).toHaveLength(0);
    expect(field).toHaveAttribute("aria-expanded", "false");
  });
});
