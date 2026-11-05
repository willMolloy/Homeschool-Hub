/** S16-05: Records cards that mean something: each child's own school days, Books finished from completions, typed books as a list. */
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import type { Assignment, Child, FamilySettings, LogFields, RecordEntry, RecordTotals, Subject } from "../src/api/types";
import { booksFinished, schoolDaysOf } from "../src/features/records/booksFinished";
import { buildTable } from "../src/features/records/exportData";
import { buildTermReview } from "../src/features/review/termReview";
import { NO_FIELDS } from "../src/features/records/logSetup";
import { DEMO_ME, fakeApi } from "./helpers/fake-api";
import { withCovered } from "./helpers/recordEntry";
import { renderAt } from "./render";

const KIDS: Child[] = [{ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false }, { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false }];
const SUBJECTS = [{ id: "lit", name: "Literature", color: null, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null }, { id: "math", name: "Math", color: null, sortOrder: 1, archived: false, defaultWeight: null, defaultWeekdays: null }] as Subject[];
const A = (over: Partial<Assignment>): Assignment => ({ id: "a", subjectId: "lit", title: "Book", unitType: "pages", totalUnits: 200, weightPerUnit: null, startDate: "2026-09-01", endDate: "2026-10-30", childIds: ["c1"], archived: false, weekdays: null, endedAs: "finished", endedOn: "2026-10-30", ...over }) as Assignment;
const ASSIGNMENTS: Assignment[] = [
  A({ id: "ti", title: "Treasure Island", endedOn: "2026-10-02" }),
  A({ id: "hobbit", title: "The Hobbit", unitType: "chapters", endedOn: "2026-11-13" }),
  A({ id: "garden", title: "The Secret Garden", unitType: "chapters", childIds: ["c2"], endedOn: "2026-10-30" }),
  A({ id: "times", title: "Times tables", subjectId: "math", unitType: "lessons", childIds: ["c2"], endedOn: "2026-10-30" }), // not a reading unit
  A({ id: "stopped", title: "Stopped book", endedAs: "stopped" }),
  A({ id: "open", title: "Still reading", endedAs: null, endedOn: null }),
  A({ id: "old", title: "Last year's book", endedOn: "2025-05-01" }),
  A({ id: "year", title: "Math 5", subjectId: "math", unitType: "lessons", startDate: "2026-08-31", endDate: "2027-05-28", endedAs: null, endedOn: null }), // sets the school year
  A({ id: "arch", title: "Archived book", archived: true }),
];
const ALLF: LogFields = { ...NO_FIELDS, schoolDays: true, subjectHours: true, books: true };
const RANGE = { start: "2026-08-31", end: "2027-05-28" };
const e = (over: Partial<RecordEntry>): RecordEntry => withCovered({ id: "e", childId: "c1", startDate: "2026-11-02", endDate: "2026-11-06", countsSchoolDay: true, schoolDays: 5, subjectMinutes: { lit: 60 }, totalMinutes: null, homeMinutes: null, awayMinutes: null, notes: null, books: [], ...over });
const ENTRIES = [
  e({ id: "1", books: ["Heidi", "treasure island"] }),
  e({ id: "2", startDate: "2026-11-09", endDate: "2026-11-10", schoolDays: 2, books: [" Heidi "] }),
  e({ id: "3", childId: "c2", startDate: "2026-11-02", endDate: "2026-11-04", schoolDays: 3, books: ["Pagoo"] }),
  e({ id: "4", childId: "c2", startDate: "2026-11-03", endDate: "2026-11-03", schoolDays: 1 }), // a day Margaret already has
];
const totals = (q: URLSearchParams): RecordTotals => ({ from: q.get("from"), to: q.get("to"), childId: q.get("childId"), entries: 4, schoolDays: 8, totalMinutes: 60, coreMinutes: 0, nonCoreMinutes: 0, homeMinutes: 0, awayMinutes: 0,
  books: q.get("childId") === "c2" ? ["Pagoo"] : ["Heidi", "treasure island", "Pagoo"], bySubject: [{ subjectId: "lit", minutes: 60 }] });
const family = (fields: LogFields): FamilySettings => ({ name: "F", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", weekStartLocked: false, zoomViews: { hidden: [], custom: [] }, logSetup: { template: "custom", fields } } as FamilySettings);

function stub(fields: LogFields = ALLF, assignments = ASSIGNMENTS) {
  fakeApi.on("GET /api/family", 200, family(fields));
  fakeApi.on("GET /api/subjects", 200, SUBJECTS);
  fakeApi.on("GET /api/children", 200, KIDS);
  fakeApi.on("GET /api/assignments", 200, assignments);
  fakeApi.on("GET /api/log-entries", 200, ENTRIES);
  fakeApi.on("GET /api/records/totals", (_b, _p, q) => [200, totals(q)]);
}
beforeEach(() => { localStorage.clear(); stub(); });

describe("the definitions (pure)", () => {
  it("Books finished counts only reading assignments (pages, chapters) with ended_as finished and ended_on in range", () => {
    expect(booksFinished(ASSIGNMENTS, RANGE, null).map((b) => b.title)).toEqual(["Treasure Island", "The Secret Garden", "The Hobbit"]);
    expect(booksFinished(ASSIGNMENTS, RANGE, ["c1"]).map((b) => [b.title, b.finishedOn])).toEqual([["Treasure Island", "2026-10-02"], ["The Hobbit", "2026-11-13"]]);
    expect(booksFinished(ASSIGNMENTS, RANGE, ["c2"]).map((b) => b.title)).toEqual(["The Secret Garden"]); // Times tables is lessons
    expect(booksFinished(ASSIGNMENTS, { start: "2026-10-01", end: "2026-10-31" }, null).map((b) => b.title)).toEqual(["Treasure Island", "The Secret Garden"]);
    expect(booksFinished(ASSIGNMENTS, { start: "2026-10-02", end: "2026-10-02" }, null)).toHaveLength(1); // both ends count
  });
  it("a book shared by two children is one book", () => {
    expect(booksFinished([A({ childIds: ["c1", "c2"] })], RANGE, null)).toHaveLength(1);
  });
  it("school days are each child's own, and a day held by two entries counts once", () => {
    expect(schoolDaysOf(ENTRIES, "c1", RANGE)).toBe(7);
    expect(schoolDaysOf(ENTRIES, "c2", RANGE)).toBe(3);
    expect(schoolDaysOf(ENTRIES, "c1", { start: "2026-11-05", end: "2026-11-09" })).toBe(3); // Thu, Fri, Mon
  });
});

describe("Records (S16-05)", () => {
  it("All children: the school days card gives each child's own count, with no 'any child' wording", async () => {
    renderAt("/records");
    const nums = within(await screen.findByRole("group", { name: "Totals" }));
    expect(nums.getByText("Frank 7")).toBeInTheDocument();
    expect(nums.getByText("Margaret 3")).toBeInTheDocument();
    expect(nums.getByText("school days")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/any child/i);
  });

  it("one child: 'school days' and that child's number from the totals", async () => {
    const user = userEvent.setup();
    renderAt("/records");
    await screen.findByRole("group", { name: "Totals" });
    await user.click(screen.getByRole("button", { name: "Frank" }));
    const nums = within(await screen.findByRole("group", { name: "Totals" }));
    await waitFor(() => expect(nums.queryByText("Frank 7")).toBeNull());
    expect(nums.getByText("school days")).toBeInTheDocument();
  });

  it("Books finished is a card from completions; tapping it lists the titles and finish dates", async () => {
    const user = userEvent.setup();
    renderAt("/records");
    const card = await screen.findByRole("button", { name: /3\s*books finished/ });
    await user.click(card);
    const list = await screen.findByRole("list", { name: "Books finished" });
    expect(within(list).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Treasure IslandOct 2", "The Secret GardenOct 30", "The HobbitNov 13"]);
    // the typed titles are not counted here
    expect(within(list).queryByText("Heidi")).toBeNull();
  });

  it("per child: Frank's card counts his finished books only", async () => {
    const user = userEvent.setup();
    renderAt("/records?child=c1");
    expect(await screen.findByRole("button", { name: /2\s*books finished/ })).toBeInTheDocument();
    void user;
  });

  it("the typed titles are a short list below the totals, de-duplicated, and not a count card", async () => {
    renderAt("/records");
    const section = await screen.findByRole("region", { name: "Books mentioned in your log" });
    expect(within(section).getAllByRole("listitem").map((li) => li.textContent)).toEqual(["Heidi", "treasure island", "Pagoo"]);
    const nums = within(screen.getByRole("group", { name: "Totals" }));
    expect(nums.queryByText(/^books?$/)).toBeNull();
  });

  it("hidden when books are not tracked, and never a zero when nothing finished", async () => {
    stub({ ...ALLF, books: false });
    const first = renderAt("/records");
    await screen.findByRole("group", { name: "Totals" });
    expect(screen.queryByRole("button", { name: /finished/ })).toBeNull();
    expect(screen.queryByRole("region", { name: "Books mentioned in your log" })).toBeNull();
    first.unmount();
    stub(ALLF, []);
    renderAt("/records");
    await screen.findByRole("group", { name: "Totals" });
    expect(screen.queryByRole("button", { name: /finished/ })).toBeNull();
  });

  it("a viewer sees the same cards and can open the list (read-only)", async () => {
    fakeApi.on("GET /api/me", 200, { ...DEMO_ME, role: "viewer" });
    const user = userEvent.setup();
    renderAt("/records");
    await user.click(await screen.findByRole("button", { name: /3\s*books finished/ }));
    await screen.findByRole("list", { name: "Books finished" });
    expect(fakeApi.calls.filter((c) => c.method !== "GET")).toEqual([]);
  });
});

describe("Term in review and the CSV use the same definition (S16-05)", () => {
  it("Term in review's books are the child's finished reading assignments in the range", () => {
    const r = buildTermReview({ child: KIDS[0]!, range: RANGE, assignments: ASSIGNMENTS, subjects: SUBJECTS, fields: ALLF, totals: totals(new URLSearchParams("childId=c1")) });
    expect(r.books).toEqual(booksFinished(ASSIGNMENTS, RANGE, ["c1"]).map((b) => b.title));
    expect(r.books).toEqual(["Treasure Island", "The Hobbit"]); // the typed "Heidi" is not here
    const off = buildTermReview({ child: KIDS[0]!, range: RANGE, assignments: ASSIGNMENTS, subjects: SUBJECTS, fields: { ...ALLF, books: false }, totals: totals(new URLSearchParams("childId=c1")) });
    expect(off.books).toEqual([]);
  });

  const input = (over = {}) => ({ entries: ENTRIES, assignments: ASSIGNMENTS, children: KIDS, subjects: SUBJECTS, fields: ALLF, start: RANGE.start, end: RANGE.end, childIds: ["c1", "c2"], mode: "totals" as const, columns: ["schoolDays", "booksFinished", "books"] as never, ...over });
  it("a Totals file has Books finished (from completions) and, ticked, Books read (the typed list)", () => {
    const t = buildTable(input());
    expect(t.header).toEqual(["From", "To", "Child", "School days", "Books finished", "Books read"]);
    expect(t.rows[0]!.slice(2)).toEqual(["Frank", 7, "Treasure Island; The Hobbit", "Heidi; treasure island"]);
    expect(t.rows[1]!.slice(2)).toEqual(["Margaret", 3, "The Secret Garden", "Pagoo"]);
    expect(buildTable(input({ columns: ["schoolDays"] })).header).toEqual(["From", "To", "Child", "School days"]); // Books read only if ticked
  });
  it("Each entry files have no Books finished column (it belongs to a child's range, not an entry)", () => {
    expect(buildTable(input({ mode: "entries", columns: ["booksFinished", "books"] })).header).not.toContain("Books finished");
  });
});
