/**
 * S9-11: what an export holds. Pure: the entries the page already has, the parent's ticks and dates in, a CSV (or the pieces of the
 * printable summary) out. Rules: the wording is the first line; date and child are always there; only fields the family tracks
 * can be ticked; a column with no data in the range is left out (all data stays stored); and a cell that starts with = + - or @ gets
 * a leading ' so a spreadsheet never runs it as a formula (ROADMAP, CSV safety). The totals work mirrors apps/api services/recordTotals.ts.
 */
import type { LogFields, RecordEntry, Subject } from "../../api/types";
import { RECORDS_WORDING } from "./wording";

export type ColumnKey = "schoolDays" | "subjectHours" | "totalHours" | "coreSplit" | "homeAway" | "notes" | "books";
export type ExportMode = "entries" | "totals";

/** The ticks the family can offer: only what its log tracks. Notes only make sense entry by entry. */
export function availableColumns(f: LogFields, mode: ExportMode = "entries"): { key: ColumnKey; label: string }[] {
  const all: { key: ColumnKey; label: string; on: boolean }[] = [
    { key: "schoolDays", label: "School days", on: f.schoolDays },
    { key: "subjectHours", label: "Hours by subject", on: f.subjectHours },
    { key: "totalHours", label: "Total hours", on: f.subjectHours || f.totalHours },
    { key: "coreSplit", label: "Core and non-core hours", on: f.coreSplit },
    { key: "homeAway", label: "Hours at home and away", on: f.homeAway },
    { key: "notes", label: "Notes", on: f.notes && mode === "entries" },
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
export interface Span { from?: string; to?: string }
const within = (d: string, r: Span) => (!r.from || d >= r.from) && (!r.to || d <= r.to);
const dayNo = (d: string) => Date.parse(`${d}T00:00:00Z`) / 86_400_000;

/** The share of an entry's typed time inside the range (S9b-01): all of it when it fits, else its school days inside over all of its school days (calendar days when it has none). */
export function shareInRange(e: RecordEntry, r: Span): number {
  if ((!r.from || e.startDate >= r.from) && (!r.to || e.endDate <= r.to)) return 1;
  if (e.countedDays.length > 0) return e.countedDays.filter((d) => within(d, r)).length / e.countedDays.length;
  const lo = r.from && r.from > e.startDate ? r.from : e.startDate;
  const hi = r.to && r.to < e.endDate ? r.to : e.endDate;
  return hi < lo ? 0 : (dayNo(hi) - dayNo(lo) + 1) / (dayNo(e.endDate) - dayNo(e.startDate) + 1);
}

/** The same sums as the API's totals (apps/api services/recordTotals.ts), for the export's own rows: distinct school days, hours in proportion inside the range. */
export function totalsFor(entries: readonly RecordEntry[], coreOf: (id: string) => boolean, range: Span = {}): Totals {
  const days = new Set<string>();
  const books = new Map<string, string>();
  const t: Totals = { schoolDays: 0, totalMinutes: 0, coreMinutes: 0, nonCoreMinutes: 0, homeMinutes: 0, awayMinutes: 0, books: [], bySubject: new Map() };
  for (const e of [...entries].sort((a, b) => a.startDate.localeCompare(b.startDate))) {
    const share = shareInRange(e, range);
    if (share <= 0) continue;
    for (const d of e.countedDays) if (within(d, range)) days.add(d);
    const part = (m: number) => Math.round(m * share);
    let hours = 0;
    for (const [id, m] of Object.entries(e.subjectMinutes)) {
      const p = part(m);
      hours += p;
      t.bySubject.set(id, (t.bySubject.get(id) ?? 0) + p);
      if (coreOf(id)) t.coreMinutes += p; else t.nonCoreMinutes += p;
    }
    t.totalMinutes += Object.keys(e.subjectMinutes).length > 0 ? hours : part(e.totalMinutes ?? 0);
    t.homeMinutes += part(e.homeMinutes ?? 0);
    t.awayMinutes += part(e.awayMinutes ?? 0);
    for (const b of e.books) if (!books.has(norm(b))) books.set(norm(b), b);
  }
  t.schoolDays = days.size;
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
}

export interface Table { header: string[]; rows: (string | number)[][] }

/** The entries an export covers: any that overlap the dates, for the chosen children, oldest first (then by child name). */
export function exportEntries(i: ExportInput): RecordEntry[] {
  const name = (id: string) => i.children.find((c) => c.id === id)?.name ?? "";
  return i.entries.filter((e) => e.endDate >= i.start && e.startDate <= i.end && i.childIds.includes(e.childId))
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
  type Row = { child: string; entry?: RecordEntry; totals: Totals };
  const rows: Row[] = i.mode === "entries"
    ? exportEntries(i).map((e) => ({ child: name(e.childId), entry: e, totals: totalsFor([e], coreOf) }))
    : i.childIds.map((id) => ({ child: name(id), totals: totalsFor(exportEntries(i).filter((e) => e.childId === id), coreOf, { from: i.start, to: i.end }) }));
  const cols: Col[] = [];
  if (i.mode === "entries") {
    cols.push({ head: "Date", cell: (r) => r.entry!.startDate, always: true });
    if (rows.some((r) => r.entry!.endDate !== r.entry!.startDate)) cols.push({ head: "Last day", cell: (r) => (r.entry!.endDate !== r.entry!.startDate ? r.entry!.endDate : "") });
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
  if (want("books")) cols.push({ head: "Books read", cell: (r) => r.totals.books.join("; ") });
  const hasData = (c: Col) => c.always || rows.some((r) => { const v = c.cell(r); return v !== "" && v !== 0; });
  const kept = cols.filter(hasData);
  return { header: kept.map((c) => c.head), rows: rows.map((r) => kept.map((c) => c.cell(r))) };
}

/** The CSV text: the wording on the first line, then the header and one row per entry (or per child). */
export function buildCsv(i: ExportInput): string {
  const t = buildTable(i);
  return [[RECORDS_WORDING], t.header, ...t.rows].map((row) => row.map(csvCell).join(",")).join("\r\n") + "\r\n";
}

export const csvFileName = (start: string, end: string) => `records-${start}-to-${end}.csv`;
