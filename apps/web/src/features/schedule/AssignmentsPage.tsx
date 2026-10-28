/** /schedule/assignments (S2a-14): list, add, edit, archive. */
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { DEFAULT_MINUTES_PER_UNIT } from "@hh/engine";
import { apiPatch, apiPost } from "../../api/client";
import type { Assignment, UnitType } from "../../api/types";
import { ChildPicker, dateRange, dateRangeError, parsePositive, saveError, sameSet } from "./formBits";
import { WithLookups, type Lookups } from "./lookups";
import { ScheduleList, type FormSlotProps } from "./ScheduleList";

/** Mirrors apps/api/src/http/scheduleLimits.ts. */
export const LIMITS = { title: 120, totalUnits: 100_000, minutesPerUnit: 600, days: 1096 } as const;

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
        {units(a.totalUnits, a.unitType)}
        {a.unitType !== "minutes" ? ` · ${a.minutesPerUnit ?? `~${DEFAULT_MINUTES_PER_UNIT[a.unitType]}`} min each` : null}
      </span>
      <span className="card-line">{dateRange(a.startDate, a.endDate)}</span>
    </span>
  );
}

type Errors = Partial<Record<"subject" | "title" | "totalUnits" | "minutes" | "dates" | "children", string>>;

function AssignmentForm({ item, onSaved, onCancel, extra, externalError, l }: FormSlotProps<Assignment> & { l: Lookups }) {
  const activeSubjects = l.subjects.filter((s) => !s.archived || s.id === item?.subjectId);
  const [subjectId, setSubjectId] = useState(item?.subjectId ?? (activeSubjects.length === 1 ? activeSubjects[0]!.id : ""));
  const [title, setTitle] = useState(item?.title ?? "");
  const [unitType, setUnitType] = useState<UnitType>(item?.unitType ?? "lessons");
  const [totalUnits, setTotalUnits] = useState(item ? String(item.totalUnits) : "");
  const [minutes, setMinutes] = useState(item?.minutesPerUnit != null ? String(item.minutesPerUnit) : "");
  const [startDate, setStartDate] = useState(item?.startDate ?? "");
  const [endDate, setEndDate] = useState(item?.endDate ?? "");
  const activeChildren = l.children.filter((c) => !c.archived);
  const [childIds, setChildIds] = useState<string[]>(item?.childIds ?? (activeChildren.length === 1 ? [activeChildren[0]!.id] : []));
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ids = { subject: useId(), title: useId(), unit: useId(), total: useId(), minutes: useId(), start: useId(), end: useId(), err: useId() };

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
    let mpu: number | null = null;
    if (unitType !== "minutes" && minutes.trim()) {
      const m = parsePositive(minutes, "Minutes", LIMITS.minutesPerUnit);
      if (typeof m === "string") errs.minutes = m;
      else mpu = m;
    }
    const d = dateRangeError(startDate, endDate, LIMITS.days);
    if (d) errs.dates = d;
    if (childIds.length === 0) errs.children = "Pick at least one child.";
    setErrors(errs);
    if (Object.keys(errs).length > 0 || typeof total === "string") return;

    const full = { subjectId, title: t, unitType, totalUnits: total, minutesPerUnit: mpu, startDate, endDate, childIds };
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
      if (full.minutesPerUnit !== item.minutesPerUnit) patch.minutesPerUnit = full.minutesPerUnit;
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
          <select id={ids.unit} value={unitType} onChange={(e) => setUnitType(e.target.value as UnitType)}>
            {(Object.keys(UNIT_LABELS) as UnitType[]).map((u) => (
              <option key={u} value={u}>{UNIT_LABELS[u].many[0]!.toUpperCase() + UNIT_LABELS[u].many.slice(1)}</option>
            ))}
          </select>)}
        {field(ids.total, "Total", errors.totalUnits,
          <input id={ids.total} type="number" inputMode="decimal" min="0" step="any" value={totalUnits}
            onChange={(e) => setTotalUnits(e.target.value)} {...inv(errors.totalUnits, ids.total)} />)}
      </div>
      {unitType !== "minutes"
        ? field(ids.minutes, `Minutes per ${UNIT_LABELS[unitType].one}`, errors.minutes,
          <input id={ids.minutes} type="number" inputMode="decimal" min="0" step="any" value={minutes}
            placeholder={String(DEFAULT_MINUTES_PER_UNIT[unitType])}
            aria-describedby={errors.minutes ? `${ids.minutes}-err` : `${ids.minutes}-hint`}
            aria-invalid={errors.minutes ? true : undefined}
            onChange={(e) => setMinutes(e.target.value)} />,
          <p id={`${ids.minutes}-hint`} className="hint">Leave blank to use the default ({DEFAULT_MINUTES_PER_UNIT[unitType]} min, estimated).</p>)
        : null}
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
