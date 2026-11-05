/**
 * S9-11: what an export holds. Pure: the entries the page already has, the parent's ticks and dates in, a CSV (or the pieces of the
 * printable summary) out. Rules: the wording is the first line; date and child are always there; only fields the family tracks
 * can be ticked; a column with no data in the range is left out (all data stays stored); and a cell that starts with = + - or @ gets
 * a leading ' so a spreadsheet never runs it as a formula (ROADMAP, CSV safety). The totals work mirrors apps/api services/recordTotals.ts.
 * S9b-01: an entry overlapping the dates is exported as its part inside them (share.ts), and school days are distinct days.
 * S9b-05: "Last day" is a column the parent ticks like the others (N6); a Totals file starts each row with the dates it covers
 * (From, To); the file starts with a UTF-8 byte-order mark so Excel reads accents and dashes right (N14).
 */
import type { Assignment, LogFields, RecordEntry, Subject } from "../../api/types";
import { booksFinished } from "./booksFinished";
import { distinctSchoolDays, partInRange, type EntryPart } from "./share";
import { RECORDS_WORDING } from "./wording";
import { formatShort } from "../../lib/dates";

export type ColumnKey = "lastDay" | "schoolDays" | "subjectHours" | "totalHours" | "coreSplit" | "homeAway" | "notes" | "booksFinished" | "books";
export type ExportMode = "entries" | "totals";

/** The ticks the family can offer: only what its log tracks. Notes and the last day of a run only make sense entry by entry. */
export function availableColumns(f: LogFields, mode: ExportMode = "entries"): { key: ColumnKey; label: string }[] {
  const all: { key: ColumnKey; label: string; on: boolean }[] = [
    { key: "lastDay", label: "Last day", on: mode === "entries" },
    { key: "schoolDays", label: "School days", on: f.schoolDays },
    { key: "subjectHours", label: "Hours by subject", on: f.subjectHours },
    { key: "totalHours", label: "Total hours", on: f.subjectHours || f.totalHours },
    { key: "coreSplit", label: "Core and non-core hours", on: f.coreSplit },
    { key: "homeAway", label: "Hours at home and away", on: f.homeAway },
    { key: "notes", label: "Notes", on: f.notes && mode === "entries" },
    // S16-05: the books the parent marked finished (completions), per child, so only in a Totals file; the typed titles stay "Books read".
    { key: "booksFinished", label: "Books finished", on: f.books && mode === "totals" },
    { key: "books", label: "Books read", on: f.books },
  ];
  return all.filter((c) => c.on).map(({ key, label }) => ({ key, label }));
}

/** A cell as CSV text: formulas neutralised, then quoted when it holds a comma, quote or line break. */
export function csvCell(v: string | number | null | undefined): string {
  if (v === null || v === undefined) return "";
  let s = String(v);
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export const hoursText = (minutes: number): string => String(Math.round((minutes / 60) * 100) / 100);

export const entryMinutes = (e: RecordEntry): number => {
  const subjects = Object.values(e.subjectMinutes);
  return subjects.length > 0 ? subjects.reduce((a, b) => a + b, 0) : e.totalMinutes ?? 0;
};

export interface Totals { schoolDays: number; totalMinutes: number; coreMinutes: number; nonCoreMinutes: number; homeMinutes: number; awayMinutes: number; books: string[]; bySubject: Map<string, number> }
const norm = (t: string) => t.trim().toLowerCase().replace(/\s+/g, " ");

/** The same sums as the API's totals, for the export's own rows. School days are the distinct days covered (S9b-01). */
export function totalsFor(entries: readonly RecordEntry[], coreOf: (id: string) => boolean): Totals {
  const books = new Map<string, string>();
  const t: Totals = { schoolDays: 0, totalMinutes: 0, coreMinutes: 0, nonCoreMinutes: 0, homeMinutes: 0, awayMinutes: 0, books: [], bySubject: new Map() };
  for (const e of [...entries].sort((a, b) => a.startDate.localeCompare(b.startDate))) {
    for (const [id, m] of Object.entries(e.subjectMinutes)) {
      t.bySubject.set(id, (t.bySubject.get(id) ?? 0) + m);
      if (coreOf(id)) t.coreMinutes += m; else t.nonCoreMinutes += m;
    }
    t.totalMinutes += entryMinutes(e);
    t.homeMinutes += e.homeMinutes ?? 0;
    t.awayMinutes += e.awayMinutes ?? 0;
    for (const b of e.books) if (!books.has(norm(b))) books.set(norm(b), b);
  }
  t.schoolDays = distinctSchoolDays(entries);
  t.books = [...books.values()];
  return t;
}

export interface ExportInput {
  entries: readonly RecordEntry[];
  children: readonly { id: string; name: string }[];
  subjects: readonly Subject[];
  fields: LogFields;
  start: string;
  end: string;
  childIds: readonly string[];
  mode: ExportMode;
  columns: readonly ColumnKey[];
  /** S16-05: for "Books finished". Without them that column is empty (and so left out). */
  assignments?: readonly Assignment[];
}

export interface Table { header: string[]; rows: (string | number)[][] }

/** The entries an export covers: each one's part inside the dates, for the chosen children, oldest first (then by child name). */
export function exportEntries(i: ExportInput): EntryPart[] {
  const name = (id: string) => i.children.find((c) => c.id === id)?.name ?? "";
  return i.entries.filter((e) => i.childIds.includes(e.childId)).map((e) => partInRange(e, i.start, i.end)).filter((e): e is EntryPart => e !== null)
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || name(a.childId).localeCompare(name(b.childId)));
}

/** Header and rows with the ticked columns, minus any column with no data in the range. */
export function buildTable(i: ExportInput): Table {
  const allowed = new Set(availableColumns(i.fields, i.mode).map((c) => c.key));
  const want = (k: ColumnKey) => allowed.has(k) && i.columns.includes(k);
  const name = (id: string) => i.children.find((c) => c.id === id)?.name ?? "";
  const coreOf = (id: string) => i.subjects.find((s) => s.id === id)?.core ?? false;
  const subjectIds = i.subjects.filter((s) => exportEntries(i).some((e) => (e.subjectMinutes[s.id] ?? 0) > 0)).map((s) => s.id);
  const subjectName = (id: string) => i.subjects.find((s) => s.id === id)?.name ?? "Subject";
  type Col = { head: string; cell: (r: Row) => string | number; always?: boolean };
  type Row = { child: string; entry?: RecordEntry; totals: Totals; finished: string[] };
  const rows: Row[] = i.mode === "entries"
    ? exportEntries(i).map((e) => ({ child: name(e.childId), entry: e, totals: totalsFor([e], coreOf), finished: [] }))
    : i.childIds.map((id) => ({ child: name(id), totals: totalsFor(exportEntries(i).filter((e) => e.childId === id), coreOf), finished: booksFinished(i.assignments ?? [], { start: i.start, end: i.end }, [id]).map((b) => b.title) }));
  const cols: Col[] = [];
  if (i.mode === "totals") {
    cols.push({ head: "From", cell: () => i.start, always: true });
    cols.push({ head: "To", cell: () => i.end, always: true });
  }
  if (i.mode === "entries") {
    cols.push({ head: "Date", cell: (r) => r.entry!.startDate, always: true });
    if (want("lastDay")) cols.push({ head: "Last day", cell: (r) => (r.entry!.endDate !== r.entry!.startDate ? r.entry!.endDate : "") });
    // S10-19 (R2): a row clipped to the dates says which longer entry it is part of, as the screen does. Only when one is clipped.
    cols.push({ head: "Part of", cell: (r) => { const w = (r.entry as EntryPart).whole; return w ? partOfWords(w) : ""; } });
  }
  cols.push({ head: "Child", cell: (r) => r.child, always: true });
  if (want("schoolDays")) cols.push({ head: "School days", cell: (r) => (i.mode === "entries" ? r.entry!.schoolDays : r.totals.schoolDays) });
  if (want("subjectHours")) for (const id of subjectIds) cols.push({ head: `${subjectName(id)} (hours)`, cell: (r) => { const m = r.totals.bySubject.get(id) ?? 0; return m > 0 ? hoursText(m) : ""; } });
  if (want("totalHours")) cols.push({ head: "Total hours", cell: (r) => (r.totals.totalMinutes > 0 ? hoursText(r.totals.totalMinutes) : "") });
  if (want("coreSplit")) {
    cols.push({ head: "Core hours", cell: (r) => (r.totals.coreMinutes > 0 ? hoursText(r.totals.coreMinutes) : "") });
    cols.push({ head: "Non-core hours", cell: (r) => (r.totals.nonCoreMinutes > 0 ? hoursText(r.totals.nonCoreMinutes) : "") });
  }
  if (want("homeAway")) {
    cols.push({ head: "Hours at home", cell: (r) => (r.totals.homeMinutes > 0 ? hoursText(r.totals.homeMinutes) : "") });
    cols.push({ head: "Hours away", cell: (r) => (r.totals.awayMinutes > 0 ? hoursText(r.totals.awayMinutes) : "") });
  }
  if (want("notes") && i.mode === "entries") cols.push({ head: "Notes", cell: (r) => r.entry!.notes ?? "" });
  if (want("booksFinished") && i.mode === "totals") cols.push({ head: "Books finished", cell: (r) => r.finished.join("; ") });
  if (want("books")) cols.push({ head: "Books read", cell: (r) => r.totals.books.join("; ") });
  const hasData = (c: Col) => c.always || rows.some((r) => { const v = c.cell(r); return v !== "" && v !== 0; });
  const kept = cols.filter(hasData);
  return { header: kept.map((c) => c.head), rows: rows.map((r) => kept.map((c) => c.cell(r))) };
}

/** S10-19 (R2): the cell for a clipped row, in the screen's words ("part of an entry from Nov 16 to Nov 20" under the "Part of" head). */
export const partOfWords = (whole: Pick<RecordEntry, "startDate" | "endDate">) => `an entry from ${formatShort(whole.startDate)} to ${formatShort(whole.endDate)}`;

/** S10-19 (R1): under the wording in an Each entry file with School days, because that column does not add up. */
export const PER_ENTRY_DAYS_NOTE = "School days are per entry; a day in two entries is in both rows. For the real count, use the Totals export.";

/** The CSV text: the wording on the first line (and, entry by entry with School days, the per-entry note), then the header and one row per entry (or per child). */
export function buildCsv(i: ExportInput): string {
  const t = buildTable(i);
  const note = i.mode === "entries" && t.header.includes("School days") ? [[PER_ENTRY_DAYS_NOTE]] : [];
  return [[RECORDS_WORDING], ...note, t.header, ...t.rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

/** S9b-05 (N14): the downloaded file: the CSV text after a UTF-8 byte-order mark, so Excel does not read it in the system code page. */
export const UTF8_BOM = "\uFEFF";
export const csvBlob = (text: string): Blob => new Blob([UTF8_BOM, text], { type: "text/csv;charset=utf-8" });

export const csvFileName = (start: string, end: string) => `records-${start}-to-${end}.csv`;
