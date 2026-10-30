/**
 * S3a-04: "Add several" on the Assignments screen. One subject, children, dates and unit for the term, then a row
 * per book (title and total). Empty rows are ignored; Save sends one POST /api/assignments/bulk, weight left to the default.
 */
import { useId, useRef, useState, type FormEvent } from "react";
import { UNIT_TYPES } from "@hh/engine";
import { apiPost } from "../../api/client";
import type { Assignment, UnitType } from "../../api/types";
import { unitTitle } from "../../components/unitLabels";
import { LIMITS } from "./assignmentLimits";
import { bulkSaveError, ChildPicker, dateRangeError, parsePositive, WeekdayPicker } from "./formBits";
import type { Lookups } from "./lookups";
import { useWeekdayChoice } from "./useWeekdayChoice";

const START_ROWS = 3;

interface Row { key: number; title: string; total: string }
type RowErrors = { title?: string; total?: string };
type Errors = Partial<Record<"subject" | "children" | "dates" | "rows", string>>;

const blank = (key: number): Row => ({ key, title: "", total: "" });
const isEmpty = (r: Row) => !r.title.trim() && !r.total.trim();

interface Props {
  l: Lookups;
  onSaved: (created: Assignment[]) => void;
  onCancel: () => void;
}

export function BulkAssignmentsForm({ l, onSaved, onCancel }: Props) {
  const activeSubjects = l.subjects.filter((s) => !s.archived);
  const activeChildren = l.children.filter((c) => !c.archived);
  const [subjectId, setSubjectId] = useState(activeSubjects.length === 1 ? activeSubjects[0]!.id : "");
  const [childIds, setChildIds] = useState<string[]>(activeChildren.length === 1 ? [activeChildren[0]!.id] : []);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [unitType, setUnitType] = useState<UnitType>("lessons");
  // S4-07: shared by every row; prefilled from the subject's default.
  const dayChoice = useWeekdayChoice(l, subjectId, null);
  const nextKey = useRef(START_ROWS);
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: START_ROWS }, (_, i) => blank(i)));
  const [errors, setErrors] = useState<Errors>({});
  const [rowErrors, setRowErrors] = useState<Record<number, RowErrors>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ids = { subject: useId(), start: useId(), end: useId(), unit: useId() };

  const setRow = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setFormError(null);
    const errs: Errors = {};
    if (!subjectId) errs.subject = "Pick a subject.";
    if (childIds.length === 0) errs.children = "Pick at least one child.";
    const d = dateRangeError(startDate, endDate, LIMITS.days);
    if (d) errs.dates = d;

    const filled = rows.filter((r) => !isEmpty(r));
    if (filled.length === 0) errs.rows = "Add at least one title and total.";
    const perRow: Record<number, RowErrors> = {};
    const items: { title: string; totalUnits: number }[] = [];
    for (const r of filled) {
      const re: RowErrors = {};
      const t = r.title.trim();
      if (!t) re.title = "Title is required.";
      else if (t.length > LIMITS.title) re.title = `Title must be ${LIMITS.title} characters or fewer.`;
      const total = parsePositive(r.total, "Total", LIMITS.totalUnits);
      if (typeof total === "string") re.total = total;
      else items.push({ title: t, totalUnits: total });
      if (re.title || re.total) perRow[r.key] = re;
    }
    setErrors(errs);
    setRowErrors(perRow);
    if (Object.keys(errs).length > 0 || Object.keys(perRow).length > 0) return;

    setSaving(true);
    try {
      const body = { assignments: items.map((i) => ({ subjectId, ...i, unitType, weightPerUnit: null, startDate, endDate, childIds, weekdays: dayChoice.value })) };
      onSaved(await apiPost<Assignment[]>("/api/assignments/bulk", body));
    } catch (err) {
      // The server counts only the rows sent; name them by the row numbers on screen.
      const shown = rows.flatMap((r, i) => (isEmpty(r) ? [] : [i + 1]));
      setFormError(bulkSaveError(err, (n) => (shown[n - 1] ? `Row ${shown[n - 1]}` : undefined)));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card schedule-form" aria-label="Add several assignments" onSubmit={submit} noValidate>
      {formError ? <p className="form-error" role="alert">{formError}</p> : null}
      <div className="field">
        <label htmlFor={ids.subject}>Subject</label>
        <select id={ids.subject} value={subjectId} onChange={(e) => setSubjectId(e.target.value)} aria-invalid={errors.subject ? true : undefined}>
          <option value="">Choose a subject…</option>
          {activeSubjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
        {errors.subject ? <p className="field-error" role="alert">{errors.subject}</p> : null}
      </div>
      <ChildPicker options={l.children} value={childIds} onChange={setChildIds} error={errors.children} />
      <div className="field-row">
        <div className="field">
          <label htmlFor={ids.start}>Start</label>
          <input id={ids.start} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} aria-invalid={errors.dates ? true : undefined} />
        </div>
        <div className="field">
          <label htmlFor={ids.end}>End</label>
          <input id={ids.end} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} aria-invalid={errors.dates ? true : undefined} />
          {errors.dates ? <p className="field-error" role="alert">{errors.dates}</p> : null}
        </div>
      </div>
      <WeekdayPicker legend="Days" offer={dayChoice.offer} value={dayChoice.shown} onChange={dayChoice.change} />
      <div className="field">
        <label htmlFor={ids.unit}>Unit</label>
        <select id={ids.unit} value={unitType} onChange={(e) => setUnitType(e.target.value as UnitType)}>
          {UNIT_TYPES.map((u) => (
            <option key={u} value={u}>{unitTitle(u)}</option>
          ))}
        </select>
      </div>
      {rows.map((r, i) => (
        <BulkRow key={r.key} n={i + 1} row={r} errors={rowErrors[r.key]} canRemove={rows.length > 1}
          onChange={(patch) => setRow(r.key, patch)} onRemove={() => setRows((rs) => rs.filter((x) => x.key !== r.key))} />
      ))}
      {errors.rows ? <p className="field-error" role="alert">{errors.rows}</p> : null}
      <div className="field">
        <button className="btn btn-secondary" type="button" onClick={() => setRows((rs) => [...rs, blank(nextKey.current++)])}>Add row</button>
      </div>
      <div className="btn-row">
        <button className="btn" type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

interface RowProps {
  n: number;
  row: Row;
  errors: RowErrors | undefined;
  canRemove: boolean;
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
}

function BulkRow({ n, row, errors, canRemove, onChange, onRemove }: RowProps) {
  const id = useId();
  return (
    <div className="field-row" role="group" aria-label={`Row ${n}`}>
      <div className="field">
        <label htmlFor={`${id}-title`}>Title</label>
        <input id={`${id}-title`} type="text" value={row.title} autoComplete="off" onChange={(e) => onChange({ title: e.target.value })}
          aria-invalid={errors?.title ? true : undefined} aria-describedby={errors?.title ? `${id}-title-err` : undefined} />
        {errors?.title ? <p id={`${id}-title-err`} className="field-error" role="alert">{errors.title}</p> : null}
      </div>
      <div className="field">
        <label htmlFor={`${id}-total`}>Total</label>
        <input id={`${id}-total`} type="number" inputMode="decimal" min="0" step="any" value={row.total} onChange={(e) => onChange({ total: e.target.value })}
          aria-invalid={errors?.total ? true : undefined} aria-describedby={errors?.total ? `${id}-total-err` : undefined} />
        {errors?.total ? <p id={`${id}-total-err`} className="field-error" role="alert">{errors.total}</p> : null}
      </div>
      {canRemove ? <button className="btn btn-secondary" type="button" aria-label={`Remove row ${n}`} onClick={onRemove}>Remove</button> : null}
    </div>
  );
}
