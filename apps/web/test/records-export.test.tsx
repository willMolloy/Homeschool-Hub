/** S9-11: export with chosen columns and dates: CSV (columns follow the ticks, empty ones dropped, formulas escaped, wording first) and the printable summary. */
import { readFileSync } from "node:fs";
import { screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FamilySettings, LogFields, RecordEntry, Subject } from "../src/api/types";
import { NO_FIELDS } from "../src/features/records/logSetup";
import { availableColumns, shareInRange, buildCsv, buildTable, csvCell, csvFileName, exportEntries, hoursText, totalsFor, type ExportInput } from "../src/features/records/exportData";
import { RECORDS_WORDING } from "../src/features/records/wording";
import { fakeApi } from "./helpers/fake-api";
import { daysOf } from "./helpers/entry-days";
import { renderAt } from "./render";

const KIDS = [{ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false }, { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false }];
const SUBJECTS: Subject[] = [
  { id: "math", name: "Math", color: null, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null, core: true },
  { id: "art", name: "Art", color: null, sortOrder: 1, archived: false, defaultWeight: null, defaultWeekdays: null, core: false },
  { id: "bad", name: "=HYPERLINK(\"x\")", color: null, sortOrder: 2, archived: false, defaultWeight: null, defaultWeekdays: null },
];
const e = (over: Partial<RecordEntry>): RecordEntry => ({ id: "e", childId: "c1", startDate: "2026-11-02", endDate: "2026-11-02", countsSchoolDay: true, schoolDays: 1, countedDays: daysOf(over.startDate ?? "2026-11-02", over.endDate ?? over.startDate ?? "2026-11-02", over.countsSchoolDay ?? true), subjectMinutes: {}, totalMinutes: null, homeMinutes: null, awayMinutes: null, notes: null, books: [], ...over });
const ENTRIES = [
  e({ id: "1", startDate: "2026-11-02", endDate: "2026-11-06", schoolDays: 5, subjectMinutes: { math: 210, art: 90 }, notes: "=HYPERLINK(\"http://x\",\"hi\")", books: ["Heidi"] }),
  e({ id: "2", childId: "c2", startDate: "2026-11-02", endDate: "2026-11-06", schoolDays: 5, subjectMinutes: { math: 120 }, homeMinutes: 60, notes: "plain, with comma" }),
  e({ id: "3", startDate: "2026-12-14", endDate: "2026-12-14", schoolDays: 1, subjectMinutes: { math: 60 }, notes: "+1 note" }),
];
const ALLF: LogFields = { subjectHours: true, coreSplit: true, totalHours: false, schoolDays: true, homeAway: true, notes: true, books: true };
const COLS = ["schoolDays", "subjectHours", "totalHours", "coreSplit", "homeAway", "notes", "books"] as const;
const input = (over: Partial<ExportInput> = {}): ExportInput => ({ entries: ENTRIES, children: KIDS, subjects: SUBJECTS, fields: ALLF, start: "2026-08-17", end: "2026-12-18", childIds: ["c1"], mode: "entries", columns: [...COLS], ...over });
const readBlob = (b: Blob) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsText(b); });
const lines = (csv: string) => csv.trimEnd().split("\r\n");

describe("csvCell: spreadsheet safety", () => {
  it("prefixes ' to text starting with = + - @ (or a tab or return), and quotes commas, quotes and line breaks", () => {
    for (const bad of ["=HYPERLINK(\"x\")", "+1", "-2", "@SUM(A1)", "\tcmd", "\rcmd"]) expect(csvCell(bad).replace(/^"/, "")).toMatch(/^'/);
    expect(csvCell("=1+1")).toBe("'=1+1");
    expect(csvCell("a, b")).toBe('"a, b"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell("two\nlines")).toBe('"two\nlines"');
    expect(csvCell("=A,B")).toBe("\"'=A,B\"");
    expect(csvCell(5)).toBe("5");
    expect(csvCell(null)).toBe("");
    expect(csvCell("Heidi")).toBe("Heidi");
  });
  it("a negative number is a number, never escaped (none exist, but the rule is only for text)", () => {
    expect(csvCell(-1)).toBe("-1");
  });
});

describe("the columns on offer", () => {
  it("only fields the family tracks; notes only entry by entry", () => {
    expect(availableColumns({ ...NO_FIELDS, schoolDays: true }).map((c) => c.key)).toEqual(["schoolDays"]);
    expect(availableColumns(ALLF).map((c) => c.key)).toEqual([...COLS]);
    expect(availableColumns(ALLF, "totals").map((c) => c.key)).not.toContain("notes");
    expect(availableColumns({ ...NO_FIELDS, totalHours: true, schoolDays: true }).map((c) => c.key)).toEqual(["schoolDays", "totalHours"]);
  });
});

describe("the CSV", () => {
  it("is just the ticked columns: Fall for Frank with only school days and core / non-core hours", () => {
    const csv = buildCsv(input({ columns: ["schoolDays", "coreSplit"] }));
    expect(lines(csv)).toEqual([
      RECORDS_WORDING,
      "Date,Last day,Child,School days,Core hours,Non-core hours",
      "2026-11-02,2026-11-06,Frank,5,3.5,1.5",
      "2026-12-14,,Frank,1,1,",
    ]);
  });

  it("the wording is the first line, exactly", () => {
    expect(lines(buildCsv(input()))[0]).toBe(RECORDS_WORDING);
    expect(RECORDS_WORDING).toContain("Made for your state records.");
  });

  it("a formula in a note, a subject name or a book exports safely", () => {
    const csv = buildCsv(input({ columns: ["subjectHours", "notes", "books"], entries: [e({ subjectMinutes: { bad: 60 }, notes: "=HYPERLINK(\"http://x\",\"hi\")", books: ["@Evil", "+Plus"] })] }));
    const [, head, row] = lines(csv);
    expect(head).toBe(`Date,Child,"'=HYPERLINK(""x"") (hours)",Notes,Books read`);
    expect(row).toBe(`2026-11-02,Frank,1,"'=HYPERLINK(""http://x"",""hi"")",'@Evil; +Plus`);
    expect(csv).not.toMatch(/(^|,|\r\n)"?[=+\-@]/);
  });

  it("columns with nothing in the range are left out (all data stays stored)", () => {
    const t = buildTable(input({ columns: [...COLS], entries: ENTRIES.filter((x) => x.id === "3"), childIds: ["c1"] }));
    expect(t.header).toEqual(["Date", "Child", "School days", "Math (hours)", "Total hours", "Core hours", "Notes"]); // no Last day, Art, non-core, home, away, books
    expect(buildTable(input({ columns: ["homeAway"], childIds: ["c1"] })).header).toEqual(["Date", "Last day", "Child"]); // Frank has no home or away hours
    expect(buildTable(input({ columns: ["homeAway"], childIds: ["c2"] })).header).toEqual(["Date", "Last day", "Child", "Hours at home"]);
    expect(buildTable(input({ columns: ["schoolDays"], entries: [e({ countsSchoolDay: false, schoolDays: 0, totalMinutes: 30 })] })).header).toEqual(["Date", "Child"]);
  });

  it("an unticked column is not there, and one the family does not track cannot be asked for", () => {
    expect(buildTable(input({ columns: [] })).header).toEqual(["Date", "Last day", "Child"]);
    expect(buildTable(input({ fields: { ...NO_FIELDS, schoolDays: true }, columns: [...COLS] })).header).toEqual(["Date", "Last day", "Child", "School days"]);
  });

  it("covers the chosen dates and children, oldest first; each entry is one row", () => {
    expect(exportEntries(input({ start: "2026-11-01", end: "2026-11-30", childIds: ["c1", "c2"] })).map((x) => x.id)).toEqual(["1", "2"]);
    expect(buildTable(input({ childIds: ["c1", "c2"], columns: ["schoolDays"] })).rows.map((r) => r.slice(0, 3))).toEqual([["2026-11-02", "2026-11-06", "Frank"], ["2026-11-02", "2026-11-06", "Margaret"], ["2026-12-14", "", "Frank"]]);
    expect(buildTable(input({ start: "2027-01-01", end: "2027-01-31" })).rows).toEqual([]);
  });

  it("Totals: one row per child with sums, books once each, and no Notes column", () => {
    const t = buildTable(input({ mode: "totals", childIds: ["c1", "c2"], columns: [...COLS] }));
    expect(t.header).toEqual(["Child", "School days", "Math (hours)", "Art (hours)", "Total hours", "Core hours", "Non-core hours", "Hours at home", "Books read"]);
    expect(t.rows).toEqual([["Frank", 6, "4.5", "1.5", "6", "4.5", "1.5", "", "Heidi"], ["Margaret", 5, "2", "", "2", "2", "", "1", ""]]);
    expect(lines(buildCsv(input({ mode: "totals", columns: ["schoolDays"] }))).slice(1)).toEqual(["Child,School days", "Frank,6"]);
  });

  it("hours are decimal hours; the file is named for the dates", () => {
    expect([hoursText(210), hoursText(20), hoursText(0)]).toEqual(["3.5", "0.33", "0"]);
    expect(csvFileName("2026-08-17", "2026-12-18")).toBe("records-2026-08-17-to-2026-12-18.csv");
    expect(totalsFor([], () => false).schoolDays).toBe(0);
  });
});

function stub(fields = ALLF, entries = ENTRIES) {
  const family: FamilySettings = { name: "F", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", weekStartLocked: false, zoomViews: { hidden: [], custom: [] }, logSetup: { template: "custom", fields } };
  fakeApi.on("GET /api/family", 200, family);
  fakeApi.on("GET /api/subjects", 200, SUBJECTS);
  fakeApi.on("GET /api/children", 200, KIDS);
  fakeApi.on("GET /api/assignments", 200, [{ id: "a1", subjectId: "math", title: "Math 5", startDate: "2026-08-31", endDate: "2027-05-28", childIds: ["c1"], archived: false }]);
  fakeApi.on("GET /api/log-entries", 200, entries);
  fakeApi.on("GET /api/records/totals", 200, { from: null, to: null, childId: null, entries: 1, partialEntries: 0, schoolDays: 1, perChild: [], totalMinutes: 60, coreMinutes: 0, nonCoreMinutes: 0, homeMinutes: 0, awayMinutes: 0, books: [], bySubject: [] });
}

describe("school days in the totals are real days (S9b-01)", () => {
  it("two entries on one day count once, a part of a run counts only its days and the same share of its hours", () => {
    const twice = [e({ id: "a", startDate: "2026-11-02" }), e({ id: "b", startDate: "2026-11-02", subjectMinutes: { math: 30 } })];
    expect(totalsFor(twice, () => false).schoolDays).toBe(1);
    const run = e({ startDate: "2026-11-02", endDate: "2026-11-06", subjectMinutes: { math: 600 } });
    const t = totalsFor([run], (id) => id === "math", { from: "2026-11-04", to: "2026-11-05" });
    expect([t.schoolDays, t.totalMinutes, t.coreMinutes]).toEqual([2, 240, 240]);
    expect(shareInRange(run, { from: "2026-11-04", to: "2026-11-05" })).toBeCloseTo(0.4);
  });
  it("Totals rows cover the entries that overlap the dates", () => {
    const t = buildTable(input({ mode: "totals", start: "2026-11-04", end: "2026-11-05", columns: ["schoolDays", "totalHours"], childIds: ["c1"] }));
    expect(t.rows).toEqual([["Frank", 2, "2"]]);
  });
});

describe("the export sheet", () => {
  let blobs: Blob[] = [];
  let clicked: string[] = [];
  beforeEach(() => {
    blobs = []; clicked = []; stub();
    URL.createObjectURL = vi.fn((b: Blob | MediaSource) => { blobs.push(b as Blob); return "blob:x"; });
    URL.revokeObjectURL = vi.fn();
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function (this: HTMLAnchorElement) { clicked.push(this.download); });
  });
  afterEach(() => vi.restoreAllMocks());

  const open = async (user: ReturnType<typeof userEvent.setup>) => {
    renderAt("/records");
    await user.click(await screen.findByRole("button", { name: "Export" }));
    return within(await screen.findByRole("form", { name: "Export" }));
  };

  it("starts from the Records range and children, offers a tick per tracked field, and downloads exactly those columns", async () => {
    const user = userEvent.setup();
    await user.click((await (async () => { renderAt("/records"); return screen.findByRole("button", { name: "Frank" }); })()));
    await user.click(screen.getByRole("button", { name: "Export" }));
    const form = within(await screen.findByRole("form", { name: "Export" }));
    expect(form.getByLabelText("From")).toHaveValue("Aug 31, 2026");
    expect(form.getByLabelText("To")).toHaveValue("May 28, 2027");
    expect(form.getByRole("button", { name: "Frank" })).toHaveAttribute("aria-pressed", "true");
    expect(form.getByRole("button", { name: "Margaret" })).toHaveAttribute("aria-pressed", "false");
    expect(form.getAllByRole("checkbox").map((c) => c.closest("label")!.textContent)).toEqual(["School days", "Hours by subject", "Total hours", "Core and non-core hours", "Hours at home and away", "Notes", "Books read"]);
    for (const l of ["Hours by subject", "Total hours", "Hours at home and away", "Notes", "Books read"]) await user.click(form.getByRole("checkbox", { name: l }));
    await user.click(form.getByRole("button", { name: "Download CSV" }));
    expect(clicked).toEqual(["records-2026-08-31-to-2027-05-28.csv"]);
    const text = await readBlob(blobs[0]!);
    expect(lines(text)).toEqual([RECORDS_WORDING, "Date,Last day,Child,School days,Core hours,Non-core hours", "2026-11-02,2026-11-06,Frank,5,3.5,1.5", "2026-12-14,,Frank,1,1,"]);
  });

  it("dates, children and Totals are the parent's to change", async () => {
    const user = userEvent.setup();
    const form = await open(user);
    fireEvent.change(form.getByLabelText("From"), { target: { value: "2026-11-01" } });
    fireEvent.change(form.getByLabelText("To"), { target: { value: "2026-11-30" } });
    await user.click(form.getByRole("button", { name: "All children" }));
    await user.click(form.getByRole("button", { name: "Totals" }));
    expect(form.queryByRole("checkbox", { name: "Notes" })).toBeNull();
    await user.click(form.getByRole("button", { name: "Download CSV" }));
    const text = await readBlob(blobs[0]!);
    expect(lines(text)[1]).toMatch(/^Child,School days,Math \(hours\)/);
    expect(lines(text).slice(2).map((l) => l.split(",")[0])).toEqual(["Frank", "Margaret"]);
    expect(clicked[0]).toBe("records-2026-11-01-to-2026-11-30.csv");
  });

  it("cannot export with no child or backwards dates", async () => {
    const user = userEvent.setup();
    const form = await open(user);
    await user.click(form.getByRole("button", { name: "All children" }));
    await user.click(form.getByRole("button", { name: "All children" })); // all on, then off
    expect(form.getByRole("alert")).toHaveTextContent("Pick the dates and at least one child.");
    expect(form.getByRole("button", { name: "Download CSV" })).toBeDisabled();
    expect(form.getByRole("button", { name: "Print summary" })).toBeDisabled();
  });

  it("a family that tracks only school days is offered only that column", async () => {
    stub({ ...NO_FIELDS, schoolDays: true });
    const user = userEvent.setup();
    const form = await open(user);
    expect(form.getAllByRole("checkbox").map((c) => c.closest("label")!.textContent)).toEqual(["School days"]);
  });

  it("Print summary renders one page per child with the totals and the wording, then prints", async () => {
    const user = userEvent.setup();
    const print = vi.fn();
    window.print = print;
    const form = await open(user);
    await user.click(form.getByRole("button", { name: "All children" }));
    await user.click(form.getByRole("button", { name: "Print summary" }));
    await waitFor(() => expect(print).toHaveBeenCalled());
    const pages = [...document.querySelectorAll(".print-summary .print-page")];
    expect(pages.map((p) => p.querySelector("h1")!.textContent)).toEqual(["Frank", "Margaret"]);
    expect(pages[0]!.textContent).toContain("School days");
    expect(pages[0]!.textContent).toContain(RECORDS_WORDING);
    expect(pages[1]!.textContent).toContain(RECORDS_WORDING);
    expect(document.body.classList.contains("printing")).toBe(true);
    fireEvent(window, new Event("afterprint"));
    await waitFor(() => expect(document.body.classList.contains("printing")).toBe(false));
  });
});

describe("the print stylesheet", () => {
  it("hides the app, shows the summary, and breaks the page after each child", () => {
    const css = readFileSync("src/features/records/records.css", "utf8");
    expect(css).toMatch(/@media print/);
    expect(css).toMatch(/body\.printing > \*:not\(\.print-summary\) \{ display: none/);
    expect(css).toMatch(/\.print-page \{ break-after: page/);
    expect(css).toMatch(/\.print-summary \{ display: none; \}/);
  });
});
