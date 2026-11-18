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

describe("books are not on the log (S20-05)", () => {
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

  it("has nowhere to type a book, and a save does not send books", async () => {
    const { user, form } = await openLog();
    expect(form.queryByLabelText("Book title")).toBeNull();
    expect(form.queryByRole("group", { name: "Books read" })).toBeNull();
    fireEvent.change(form.getByLabelText("Day"), { target: { value: "2026-11-02" } });
    await user.click(form.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(posted()).toHaveLength(1));
    expect(posted()[0]).not.toHaveProperty("books");
  });
});
