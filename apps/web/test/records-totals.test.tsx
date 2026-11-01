/** S9-08: Records totals for a range: tracked fields only, hours by subject, that range's entries, the wording, the empty state. */
import { readFileSync } from "node:fs";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { fireEvent } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { FamilySettings, LogFields, LogSetup, RecordEntry, RecordTotals, Subject, ZoomViews } from "../src/api/types";
import { NO_FIELDS } from "../src/features/records/logSetup";
import { rangeOptions } from "../src/features/records/ranges";
import { bigNumbers } from "../src/features/records/Totals";
import { RECORDS_WORDING } from "../src/features/records/wording";
import { fakeApi } from "./helpers/fake-api";
import { daysOf } from "./helpers/entry-days";
import { renderAt } from "./render";

const KIDS = [{ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false }, { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false }];
const sub = (id: string, name: string): Subject => ({ id, name, color: null, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null });
const SUBJECTS = [sub("math", "Math"), sub("read", "Reading")];
const ASSIGNMENTS = [{ id: "a1", subjectId: "math", title: "Math 5", startDate: "2026-08-31", endDate: "2027-05-28", childIds: ["c1"], archived: false }];
const NONE: ZoomViews = { hidden: [], custom: [] };
const totals = (over: Partial<RecordTotals> = {}): RecordTotals => ({ from: null, to: null, childId: null, entries: 1, partialEntries: 0, schoolDays: 5, perChild: [], totalMinutes: 330, coreMinutes: 210, nonCoreMinutes: 120, homeMinutes: 90, awayMinutes: 30, books: ["Heidi"], bySubject: [{ subjectId: "math", minutes: 210 }, { subjectId: "read", minutes: 120 }], ...over });
const entry = (over: Partial<RecordEntry> = {}): RecordEntry => ({ id: "e1", childId: "c1", startDate: "2026-11-02", endDate: "2026-11-06", countsSchoolDay: true, schoolDays: 5, countedDays: daysOf(over.startDate ?? "2026-11-02", over.endDate ?? "2026-11-06"), subjectMinutes: { math: 210, read: 120 }, totalMinutes: null, homeMinutes: null, awayMinutes: null, notes: null, books: [], ...over });
const ALLF: LogFields = { subjectHours: true, coreSplit: true, totalHours: false, schoolDays: true, homeAway: true, notes: false, books: true };
const setupOf = (fields: LogFields): LogSetup => ({ template: "custom", fields });
const family = (logSetup: LogSetup, zoomViews: ZoomViews = NONE): FamilySettings => ({ name: "F", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", weekStartLocked: false, zoomViews, logSetup });
const totalsCalls = () => fakeApi.calls.filter((c) => c.path.startsWith("/api/records/totals")).map((c) => c.path);

function stub(fields: LogFields, entries: RecordEntry[] = [entry()], zoom: ZoomViews = NONE) {
  fakeApi.on("GET /api/family", 200, family(setupOf(fields), zoom));
  fakeApi.on("GET /api/subjects", 200, SUBJECTS);
  fakeApi.on("GET /api/children", 200, KIDS);
  fakeApi.on("GET /api/assignments", 200, ASSIGNMENTS);
  fakeApi.on("GET /api/log-entries", 200, entries);
  fakeApi.on("GET /api/records/totals", (_b, _p, q) => [200, totals({ from: q.get("from"), to: q.get("to"), childId: q.get("childId") })]);
}
beforeEach(() => { localStorage.clear(); stub(ALLF); });

describe("ranges (pure)", () => {
  const input = { views: NONE, assignments: ASSIGNMENTS as never, today: "2026-11-01", weekStart: "mon" as const };
  it("This week, Year, Fall and Spring from the plan's year", () => {
    expect(rangeOptions(input).map((o) => [o.label, o.start, o.end])).toEqual([
      ["This week", "2026-10-26", "2026-11-01"], ["Year", "2026-08-31", "2027-05-28"], ["Fall", "2026-08-31", "2026-12-31"], ["Spring", "2027-01-01", "2027-05-28"],
    ]);
  });
  it("uses the names and dates the family gave Fall and Spring, its own terms, and leaves out a hidden half", () => {
    const views: ZoomViews = { hidden: ["spring"], overrides: { fall: { name: "Term 1", start: "2026-08-17", end: "2026-12-18" } }, custom: [{ id: "t", name: "Co-op", start: "2026-09-01", end: "2026-10-01" }] };
    expect(rangeOptions({ ...input, views }).map((o) => [o.label, o.start, o.end])).toEqual([
      ["This week", "2026-10-26", "2026-11-01"], ["Year", "2026-08-31", "2027-05-28"], ["Term 1", "2026-08-17", "2026-12-18"], ["Co-op", "2026-09-01", "2026-10-01"],
    ]);
  });
  it("no Fall or Spring when the year does not span New Year, and a calendar year with no plan", () => {
    const short = [{ ...ASSIGNMENTS[0]!, startDate: "2026-09-01", endDate: "2026-12-18" }] as never;
    expect(rangeOptions({ ...input, assignments: short }).map((o) => o.label)).toEqual(["This week", "Year"]);
    expect(rangeOptions({ ...input, assignments: [] })[1]).toMatchObject({ start: "2026-01-01", end: "2026-12-31" });
  });
});

describe("the big numbers (pure): tracked fields only", () => {
  const t = totals();
  it("shows each tracked field and nothing else", () => {
    expect(bigNumbers(t, ALLF).map((n) => [n.label, n.value])).toEqual([["school days", "5"], ["hours", "5 h 30 m"], ["core hours", "3 h 30 m"], ["non-core hours", "2 h"], ["hours at home", "1 h 30 m"], ["hours away", "30 m"], ["book", "1"]]);
    expect(bigNumbers(t, { ...NO_FIELDS, schoolDays: true }).map((n) => n.label)).toEqual(["school days"]);
    expect(bigNumbers(t, { ...NO_FIELDS, schoolDays: true, totalHours: true }).map((n) => n.label)).toEqual(["school days", "hours"]);
    expect(bigNumbers(t, { ...NO_FIELDS, notes: true })).toEqual([]);
  });
});

describe("Records with entries", () => {
  it("opens on the Year for the first child's... All children, with totals, hours by subject, the entry and the wording", async () => {
    renderAt("/records");
    const nums = within(await screen.findByRole("group", { name: "Totals" }));
    expect(nums.getByText("5 h 30 m")).toBeInTheDocument();
    expect(nums.getByText("core hours")).toBeInTheDocument();
    const subjects = within(screen.getByRole("region", { name: "Hours by subject" }));
    expect(subjects.getByText("Math")).toBeInTheDocument();
    expect(subjects.getByText("3 h 30 m")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Year" })).toHaveAttribute("aria-pressed", "true");
    expect(await screen.findByText("Aug 31, 2026 – May 28, 2027")).toBeInTheDocument();
    expect(totalsCalls().at(-1)).toBe("/api/records/totals?from=2026-08-31&to=2027-05-28");
    expect(within(screen.getByRole("list", { name: "Log entries" })).getByText("5 school days · Math 3 h 30 m, Reading 2 h")).toBeInTheDocument();
    expect(screen.getByText(RECORDS_WORDING)).toBeInTheDocument();
    expect(RECORDS_WORDING).toBe("Made for your state records. It doesn't guarantee your homeschool meets every state requirement; check your state's rules.");
  });

  it("a range chip changes the request and the entries listed; a child narrows both", async () => {
    stub(ALLF, [entry(), entry({ id: "e2", childId: "c2", startDate: "2026-09-07", endDate: "2026-09-07", schoolDays: 1 })]);
    const user = userEvent.setup();
    renderAt("/records");
    await screen.findByRole("group", { name: "Totals" });
    expect(within(screen.getByRole("list", { name: "Log entries" })).getAllByRole("listitem")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "This week" }));
    await waitFor(() => expect(totalsCalls().at(-1)).toBe("/api/records/totals?from=2026-10-26&to=2026-11-01"));
    expect(await screen.findByText("Nothing logged in these dates.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Fall" }));
    await waitFor(() => expect(totalsCalls().at(-1)).toBe("/api/records/totals?from=2026-08-31&to=2026-12-31"));
    await user.click(screen.getByRole("button", { name: "Margaret" }));
    await waitFor(() => expect(totalsCalls().at(-1)).toBe("/api/records/totals?from=2026-08-31&to=2026-12-31&childId=c2"));
    const list = await screen.findByRole("list", { name: "Log entries" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(1);
    expect(within(list).getByText(/Sep 7, 2026 · Margaret/)).toBeInTheDocument();
  });

  it("custom dates take two DateFields and ask for exactly those", async () => {
    const user = userEvent.setup();
    renderAt("/records");
    await screen.findByRole("group", { name: "Totals" });
    await user.click(screen.getByRole("button", { name: "Custom dates" }));
    expect(await screen.findByText("Pick the first and last day.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-11-02" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-11-13" } });
    await waitFor(() => expect(totalsCalls().at(-1)).toBe("/api/records/totals?from=2026-11-02&to=2026-11-13"));
    expect(await screen.findByText("Nov 2 – Nov 13, 2026")).toBeInTheDocument();
  });

  it("the family's own names for Fall and its terms are the chips", async () => {
    stub(ALLF, [entry()], { hidden: [], overrides: { fall: { name: "Term 1", start: "2026-08-17", end: "2026-12-18" } }, custom: [{ id: "t", name: "Co-op", start: "2026-09-01", end: "2026-10-01" }] });
    renderAt("/records");
    const chips = within(await screen.findByRole("group", { name: "Range" }));
    expect(chips.getAllByRole("button").map((b) => b.textContent)).toEqual(["This week", "Year", "Term 1", "Spring", "Co-op", "Custom dates"]);
  });

  it("shows only the tracked fields: a days-only log has one number and no subject hours", async () => {
    stub({ ...NO_FIELDS, schoolDays: true });
    renderAt("/records");
    const nums = within(await screen.findByRole("group", { name: "Totals" }));
    expect(nums.getAllByText(/days|hours|books?/).map((e) => e.textContent)).toEqual(["days any child did school"]);
    expect(screen.queryByRole("region", { name: "Hours by subject" })).toBeNull();
  });
});

describe("school days are real days (S9b-01)", () => {
  it("one child says school days; All children says days any child did school, with each child's own count; a part entry says so", async () => {
    stub(ALLF, [entry({ startDate: "2026-11-02", endDate: "2026-11-06" })]);
    fakeApi.on("GET /api/records/totals", (_b, _p, q) => [200, totals({ childId: q.get("childId"), perChild: [{ childId: "c1", schoolDays: 4 }, { childId: "c2", schoolDays: 3 }], schoolDays: 5, partialEntries: 1 })]);
    const user = userEvent.setup();
    renderAt("/records");
    const nums = within(await screen.findByRole("group", { name: "Totals" }));
    expect(nums.getByText("days any child did school")).toBeInTheDocument();
    expect(screen.getByText("Frank 4 days · Margaret 3 days")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Frank" }));
    expect(await within(await screen.findByRole("group", { name: "Totals" })).findByText("school days")).toBeInTheDocument();
    expect(screen.queryByText(/Frank 4 days/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Custom dates" }));
    fireEvent.change(screen.getByLabelText("From"), { target: { value: "2026-11-04" } });
    fireEvent.change(screen.getByLabelText("To"), { target: { value: "2026-11-05" } });
    expect(await screen.findByText("Part of an entry from Nov 2 to Nov 6")).toBeInTheDocument();
  });
});

describe("Records with nothing logged", () => {
  it("says one line and offers Log; the wording is still there", async () => {
    stub(ALLF, []);
    renderAt("/records");
    expect(await screen.findByText("Nothing logged yet.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Log" })).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Totals" })).toBeNull();
    expect(screen.getByText(RECORDS_WORDING)).toBeInTheDocument();
  });
});

describe("a phone at 360 px", () => {
  it("numbers wrap in a grid and chips are 44 px", () => {
    const css = readFileSync("src/features/records/records.css", "utf8") + readFileSync("src/ui/soft-paper.css", "utf8");
    expect(css).toMatch(/\.big-numbers \{[^}]*grid-template-columns: repeat\(auto-fit/);
    expect(css).toMatch(/\.chip \{[^}]*min-height: 44px/);
    expect(css).toMatch(/\.records-lead \.btn-link \{ min-height: 44px/);
  });
});
