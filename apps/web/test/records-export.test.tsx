/** S9-11: export with chosen columns and dates: CSV (columns follow the ticks, empty ones dropped, formulas escaped, wording first) and the printable summary. */
import { readFileSync } from "node:fs";
import { screen, waitFor, within, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FamilySettings, LogFields, RecordEntry, Subject } from "../src/api/types";
import { NO_FIELDS } from "../src/features/records/logSetup";
import { PER_ENTRY_DAYS_NOTE, availableColumns, buildCsv, buildTable, csvBlob, csvCell, csvFileName, exportEntries, hoursText, totalsFor, type ExportInput } from "../src/features/records/exportData";
import { RECORDS_WORDING } from "../src/features/records/wording";
import { fakeApi } from "./helpers/fake-api";
import { renderAt } from "./render";
import { withCovered } from "./helpers/recordEntry";

const KIDS = [{ id: "c1", name: "Frank", color: null, sortOrder: 0, archived: false }, { id: "c2", name: "Margaret", color: null, sortOrder: 1, archived: false }];
const SUBJECTS: Subject[] = [
  { id: "math", name: "Math", color: null, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null, core: true },
  { id: "art", name: "Art", color: null, sortOrder: 1, archived: false, defaultWeight: null, defaultWeekdays: null, core: false },
  { id: "bad", name: "=HYPERLINK(\"x\")", color: null, sortOrder: 2, archived: false, defaultWeight: null, defaultWeekdays: null },
];
const e = (over: Partial<RecordEntry>): RecordEntry => withCovered({ id: "e", childId: "c1", startDate: "2026-11-02", endDate: "2026-11-02", countsSchoolDay: true, schoolDays: 1, subjectMinutes: {}, totalMinutes: null, homeMinutes: null, awayMinutes: null, notes: null, books: [], ...over });
const ENTRIES = [
  e({ id: "1", startDate: "2026-11-02", endDate: "2026-11-06", schoolDays: 5, subjectMinutes: { math: 210, art: 90 }, notes: "=HYPERLINK(\"http://x\",\"hi\")", books: ["Heidi"] }),
  e({ id: "2", childId: "c2", startDate: "2026-11-02", endDate: "2026-11-06", schoolDays: 5, subjectMinutes: { math: 120 }, homeMinutes: 60, notes: "plain, with comma" }),
  e({ id: "3", startDate: "2026-12-14", endDate: "2026-12-14", schoolDays: 1, subjectMinutes: { math: 60 }, notes: "+1 note" }),
];
const ALLF: LogFields = { subjectHours: true, coreSplit: true, totalHours: false, schoolDays: true, homeAway: true, notes: true, books: true };
const COLS = ["lastDay", "schoolDays", "subjectHours", "totalHours", "coreSplit", "homeAway", "notes", "books"] as const;
const input = (over: Partial<ExportInput> = {}): ExportInput => ({ entries: ENTRIES, children: KIDS, subjects: SUBJECTS, fields: ALLF, start: "2026-08-17", end: "2026-12-18", childIds: ["c1"], mode: "entries", columns: [...COLS], ...over });
const readBlob = (b: Blob) => new Promise<string>((res) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsText(b); });
const readBytes = (b: Blob) => new Promise<ArrayBuffer>((res) => { const r = new FileReader(); r.onload = () => res(r.result as ArrayBuffer); r.readAsArrayBuffer(b); });
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
    expect(availableColumns({ ...NO_FIELDS, schoolDays: true }).map((c) => c.key)).toEqual(["lastDay", "schoolDays"]);
    expect(availableColumns(ALLF).map((c) => c.key)).toEqual([...COLS]);
    expect(availableColumns(ALLF, "totals").map((c) => c.key)).not.toContain("notes");
    expect(availableColumns(ALLF, "totals").map((c) => c.key)).not.toContain("lastDay");
    expect(availableColumns({ ...NO_FIELDS, totalHours: true, schoolDays: true }, "totals").map((c) => c.key)).toEqual(["schoolDays", "totalHours"]);
  });
});

describe("the CSV", () => {
  it("is just the ticked columns: Fall for Frank with only school days and core / non-core hours", () => {
    const csv = buildCsv(input({ columns: ["lastDay", "schoolDays", "coreSplit"] }));
    expect(lines(csv)).toEqual([
      RECORDS_WORDING,
      csvCell(PER_ENTRY_DAYS_NOTE),
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
    expect(buildTable(input({ columns: ["lastDay", "homeAway"], childIds: ["c1"] })).header).toEqual(["Date", "Last day", "Child"]); // Frank has no home or away hours
    expect(buildTable(input({ columns: ["lastDay", "homeAway"], childIds: ["c2"] })).header).toEqual(["Date", "Last day", "Child", "Hours at home"]);
    expect(buildTable(input({ columns: ["schoolDays"], entries: [e({ countsSchoolDay: false, schoolDays: 0, totalMinutes: 30 })] })).header).toEqual(["Date", "Child"]);
  });

  it("an unticked column is not there, and one the family does not track cannot be asked for", () => {
    expect(buildTable(input({ columns: [] })).header).toEqual(["Date", "Child"]);
    expect(buildTable(input({ columns: ["lastDay"] })).header).toEqual(["Date", "Last day", "Child"]);
    expect(buildTable(input({ fields: { ...NO_FIELDS, schoolDays: true }, columns: [...COLS] })).header).toEqual(["Date", "Last day", "Child", "School days"]);
  });

  it("covers the chosen dates and children, oldest first; each entry is one row", () => {
    expect(exportEntries(input({ start: "2026-11-01", end: "2026-11-30", childIds: ["c1", "c2"] })).map((x) => x.id)).toEqual(["1", "2"]);
    expect(buildTable(input({ childIds: ["c1", "c2"], columns: ["lastDay", "schoolDays"] })).rows.map((r) => r.slice(0, 3))).toEqual([["2026-11-02", "2026-11-06", "Frank"], ["2026-11-02", "2026-11-06", "Margaret"], ["2026-12-14", "", "Frank"]]);
    expect(buildTable(input({ start: "2027-01-01", end: "2027-01-31" })).rows).toEqual([]);
  });

  it("Totals: one row per child with sums, books once each, and no Notes column", () => {
    const t = buildTable(input({ mode: "totals", childIds: ["c1", "c2"], columns: [...COLS] }));
    expect(t.header).toEqual(["From", "To", "Child", "School days", "Math (hours)", "Art (hours)", "Total hours", "Core hours", "Non-core hours", "Hours at home", "Books read"]);
    const D = ["2026-08-17", "2026-12-18"];
    expect(t.rows).toEqual([[...D, "Frank", 6, "4.5", "1.5", "6", "4.5", "1.5", "", "Heidi"], [...D, "Margaret", 5, "2", "", "2", "2", "", "1", ""]]);
    expect(lines(buildCsv(input({ mode: "totals", columns: ["schoolDays"] }))).slice(1)).toEqual(["From,To,Child,School days", "2026-08-17,2026-12-18,Frank,6"]);
  });

  it("S9b-01: school days are distinct days: the same day twice is one day, and two children on the same days is the union", () => {
    const dup = [e({ id: "a", startDate: "2026-11-02", endDate: "2026-11-06", schoolDays: 5 }), e({ id: "b", startDate: "2026-11-04", endDate: "2026-11-04", schoolDays: 1 })];
    expect(totalsFor(dup, () => false).schoolDays).toBe(5);
    expect(totalsFor(ENTRIES.slice(0, 2), () => false).schoolDays).toBe(5);
    expect(totalsFor([e({ countsSchoolDay: false, schoolDays: 0 })], () => false).schoolDays).toBe(0);
    // All children in the CSV totals: Frank 6, Margaret 5 (their own distinct days)
    expect(lines(buildCsv(input({ mode: "totals", childIds: ["c1", "c2"], columns: ["schoolDays"] }))).slice(1)).toEqual(["From,To,Child,School days", "2026-08-17,2026-12-18,Frank,6", "2026-08-17,2026-12-18,Margaret,5"]);
  });

  it("S9b-01: an entry partly in the dates exports only its part inside: clipped dates, days, and hours in proportion", () => {
    const run = e({ id: "r", startDate: "2026-11-02", endDate: "2026-11-06", schoolDays: 5, subjectMinutes: { math: 600 }, homeMinutes: 300 });
    const [part] = exportEntries(input({ entries: [run], start: "2026-11-05", end: "2026-11-30" }));
    expect(part).toMatchObject({ startDate: "2026-11-05", endDate: "2026-11-06", schoolDays: 2, subjectMinutes: { math: 240 }, homeMinutes: 120, coveredDays: ["2026-11-05", "2026-11-06"] });
    expect(totalsFor([part!], (id) => id === "math")).toMatchObject({ schoolDays: 2, totalMinutes: 240, coreMinutes: 240 });
    // days off inside the run are not covered, so they are not counted
    const withBreak = e({ id: "w", startDate: "2026-11-23", endDate: "2026-11-27", coveredDays: ["2026-11-23", "2026-11-24", "2026-11-25"], schoolDays: 3, subjectMinutes: { math: 180 } });
    expect(exportEntries(input({ entries: [withBreak], start: "2026-11-25", end: "2026-11-30" }))[0]).toMatchObject({ schoolDays: 1, subjectMinutes: { math: 60 } });
    // a whole entry inside the dates is the entry itself
    expect(exportEntries(input({ entries: [run] }))[0]).toBe(run);
  });

  it("S10-19 (R1): an Each entry file with School days says, under the wording, that the column is per entry and where the real count is", () => {
    expect(PER_ENTRY_DAYS_NOTE).toBe("School days are per entry; a day in two entries is in both rows. For the real count, use the Totals export.");
    expect(lines(buildCsv(input({ columns: ["schoolDays"] })))[1]).toBe(`"${PER_ENTRY_DAYS_NOTE}"`);
    // not without School days, and not in Totals (which counts each day once)
    expect(buildCsv(input({ columns: ["subjectHours"] }))).not.toContain(PER_ENTRY_DAYS_NOTE);
    expect(buildCsv(input({ mode: "totals", columns: ["schoolDays"] }))).not.toContain(PER_ENTRY_DAYS_NOTE);
  });

  it("S10-19 (R2): a row clipped to the dates says which longer entry it is part of; whole rows leave it empty, and with none clipped the column is gone", () => {
    const run = e({ id: "r", startDate: "2026-11-16", endDate: "2026-11-20", schoolDays: 5, subjectMinutes: { math: 300 } });
    const one = e({ id: "o", startDate: "2026-11-23", endDate: "2026-11-23", schoolDays: 1, subjectMinutes: { math: 60 } });
    const t = buildTable(input({ entries: [run, one], columns: ["lastDay", "schoolDays"], start: "2026-11-18", end: "2026-11-30" }));
    expect(t.header).toEqual(["Date", "Last day", "Part of", "Child", "School days"]);
    expect(t.rows).toEqual([["2026-11-18", "2026-11-20", "an entry from Nov 16 to Nov 20", "Frank", 3], ["2026-11-23", "", "", "Frank", 1]]);
    expect(buildTable(input({ entries: [run, one], columns: ["schoolDays"] })).header).toEqual(["Date", "Child", "School days"]);
  });

  it("S9b-05 (N6): Last day is only there when ticked, and only in Each entry; Totals rows start with the dates they cover", () => {
    expect(buildTable(input({ columns: ["schoolDays"] })).header).toEqual(["Date", "Child", "School days"]);
    expect(buildTable(input({ columns: ["lastDay", "schoolDays"] })).header).toEqual(["Date", "Last day", "Child", "School days"]);
    expect(buildTable(input({ mode: "totals", columns: ["lastDay", "schoolDays"] })).header).toEqual(["From", "To", "Child", "School days"]);
  });

  it("S9b-05 (N14): the downloaded file starts with a UTF-8 byte-order mark, then the wording", async () => {
    const bytes = new Uint8Array(await readBytes(csvBlob(buildCsv(input({ entries: [e({ notes: "José — Zoë" })], columns: ["notes"] })))));
    expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]);
    const text = new TextDecoder("utf-8", { ignoreBOM: true }).decode(bytes);
    expect(text.startsWith(`\uFEFF${RECORDS_WORDING}`)).toBe(true);
    expect(text).toContain("José — Zoë");
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
  fakeApi.on("GET /api/records/totals", 200, { from: null, to: null, childId: null, entries: 1, schoolDays: 1, totalMinutes: 60, coreMinutes: 0, nonCoreMinutes: 0, homeMinutes: 0, awayMinutes: 0, books: [], bySubject: [] });
}

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
    expect(form.getAllByRole("checkbox").map((c) => c.closest("label")!.textContent)).toEqual(["Last day", "School days", "Hours by subject", "Total hours", "Core and non-core hours", "Hours at home and away", "Notes", "Books read"]);
    for (const l of ["Hours by subject", "Total hours", "Hours at home and away", "Notes", "Books read"]) await user.click(form.getByRole("checkbox", { name: l }));
    await user.click(form.getByRole("button", { name: "Download CSV" }));
    expect(clicked).toEqual(["records-2026-08-31-to-2027-05-28.csv"]);
    const text = await readBlob(blobs[0]!);
    expect(lines(text)).toEqual([RECORDS_WORDING, csvCell(PER_ENTRY_DAYS_NOTE), "Date,Last day,Child,School days,Core hours,Non-core hours", "2026-11-02,2026-11-06,Frank,5,3.5,1.5", "2026-12-14,,Frank,1,1,"]);
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
    expect(lines(text)[1]).toMatch(/^From,To,Child,School days,Math \(hours\)/);
    expect(lines(text).slice(2).map((l) => l.split(",").slice(0, 3).join(","))).toEqual(["2026-11-01,2026-11-30,Frank", "2026-11-01,2026-11-30,Margaret"]);
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

  it("a family that tracks only school days is offered only that column (and Last day, which every entry has)", async () => {
    stub({ ...NO_FIELDS, schoolDays: true });
    const user = userEvent.setup();
    const form = await open(user);
    expect(form.getAllByRole("checkbox").map((c) => c.closest("label")!.textContent)).toEqual(["Last day", "School days"]);
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
    // S9b-05 (N7): Frank has no home or away hours: those lines are left out, never "0 m"; Margaret's home hours are there
    expect(pages[0]!.textContent).not.toMatch(/Hours at home|Hours away|\b0 m\b/);
    expect(pages[1]!.textContent).toContain("Hours at home");
    expect(pages[1]!.textContent).not.toMatch(/Hours away|\b0 m\b/);
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
