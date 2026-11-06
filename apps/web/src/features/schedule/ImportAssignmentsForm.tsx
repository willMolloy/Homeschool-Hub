/**
 * S3a-06: "Import CSV" on the Assignments screen. Choose or paste a CSV, see what it holds (or what to fix), and import
 * every row through POST /api/assignments/bulk (S14-05: in chunks of 50, as one undo). Parsing and checking are csvImport.ts; any error blocks the whole import.
 */
import { useId, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import type { Assignment } from "../../api/types";
import { assignmentsCsvTemplate, errorText, MAX_IMPORT_BYTES, MAX_IMPORT_ROWS, parseAssignmentsCsv } from "./csvImport";
import { bulkFailureText, saveInChunks } from "./copyPlan";
import { dateRange } from "./formBits";
import type { Lookups } from "./lookups";
import { useApi } from "../../api/useApi";
import { DuplicateNote, duplicateNote, repeatsOfEarlier, RowPaceNote } from "./RowChecks";

interface Props {
  l: Lookups;
  onSaved: (created: Assignment[]) => void;
  /** Some were saved before a later chunk failed (S14-05): show them, keep the form open with the reason. */
  onAdded: (created: Assignment[]) => void;
  onCancel: () => void;
}

const readText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

export function ImportAssignmentsForm({ l, onSaved, onAdded, onCancel }: Props) {
  const [text, setText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ids = { file: useId(), paste: useId() };
  const existing = useApi<Assignment[]>("/api/assignments");
  const result = useMemo(() => (text.trim() ? parseAssignmentsCsv(text, l) : null), [text, l]);
  const template = useMemo(() => `data:text/csv;charset=utf-8,${encodeURIComponent(assignmentsCsvTemplate(l))}`, [l]);
  /** S18-04 (E9): rows that repeat something the family has, or an earlier row of this file, are flagged (never blocked). */
  const earlier = useMemo(() => repeatsOfEarlier(result?.rows ?? []), [result]);
  const ready = result !== null && result.errors.length === 0 && result.rows.length > 0;

  async function choose(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError(null);
    // S3b-05: don't read a huge file; clear the box so an earlier preview can't be imported by mistake.
    if (file.size > MAX_IMPORT_BYTES) {
      setText("");
      setFormError(`This file is too large. Import at most ${MAX_IMPORT_ROWS} assignments at a time.`);
      return;
    }
    try {
      setText(await readText(file));
    } catch {
      setFormError("Couldn't read that file.");
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving || !result || !ready) return;
    setFormError(null);
    setSaving(true);
    try {
      // S14-05: one undo for the lot ("Imported 24 assignments"); chunks of 50 add to the same entry. A server message names the row by its title.
      const r = await saveInChunks(result.rows, (n) => `Imported ${n} ${n === 1 ? "assignment" : "assignments"}`);
      if (r.failure) {
        setFormError(bulkFailureText(r));
        if (r.created.length > 0) onAdded(r.created);
      } else onSaved(r.created);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card schedule-form" aria-label="Import assignments from a CSV" onSubmit={submit} noValidate>
      {formError ? <p className="form-error" role="alert">{formError}</p> : null}
      <div className="field">
        <label htmlFor={ids.file}>CSV file</label>
        <input id={ids.file} type="file" accept=".csv,text/csv" onChange={choose} />
      </div>
      <div className="field">
        <label htmlFor={ids.paste}>Or paste it here</label>
        <textarea id={ids.paste} rows={6} value={text} onChange={(e) => { setText(e.target.value); setFormError(null); }} />
      </div>
      <p><a href={template} download="assignments-template.csv">Download template</a></p>
      {result && result.errors.length > 0 ? (
        <ul className="import-list" aria-label="Fix these">
          {result.errors.map((err, i) => (
            <li key={i} className="field-error">{errorText(err)}</li>
          ))}
        </ul>
      ) : result ? (
        <>
          <p>{result.rows.length} {result.rows.length === 1 ? "assignment" : "assignments"}</p>
          {(() => {
            const dups = result.rows.filter((r, i) => duplicateNote(l, existing.data ?? [], r, earlier[i]!, (n) => `row ${n}`)).length;
            return dups > 0 ? <p className="hint dup-note" role="note">{dups} of these {dups === 1 ? "looks" : "look"} like {dups === 1 ? "one" : "ones"} you already have or repeat{dups === 1 ? "s" : ""} another row. They are marked below; importing adds them as they are.</p> : null;
          })()}
          <ul className="import-list" aria-label="To import">
            {result.rows.map((r, i) => (
              <li key={i}>
                <strong>{r.title}</strong>
                <br />
                {l.subjectName(r.subjectId)} · {r.childIds.map(l.childName).join(", ")} · {dateRange(r.startDate, r.endDate)}
                <DuplicateNote text={duplicateNote(l, existing.data ?? [], r, earlier[i]!, (n) => `row ${n}`)} />
                <RowPaceNote l={l} row={r} weekdays={null} />
              </li>
            ))}
          </ul>
        </>
      ) : null}
      <div className="btn-row">
        <button className="btn" type="submit" disabled={saving || !ready}>{saving ? "Importing…" : "Import"}</button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
