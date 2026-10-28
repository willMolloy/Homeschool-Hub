/** /schedule/assignments (S2a-14): list, add, edit, archive. */
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { DEFAULT_WEIGHT_PER_UNIT, MAX_WEIGHT_PER_UNIT, MIN_WEIGHT_PER_UNIT, UNIT_TYPES } from "@hh/engine";
import { apiPatch, apiPost } from "../../api/client";
import type { Assignment, UnitType } from "../../api/types";
import { ChildPicker, dateRange, dateRangeError, parsePositive, saveError, sameSet } from "./formBits";
import { WithLookups, type Lookups } from "./lookups";
import { ScheduleList, type FormSlotProps } from "./ScheduleList";
import { formatWeight, weightCardText, weightHint } from "./weightText";

/** Mirrors apps/api/src/http/scheduleLimits.ts; weight bounds come from the engine (D2). */
export const LIMITS = { title: 120, totalUnits: 100_000, weightPerUnit: MAX_WEIGHT_PER_UNIT, days: 1096 } as const;

const UNIT_LABELS: Record<UnitType, { one: string; many: string }> = {
  lessons: { one: "lesson", many: "lessons" },
  pages: { one: "page", many: "pages" },
  chapters: { one: "chapter", many: "chapters" },
  minutes: { one: "minute", many: "minutes" },
};
const units = (n: number, t: UnitType) => `${n.toLocaleString("en-US")} ${n === 1 ? UNIT_LABELS[t].one : UNIT_LABELS[t].many}`;

const byStart = (a: Assignment, b: Assignment) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title);

export function AssignmentsPage() {
  return (
    <WithLookups title="Assignments">
      {(l) => (
        <ScheduleList<Assignment>
          title="Assignments"
          noun="assignment"
          endpoint="/api/assignments"
          emptyText="No assignments yet."
          removal="archive"
          labelOf={(a) => a.title}
          sort={byStart}
          confirmText="It drops out of the plan. Logged work stays, and you can unarchive it later."
          renderCard={(a) => <AssignmentCard a={a} l={l} />}
          renderForm={(p) => <AssignmentForm {...p} l={l} />}
        />
      )}
    </WithLookups>
  );
}

function AssignmentCard({ a, l }: { a: Assignment; l: Lookups }) {
  return (
    <span className="card-body">
      <span className="card-title">{a.title}</span>
      <span className="card-line">{l.subjectName(a.subjectId)} · {a.childIds.map(l.childName).join(", ")}</span>
      <span className="card-line">
        {units(a.totalUnits, a.unitType)} · {weightCardText(a, l.subjectDefault(a.subjectId))}
      </span>
      <span className="card-line">{dateRange(a.startDate, a.endDate)}</span>
    </span>
  );
}

type Errors = Partial<Record<"subject" | "title" | "totalUnits" | "weight" | "dates" | "children", string>>;

function AssignmentForm({ item, onSaved, onCancel, extra, externalError, l }: FormSlotProps<Assignment> & { l: Lookups }) {
  const activeSubjects = l.subjects.filter((s) => !s.archived || s.id === item?.subjectId);
  const [subjectId, setSubjectId] = useState(item?.subjectId ?? (activeSubjects.length === 1 ? activeSubjects[0]!.id : ""));
  const [title, setTitle] = useState(item?.title ?? "");
  const [unitType, setUnitType] = useState<UnitType>(item?.unitType ?? "lessons");
  const [totalUnits, setTotalUnits] = useState(item ? String(item.totalUnits) : "");
  const [weight, setWeight] = useState(item?.weightPerUnit != null ? String(item.weightPerUnit) : "");
  const [startDate, setStartDate] = useState(item?.startDate ?? "");
  const [endDate, setEndDate] = useState(item?.endDate ?? "");
  const activeChildren = l.children.filter((c) => !c.archived);
  const [childIds, setChildIds] = useState<string[]>(item?.childIds ?? (activeChildren.length === 1 ? [activeChildren[0]!.id] : []));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ids = { subject: useId(), title: useId(), unit: useId(), total: useId(), weight: useId(), start: useId(), end: useId(), err: useId() };

  /** A weight means effort per *this* unit, so changing the unit clears it (D7; S2b-11 pre-fills a suggestion). */
  function changeUnit(u: UnitType) {
    setUnitType(u);
    setWeight("");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setFormError(null);
    const errs: Errors = {};
    if (!subjectId) errs.subject = "Pick a subject.";
    const t = title.trim();
    if (!t) errs.title = "Title is required.";
    else if (t.length > LIMITS.title) errs.title = `Title must be ${LIMITS.title} characters or fewer.`;
    const total = parsePositive(totalUnits, "Total", LIMITS.totalUnits);
    if (typeof total === "string") errs.totalUnits = total;
    // Blank = null: the subject's default for this unit, else the built-in (D21: every unit type may set one).
    let wpu: number | null = null;
    if (weight.trim()) {
      const w = parsePositive(weight, "Weight", LIMITS.weightPerUnit);
      if (typeof w === "string") errs.weight = w;
      else wpu = w;
    }
    const d = dateRangeError(startDate, endDate, LIMITS.days);
    if (d) errs.dates = d;
    if (childIds.length === 0) errs.children = "Pick at least one child.";
    setErrors(errs);
    if (Object.keys(errs).length > 0 || typeof total === "string") return;

    const full = { subjectId, title: t, unitType, totalUnits: total, weightPerUnit: wpu, startDate, endDate, childIds };
    setSaving(true);
    try {
      if (!item) {
        onSaved(await apiPost<Assignment>("/api/assignments", full));
        return;
      }
      const patch: Partial<typeof full> = {};
      if (full.subjectId !== item.subjectId) patch.subjectId = full.subjectId;
      if (full.title !== item.title) patch.title = full.title;
      if (full.unitType !== item.unitType) patch.unitType = full.unitType;
      if (full.totalUnits !== item.totalUnits) patch.totalUnits = full.totalUnits;
      // A unit change always restates the weight: the API won't carry one across unit types (D7).
      if (full.weightPerUnit !== item.weightPerUnit || patch.unitType) patch.weightPerUnit = full.weightPerUnit;
      if (full.startDate !== item.startDate) patch.startDate = full.startDate;
      if (full.endDate !== item.endDate) patch.endDate = full.endDate;
      if (!sameSet(full.childIds, item.childIds)) patch.childIds = full.childIds;
      if (Object.keys(patch).length === 0) return onCancel();
      onSaved(await apiPatch<Assignment>(`/api/assignments/${item.id}`, patch));
    } catch (err) {
      setFormError(saveError(err));
    } finally {
      setSaving(false);
    }
  }

  const shownError = formError ?? externalError;
  const field = (id: string, label: string, err: string | undefined, input: ReactNode, hint?: ReactNode) => (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {input}
      {hint}
      {err ? <p id={`${id}-err`} className="field-error" role="alert">{err}</p> : null}
    </div>
  );
  const inv = (err: string | undefined, id: string) => (err ? { "aria-invalid": true as const, "aria-describedby": `${id}-err` } : {});

  return (
    <form className="card schedule-form" aria-label={item ? `Edit ${item.title}` : "Add assignment"} onSubmit={submit} noValidate>
      {shownError ? <p className="form-error" role="alert">{shownError}</p> : null}
      {field(ids.subject, "Subject", errors.subject,
        <select id={ids.subject} value={subjectId} onChange={(e) => setSubjectId(e.target.value)} {...inv(errors.subject, ids.subject)}>
          <option value="">Choose a subject…</option>
          {activeSubjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}{s.archived ? " (archived)" : ""}</option>
          ))}
        </select>,
        activeSubjects.length === 0 ? <p className="hint">No subjects yet. Add them under Subjects.</p> : null)}
      {field(ids.title, "Title", errors.title,
        <input id={ids.title} type="text" value={title} autoComplete="off" onChange={(e) => setTitle(e.target.value)} {...inv(errors.title, ids.title)} />)}
      <div className="field-row">
        {field(ids.unit, "Unit", undefined,
          <select id={ids.unit} value={unitType} onChange={(e) => changeUnit(e.target.value as UnitType)}>
            {UNIT_TYPES.map((u) => (
              <option key={u} value={u}>{UNIT_LABELS[u].many[0]!.toUpperCase() + UNIT_LABELS[u].many.slice(1)}</option>
            ))}
          </select>)}
        {field(ids.total, "Total", errors.totalUnits,
          <input id={ids.total} type="number" inputMode="decimal" min="0" step="any" value={totalUnits}
            onChange={(e) => setTotalUnits(e.target.value)} {...inv(errors.totalUnits, ids.total)} />)}
      </div>
      {field(ids.weight, `Weight per ${UNIT_LABELS[unitType].one}`, errors.weight,
        <input id={ids.weight} type="number" inputMode="decimal" min={MIN_WEIGHT_PER_UNIT} max={MAX_WEIGHT_PER_UNIT} step="0.01" value={weight}
          placeholder={formatWeight(DEFAULT_WEIGHT_PER_UNIT[unitType])}
          aria-describedby={errors.weight ? `${ids.weight}-err` : `${ids.weight}-hint`}
          aria-invalid={errors.weight ? true : undefined}
          onChange={(e) => setWeight(e.target.value)} />,
        <p id={`${ids.weight}-hint`} className="hint">{weightHint(unitType)}</p>)}
      <div className="field-row">
        {field(ids.start, "Start", undefined,
          <input id={ids.start} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} {...inv(errors.dates, ids.end)} />)}
        {field(ids.end, "End", errors.dates,
          <input id={ids.end} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} {...inv(errors.dates, ids.end)} />)}
      </div>
      <ChildPicker options={l.children} value={childIds} onChange={setChildIds} error={errors.children} />
      <div className="btn-row">
        <button className="btn" type="submit" disabled={saving}>{saving ? "Saving…" : item ? "Save" : "Add"}</button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>Cancel</button>
        {extra}
      </div>
    </form>
  );
}
