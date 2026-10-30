/**
 * S3a-05: CSV text → assignment inputs, or per-line errors. Pure: no I/O, no React.
 * Header (any order, any case): subject, title, children (names split by ";"), unit, total, start, end.
 * Names must match the family's active subjects and children. All or nothing: any error means no rows.
 */
import { addDays, isValidLocalDate, toDayNumber, UNIT_TYPES, type LocalDate, type UnitType } from "@hh/engine";
import type { Child, Subject } from "../../api/types";
import { LIMITS, YEARS } from "./assignmentLimits";

export const MAX_IMPORT_ROWS = 50;
/** S3b-05: a chosen file bigger than this is turned away unread (50 rows are a few KB). */
export const MAX_IMPORT_BYTES = 1024 * 1024;
const tooManyRows = { line: 0, message: `Import at most ${MAX_IMPORT_ROWS} assignments at a time.` };
export const CSV_COLUMNS = ["subject", "title", "children", "unit", "total", "start", "end"] as const;
type Column = (typeof CSV_COLUMNS)[number];

/** The body of one item of POST /api/assignments/bulk. */
export interface AssignmentInput {
  subjectId: string;
  title: string;
  unitType: UnitType;
  totalUnits: number;
  weightPerUnit: null;
  startDate: string;
  endDate: string;
  childIds: string[];
}

/** `line` is the line in the file (the header is line 1); 0 means the file as a whole. */
export interface CsvError { line: number; message: string }

export interface CsvResult {
  rows: AssignmentInput[];
  errors: CsvError[];
}

/** "Line 4: no child named Margret." */
export const errorText = (e: CsvError) => (e.line > 0 ? `Line ${e.line}: ${e.message}` : e.message);

interface Rec { line: number; cells: string[] }

/**
 * RFC 4180-style records: quoted fields, "" for a quote, commas and line breaks inside quotes, LF/CRLF/CR.
 * `unclosed` is the line where a quote was opened and never closed (S3b-04), or null.
 * S3b-05: it stops once it has the header and one more than MAX_IMPORT_ROWS non-blank rows (`truncated`), so a huge file is cheap.
 */
function records(text: string): { recs: Rec[]; unclosed: number | null; truncated: boolean } {
  const out: Rec[] = [];
  let cells: string[] = [];
  let cell = "";
  let quoted = false;
  let line = 1;
  let startLine = 1;
  let openedAt = 0;
  const endCell = () => { cells.push(cell); cell = ""; };
  let filled = 0;
  const endRecord = () => {
    endCell();
    if (cells.some((c) => c.trim() !== "")) filled++;
    out.push({ line: startLine, cells });
    cells = [];
    startLine = line;
  };
  for (let i = 0; i < text.length && filled <= MAX_IMPORT_ROWS + 1; i++) {
    const ch = text[i]!;
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; } else quoted = false;
      } else {
        if (ch === "\n") line++;
        cell += ch;
      }
    } else if (ch === '"' && cell === "") { quoted = true; openedAt = line; }
    else if (ch === ",") endCell();
    else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      line++;
      endRecord();
    } else cell += ch;
  }
  const truncated = filled > MAX_IMPORT_ROWS + 1;
  if (!truncated && (cell !== "" || cells.length > 0)) endRecord();
  return { recs: out, unclosed: quoted ? openedAt : null, truncated };
}

const norm = (s: string) => s.trim().toLowerCase();

/** `2026-11-02` or `11/2/2026` → "2026-11-02"; null when it isn't one of those shapes (or not a real date). */
function parseDate(raw: string): LocalDate | null {
  const t = raw.trim();
  const us = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(t);
  const iso = us ? `${us[3]}-${us[1]!.padStart(2, "0")}-${us[2]!.padStart(2, "0")}` : t;
  return isValidLocalDate(iso) ? iso : null;
}

function dateProblem(label: string, raw: string): { date: LocalDate } | { error: string } {
  if (!raw.trim()) return { error: `${label} is required.` };
  const d = parseDate(raw);
  if (!d) return { error: `${label} must be a real date like 2026-11-02 or 11/2/2026 (got "${raw.trim()}").` };
  const y = Number(d.slice(0, 4));
  if (y < YEARS.min || y > YEARS.max) return { error: `${label} must be in ${YEARS.min}–${YEARS.max}.` };
  return { date: d };
}

function totalProblem(raw: string): { total: number } | { error: string } {
  const t = raw.trim();
  if (!t) return { error: "total is required." };
  // S3b-06: plain decimals only; Number() would also take 0x10 and 1e2.
  if (!/^\d+(\.\d+)?$/.test(t)) return { error: "total must be a number, like 300." };
  const v = Number(t);
  if (v <= 0 || v > LIMITS.totalUnits) return { error: `total must be more than 0 and at most ${LIMITS.totalUnits.toLocaleString("en-US")}.` };
  if (Math.abs(v * 100 - Math.round(v * 100)) > 1e-6) return { error: "total can have at most 2 decimal places." };
  return { total: v };
}

const unitOf = (raw: string): UnitType | null => {
  const t = norm(raw);
  return UNIT_TYPES.find((u) => u === t || u.slice(0, -1) === t) ?? null;
};

/** Active rows by normalized name; a name two active rows share maps to null. */
function activeByName<T extends { name: string; archived: boolean }>(list: readonly T[]): Map<string, T | null> {
  const out = new Map<string, T | null>();
  for (const x of list) if (!x.archived) out.set(norm(x.name), out.has(norm(x.name)) ? null : x);
  return out;
}

export function parseAssignmentsCsv(text: string, lookups: { subjects: readonly Subject[]; children: readonly Child[] }): CsvResult {
  const { recs: all, unclosed, truncated } = records(text.replace(/^\uFEFF/, ""));
  const header = all[0];
  if (!header) return { rows: [], errors: [{ line: 1, message: `add a header row: ${CSV_COLUMNS.join(", ")}.` }] };
  // S3b-04: say how to fix a file in the wrong shape, rather than listing every column as missing.
  if (header.cells.length === 1 && /[;\t]/.test(header.cells[0]!)) {
    return { rows: [], errors: [{ line: 0, message: "This file uses semicolons (or tabs) between columns. Save it as CSV with commas." }] };
  }
  if (unclosed !== null) return { rows: [], errors: [{ line: unclosed, message: "a quote is never closed." }] };

  const at = new Map<Column, number>();
  header.cells.forEach((h, i) => {
    const name = norm(h) as Column;
    if ((CSV_COLUMNS as readonly string[]).includes(name) && !at.has(name)) at.set(name, i);
  });
  const missing = CSV_COLUMNS.filter((c) => !at.has(c));
  if (missing.length > 0) {
    return { rows: [], errors: [{ line: 1, message: `the header is missing ${missing.length === 1 ? "the column" : "the columns"} ${missing.join(", ")}.` }] };
  }

  const data = all.slice(1).filter((r) => r.cells.some((c) => c.trim() !== ""));
  if (data.length === 0) return { rows: [], errors: [{ line: 0, message: "No assignments found under the header." }] };
  if (truncated || data.length > MAX_IMPORT_ROWS) return { rows: [], errors: [tooManyRows] };

  // S3b-03: a name shared by two active rows is `null`, so a row that uses it is reported instead of guessing.
  const subjects = activeByName(lookups.subjects);
  const children = activeByName(lookups.children);

  const rows: AssignmentInput[] = [];
  const errors: CsvError[] = [];
  for (const r of data) {
    const cell = (c: Column) => r.cells[at.get(c)!] ?? "";
    const bad: string[] = [];

    // Unquoted commas in a title push text past the last column; every other check on the row would be noise.
    if (r.cells.slice(header.cells.length).some((c) => c.trim() !== "")) {
      errors.push({ line: r.line, message: "too many columns. Put quotes around text that contains commas." });
      continue;
    }

    const subjectName = cell("subject").trim();
    const subject = subjectName ? subjects.get(norm(subjectName)) : undefined;
    if (!subjectName) bad.push("subject is required.");
    else if (subject === null) bad.push(`two subjects are named ${subjectName}. Rename one under Subjects first.`);
    else if (!subject) bad.push(`no subject named ${subjectName}.`);

    const title = cell("title").trim();
    if (!title) bad.push("title is required.");
    else if (title.length > LIMITS.title) bad.push(`title must be ${LIMITS.title} characters or fewer.`);

    const names = cell("children").split(";").map((n) => n.trim()).filter(Boolean);
    const childIds: string[] = [];
    if (names.length === 0) bad.push("children is required (names separated by ;).");
    for (const n of names) {
      const child = children.get(norm(n));
      if (child === null) {
        const message = `two children are named ${n}. Rename one under Kids first.`;
        if (!bad.includes(message)) bad.push(message);
      } else if (!child) bad.push(`no child named ${n}.`);
      else if (!childIds.includes(child.id)) childIds.push(child.id);
    }

    const unitType = unitOf(cell("unit"));
    if (!unitType) bad.push(`unit must be one of ${UNIT_TYPES.join(", ")} (got "${cell("unit").trim()}").`);

    const total = totalProblem(cell("total"));
    if ("error" in total) bad.push(total.error);

    const start = dateProblem("start", cell("start"));
    const end = dateProblem("end", cell("end"));
    if ("error" in start) bad.push(start.error);
    if ("error" in end) bad.push(end.error);
    if ("date" in start && "date" in end) {
      const span = toDayNumber(end.date) - toDayNumber(start.date) + 1;
      if (span < 1) bad.push("end must be on or after start.");
      else if (span > LIMITS.days) bad.push(`start to end is ${span} days; the most allowed is ${LIMITS.days}.`);
    }

    if (bad.length > 0) {
      for (const message of bad) errors.push({ line: r.line, message });
    } else {
      rows.push({
        subjectId: subject!.id, title, unitType: unitType!, totalUnits: (total as { total: number }).total, weightPerUnit: null,
        startDate: (start as { date: string }).date, endDate: (end as { date: string }).date, childIds,
      });
    }
  }
  // All or nothing: a file with any error imports nothing.
  return errors.length > 0 ? { rows: [], errors } : { rows, errors };
}

const cellText = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

/** The header row and one example row, using the family's own first subject and child so it imports as is. */
export function assignmentsCsvTemplate(lookups: { subjects: readonly Subject[]; children: readonly Child[] }): string {
  const subject = lookups.subjects.find((s) => !s.archived)?.name ?? "Math";
  const child = lookups.children.find((c) => !c.archived)?.name ?? "Ada";
  const start: LocalDate = "2026-11-02";
  const example = [subject, "Saxon 5/4", child, "lessons", "120", start, addDays(start, 45)];
  return `${CSV_COLUMNS.join(",")}\n${example.map(cellText).join(",")}\n`;
}
