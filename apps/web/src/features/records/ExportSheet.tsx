/**
 * S9-11: the export sheet. Dates (they start as the Records range), children, "Each entry" or "Totals", and a tick for every
 * field the family tracks (date and child are always in). CSV downloads a file made on this device; Print summary prints one
 * page per child (print stylesheet; the browser can save it as PDF). Nothing is sent anywhere.
 */
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import type { Assignment, Child, LogFields, RecordEntry, Subject } from "../../api/types";
import { formatRangeYears } from "../../lib/dates";
import { Button, Chip } from "../../ui/components";
import { DateField } from "../../ui/DateField";
import { formatMinutes } from "./entryText";
import { booksFinished } from "./booksFinished";
import { availableColumns, buildCsv, csvBlob, csvFileName, exportEntries, totalsFor, type ColumnKey, type ExportInput, type ExportMode } from "./exportData";
import { dayWords, summaryOf } from "./entryText";
import { RECORDS_WORDING } from "./wording";
import "./records.css";

export interface ExportSheetProps {
  fields: LogFields;
  children: readonly Child[];
  subjects: readonly Subject[];
  entries: readonly RecordEntry[];
  /** S16-05: for the Books finished column and line. */
  assignments?: readonly Assignment[];
  /** The Records range and child, as the starting dates and children. */
  start: string;
  end: string;
  childIds: readonly string[];
  onClose: () => void;
}

function download(name: string, text: string) {
  const url = URL.createObjectURL(csvBlob(text));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function ExportSheet({ fields, children, subjects, entries, assignments, start: s0, end: e0, childIds: c0, onClose }: ExportSheetProps) {
  const kids = children.filter((c) => !c.archived);
  const [start, setStart] = useState(s0);
  const [end, setEnd] = useState(e0);
  const [picked, setPicked] = useState<string[]>([...c0]);
  const [mode, setMode] = useState<ExportMode>("entries");
  const offered = availableColumns(fields, mode);
  const [off, setOff] = useState<ColumnKey[]>([]);
  const [printing, setPrinting] = useState(false);
  const valid = Boolean(start && end && end >= start && picked.length > 0);
  const input: ExportInput = useMemo(() => ({
    entries, assignments, children: kids, subjects, fields, start, end, childIds: picked, mode, columns: offered.map((c) => c.key).filter((k) => !off.includes(k)),
  }), [entries, assignments, kids, subjects, fields, start, end, picked, mode, offered, off]);
  const allPicked = kids.length > 1 && picked.length === kids.length;

  useEffect(() => {
    if (!printing) return;
    document.body.classList.add("printing");
    const done = () => { document.body.classList.remove("printing"); setPrinting(false); };
    window.addEventListener("afterprint", done, { once: true });
    const t = setTimeout(() => window.print(), 50);
    return () => { clearTimeout(t); window.removeEventListener("afterprint", done); document.body.classList.remove("printing"); };
  }, [printing]);

  const nothing = valid && exportEntries(input).length === 0;
  return (
    <form className="export-form" aria-label="Export" onSubmit={(e) => e.preventDefault()}>
      <div className="field-row">
        <div className="field"><label htmlFor="export-from">From</label><DateField id="export-from" value={start} onChange={setStart} /></div>
        <div className="field"><label htmlFor="export-to">To</label><DateField id="export-to" value={end} onChange={setEnd} /></div>
      </div>
      {kids.length > 1 ? (
        <fieldset><legend>For</legend>
          <div className="log-chips">
            <Chip selected={allPicked} onClick={() => setPicked(allPicked ? [] : kids.map((k) => k.id))}>All children</Chip>
            {kids.map((k) => <Chip key={k.id} selected={picked.includes(k.id)} onClick={() => setPicked((p) => (p.includes(k.id) ? p.filter((x) => x !== k.id) : [...p, k.id]))}>{k.name}</Chip>)}
          </div>
        </fieldset>
      ) : null}
      <fieldset><legend>Rows</legend>
        <div className="log-chips">
          <Chip selected={mode === "entries"} onClick={() => setMode("entries")}>Each entry</Chip>
          <Chip selected={mode === "totals"} onClick={() => setMode("totals")}>Totals</Chip>
        </div>
      </fieldset>
      <fieldset><legend>Columns</legend>
        <p className="hint">{mode === "entries" ? "Date and child are always included." : "The dates (From and To) and child are always included."} A column with nothing in these dates is left out.</p>
        {offered.map((c) => (
          <label key={c.key} className="choice-row">
            <input type="checkbox" checked={!off.includes(c.key)} onChange={() => setOff((o) => (o.includes(c.key) ? o.filter((k) => k !== c.key) : [...o, c.key]))} />
            <span>{c.label}</span>
          </label>
        ))}
      </fieldset>
      {!valid ? <p className="field-error" role="alert">Pick the dates and at least one child.</p> : null}
      {nothing ? <p className="hint">Nothing was logged in these dates, so the file would only have its header.</p> : null}
      <div className="btn-row">
        <Button disabled={!valid} onClick={() => download(csvFileName(start, end), buildCsv(input))}>Download CSV</Button>
        <Button variant="secondary" disabled={!valid} onClick={() => setPrinting(true)}>Print summary</Button>
        <Button variant="quiet" onClick={onClose}>Close</Button>
      </div>
      {printing ? createPortal(<PrintSummary input={input} />, document.body) : null}
    </form>
  );
}

/** One page per child: the dates, the totals for the ticked fields, the entries when "Each entry", and the wording. Visible only when printing. */
function PrintSummary({ input }: { input: ExportInput }) {
  const name = (id: string) => input.children.find((c) => c.id === id)?.name ?? "Child";
  const coreOf = (id: string) => input.subjects.find((s) => s.id === id)?.core ?? false;
  const want = (k: ColumnKey) => input.columns.includes(k) && availableColumns(input.fields, "totals").some((c) => c.key === k);
  return (
    <div className="print-summary" aria-hidden="true">
      {input.childIds.map((id) => {
        const mine = exportEntries(input).filter((e) => e.childId === id);
        const t = totalsFor(mine, coreOf);
        const lines: [string, string][] = [];
        if (want("schoolDays")) lines.push(["School days", t.schoolDays > 0 ? String(t.schoolDays) : "—"]); // S16-11 (N11): never a zero, as on screen
        if (want("subjectHours")) for (const [sid, m] of [...t.bySubject].sort((a, b) => b[1] - a[1])) lines.push([input.subjects.find((s) => s.id === sid)?.name ?? "Subject", formatMinutes(m)]);
        // S9b-05 (N7): an amount nothing was typed for is left out, as in the CSV, never "0 m".
        const hours = (label: string, m: number) => { if (m > 0) lines.push([label, formatMinutes(m)]); };
        if (want("totalHours")) hours("Total hours", t.totalMinutes);
        if (want("coreSplit")) { hours("Core hours", t.coreMinutes); hours("Non-core hours", t.nonCoreMinutes); }
        if (want("homeAway")) { hours("Hours at home", t.homeMinutes); hours("Hours away", t.awayMinutes); }
        // S16-09 (N5): Books finished (from completions) prints in either mode unless a Totals file has it unticked; S18-04 (E12): with a dash when there are none.
        if (input.fields.books && (input.mode === "entries" || input.columns.includes("booksFinished"))) {
          const f = booksFinished(input.assignments ?? [], { start: input.start, end: input.end }, [id]);
          // S18-04 (E12): a child with none reads "—", like School days, not a missing row (the typed "Books read" stays left out when empty).
          lines.push(["Books finished", f.length > 0 ? f.map((b) => b.title).join("; ") : "—"]);
        }
        // and the typed titles only when there are some (never "None")
        if (want("books") && t.books.length > 0) lines.push(["Books read", t.books.join("; ")]);
        return (
          <section key={id} className="print-page">
            <h1>{name(id)}</h1>
            <p>{formatRangeYears(input.start, input.end)}</p>
            <table className="print-totals"><tbody>{lines.map(([k, v]) => <tr key={k}><th scope="row">{k}</th><td>{v}</td></tr>)}</tbody></table>
            {input.mode === "entries" && mine.length > 0 ? (
              <table className="print-entries"><tbody>{mine.map((e) => <tr key={e.id}><th scope="row">{dayWords(e)}</th><td>{summaryOf(e, input.subjects)}</td></tr>)}</tbody></table>
            ) : null}
            <p className="print-wording">{RECORDS_WORDING}</p>
          </section>
        );
      })}
    </div>
  );
}
