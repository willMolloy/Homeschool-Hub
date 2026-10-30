/**
 * S3a-06: "Import CSV" on the Assignments screen. Choose or paste a CSV, see what it holds (or what to fix), and import
 * every row in one POST /api/assignments/bulk. Parsing and checking are csvImport.ts; any error blocks the whole import.
 */
import { useId, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { apiPost } from "../../api/client";
import type { Assignment } from "../../api/types";
import { assignmentsCsvTemplate, errorText, parseAssignmentsCsv } from "./csvImport";
import { bulkSaveError, dateRange } from "./formBits";
import type { Lookups } from "./lookups";

interface Props {
  l: Lookups;
  onSaved: (created: Assignment[]) => void;
  onCancel: () => void;
}

const readText = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });

export function ImportAssignmentsForm({ l, onSaved, onCancel }: Props) {
  const [text, setText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ids = { file: useId(), paste: useId() };
  const result = useMemo(() => (text.trim() ? parseAssignmentsCsv(text, l) : null), [text, l]);
  const template = useMemo(() => `data:text/csv;charset=utf-8,${encodeURIComponent(assignmentsCsvTemplate(l))}`, [l]);
  const ready = result !== null && result.errors.length === 0 && result.rows.length > 0;

  async function choose(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFormError(null);
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
      onSaved(await apiPost<Assignment[]>("/api/assignments/bulk", { assignments: result.rows }));
    } catch (err) {
      // The server names an item by its position; say its title instead.
      setFormError(bulkSaveError(err, (n) => result.rows[n - 1]?.title));
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
          <ul className="import-list" aria-label="To import">
            {result.rows.map((r, i) => (
              <li key={i}>
                <strong>{r.title}</strong>
                <br />
                {l.subjectName(r.subjectId)} · {r.childIds.map(l.childName).join(", ")} · {dateRange(r.startDate, r.endDate)}
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
