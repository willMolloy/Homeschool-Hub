/**
 * S3a-04: "Add several" on the Assignments screen. One subject, children, dates and unit for the term, then a row
 * per book (title and total). Empty rows are ignored; Save sends one POST /api/assignments/bulk, weight left to the default.
 * S18-04 (E9): each row says, quietly, when its pace looks too high (the single form's own warning) and when it repeats a book the
 * family already has or another row here. Neither blocks Save.
 * S7b-06: a row's small "Dates" toggle reveals its own Start and End (prefilled from the shared dates until changed), so books
 * read one after another go in one batch; rows left alone use the shared dates.
 */
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import { UNIT_TYPES } from "@hh/engine";
import type { Assignment, UnitType } from "../../api/types";
import { unitTitle } from "../../components/unitLabels";
import { LIMITS } from "./assignmentLimits";
import { bulkFailureText, saveInChunks } from "./copyPlan";
import { ChildPicker, dateRangeError, parsePositive, WeekdayPicker } from "./formBits";
import type { Lookups } from "./lookups";
import { SubjectSelect } from "./SubjectSelect";
import { useWeekdayChoice } from "./useWeekdayChoice";
import { DateField } from "../../ui/DateField";
import { useApi } from "../../api/useApi";
import { DuplicateNote, duplicateNote, repeatsOfEarlier, RowPaceNote, type RowFacts } from "./RowChecks";

const START_ROWS = 3;

/** `open`: the row has its own dates; `start`/`end` undefined = still following the shared ones. */
interface Row { key: number; title: string; total: string; open: boolean; start?: string; end?: string }
type RowErrors = { title?: string; total?: string; dates?: string };
type Errors = Partial<Record<"subject" | "children" | "dates" | "rows", string>>;

const blank = (key: number): Row => ({ key, title: "", total: "", open: false });
const isEmpty = (r: Row) => !r.title.trim() && !r.total.trim();

interface Props {
  l: Lookups;
  onSaved: (created: Assignment[]) => void;
  /** Some were saved before a later chunk failed (S14-05): show them, keep the form open. */
  onAdded: (created: Assignment[]) => void;
  onCancel: () => void;
}

export function BulkAssignmentsForm({ l, onSaved, onAdded, onCancel }: Props) {
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
  const existing = useApi<Assignment[]>("/api/assignments");
  const ids = { subject: useId(), start: useId(), end: useId(), unit: useId() };

  const setRow = (key: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  const newSubject = useRef<(() => Promise<string | null | undefined>) | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setFormError(null);
    // S7-16: a subject name typed under "New subject…" is created first and used; if that fails nothing is saved.
    const made = await newSubject.current?.();
    if (made === null) return;
    const sid = made ?? subjectId;
    const errs: Errors = {};
    if (!sid) errs.subject = "Pick a subject.";
    if (childIds.length === 0) errs.children = "Pick at least one child.";
    const filled = rows.filter((r) => !isEmpty(r));
    // The shared dates matter only to rows that follow them.
    const d = filled.length > 0 && filled.every((r) => r.open) ? null : dateRangeError(startDate, endDate, LIMITS.days);
    if (d) errs.dates = d;

    if (filled.length === 0) errs.rows = "Add at least one title and total.";
    const perRow: Record<number, RowErrors> = {};
    const items: { title: string; totalUnits: number; startDate: string; endDate: string }[] = [];
    for (const r of filled) {
      const re: RowErrors = {};
      const t = r.title.trim();
      if (!t) re.title = "Title is required.";
      else if (t.length > LIMITS.title) re.title = `Title must be ${LIMITS.title} characters or fewer.`;
      const total = parsePositive(r.total, "Total", LIMITS.totalUnits);
      if (typeof total === "string") re.total = total;
      const own = r.open ? { startDate: r.start ?? startDate, endDate: r.end ?? endDate } : { startDate, endDate };
      if (r.open) {
        const rd = dateRangeError(own.startDate, own.endDate, LIMITS.days);
        if (rd) re.dates = rd;
      }
      if (typeof total !== "string") items.push({ title: t, totalUnits: total, ...own });
      if (re.title || re.total || re.dates) perRow[r.key] = re;
    }
    setErrors(errs);
    setRowErrors(perRow);
    if (Object.keys(errs).length > 0 || Object.keys(perRow).length > 0) return;

    setSaving(true);
    try {
      const bodies = items.map((i) => ({ subjectId: sid, ...i, unitType, weightPerUnit: null, childIds, weekdays: dayChoice.value }));
      // S14-05: one undo for the lot ("Added 6 assignments"); chunks of 50 add to the same entry.
      // The server counts only the rows sent; name them by the row numbers on screen.
      const shown = rows.flatMap((r, i) => (isEmpty(r) ? [] : [i + 1]));
      const r = await saveInChunks(bodies, (n) => `Added ${n} ${n === 1 ? "assignment" : "assignments"}`, 0, (n) => (shown[n - 1] ? `Row ${shown[n - 1]}` : undefined));
      if (r.failure) {
        setFormError(bulkFailureText(r));
        if (r.created.length > 0) onAdded(r.created);
      } else onSaved(r.created);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="card schedule-form" aria-label="Add several assignments" onSubmit={submit} noValidate>
      {formError ? <p className="form-error" role="alert">{formError}</p> : null}
      <div className="field">
        <label htmlFor={ids.subject}>Subject</label>
        <SubjectSelect id={ids.subject} value={subjectId} onChange={setSubjectId} l={l} options={activeSubjects} invalidProps={errors.subject ? { "aria-invalid": true } : {}} resolveRef={newSubject} />
        {errors.subject ? <p className="field-error" role="alert">{errors.subject}</p> : null}
      </div>
      <ChildPicker options={l.children} value={childIds} onChange={setChildIds} error={errors.children} />
      <div className="field-row">
        <div className="field">
          <label htmlFor={ids.start}>Start</label>
          <DateField id={ids.start} value={startDate} onChange={setStartDate} aria-invalid={errors.dates ? true : undefined} />
        </div>
        <div className="field">
          <label htmlFor={ids.end}>End</label>
          <DateField id={ids.end} value={endDate} onChange={setEndDate} aria-invalid={errors.dates ? true : undefined} />
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
      {(() => {
        // S18-04 (E9): row facts for the notes; a row that is empty or has no usable total says nothing yet.
        const facts = (r: Row): RowFacts => ({ subjectId, title: r.title, childIds, unitType, totalUnits: Number(r.total) || 0, startDate: r.open ? r.start ?? startDate : startDate, endDate: r.open ? r.end ?? endDate : endDate });
        const earlier = repeatsOfEarlier(rows.map((r) => (isEmpty(r) || !r.title.trim() ? { subjectId: "", title: `\u0000${r.key}`, childIds: [] as string[] } : facts(r))));
        return rows.map((r, i) => (
          <BulkRow key={r.key} n={i + 1} row={r} shared={{ start: startDate, end: endDate }} errors={rowErrors[r.key]} canRemove={rows.length > 1}
            onChange={(patch) => setRow(r.key, patch)} onRemove={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
            notes={isEmpty(r) ? null : (
              <>
                {subjectId && childIds.length > 0 && r.title.trim() ? <DuplicateNote text={duplicateNote(l, existing.data ?? [], facts(r), earlier[i]!, (n) => `row ${n}`)} /> : null}
                {subjectId && childIds.length > 0 ? <RowPaceNote l={l} row={facts(r)} weekdays={dayChoice.shown} /> : null}
              </>
            )} />
        ));
      })()}
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
  /** The shared dates, shown in a row's own fields until it changes them. */
  shared: { start: string; end: string };
  errors: RowErrors | undefined;
  canRemove: boolean;
  onChange: (patch: Partial<Row>) => void;
  onRemove: () => void;
  /** S18-04 (E9): the row's pace and duplicate notes. */
  notes?: ReactNode;
}

function BulkRow({ n, row, shared, errors, canRemove, onChange, onRemove, notes }: RowProps) {
  const id = useId();
  return (
    <div className="bulk-row" role="group" aria-label={`Row ${n}`}>
    {/* S10-16: one column (Title, then Total, then the row's buttons); only Start / End sit side by side. */}
    <div className="bulk-row-fields">
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
      <div className="btn-row">
      <button className="btn btn-secondary" type="button" aria-expanded={row.open} aria-label={`Dates for row ${n}`}
        onClick={() => onChange(row.open ? { open: false, start: undefined, end: undefined } : { open: true })}>Dates</button>
      {canRemove ? <button className="btn btn-secondary" type="button" aria-label={`Remove row ${n}`} onClick={onRemove}>Remove</button> : null}
      </div>
    </div>
    {row.open ? (
      <div className="field-row">
        <div className="field">
          <label htmlFor={`${id}-start`}>Start</label>
          <DateField id={`${id}-start`} value={row.start ?? shared.start} onChange={(v) => onChange({ start: v })} aria-invalid={errors?.dates ? true : undefined} />
        </div>
        <div className="field">
          <label htmlFor={`${id}-end`}>End</label>
          <DateField id={`${id}-end`} value={row.end ?? shared.end} onChange={(v) => onChange({ end: v })} aria-invalid={errors?.dates ? true : undefined} />
          {errors?.dates ? <p className="field-error" role="alert">{errors.dates}</p> : null}
        </div>
      </div>
    ) : null}
    {notes}
    </div>
  );
}
