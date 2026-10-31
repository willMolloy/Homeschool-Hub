/**
 * /schedule/assignments (S2a-14): list, add, edit, archive. T-10: the same form opens from the timeline, with the
 * essentials first (subject, title, children, dates, unit and total). S6-09: then "About how long will that take?",
 * asked in minutes a day and saved as a weight per unit; the parent never types a weight.
 * S3a-04: "Add several" enters a subject's books in one form. S3a-06: "Import CSV" does it from a file.
 */
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { UNIT_TYPES, minutesPerDayFromWeight, weightFromMinutesPerDay, weightPerUnitOf } from "@hh/engine";
import { apiPatch, apiPost } from "../../api/client";
import type { Assignment, Subject, UnitType } from "../../api/types";
import { ChildPicker, dateRange, dateRangeError, parsePositive, saveError, sameSet, WeekdayPicker } from "./formBits";
import { useWeekdayChoice } from "./useWeekdayChoice";
import { WithLookups, type Lookups } from "./lookups";
import { LIMITS } from "./assignmentLimits";
import { ImportAssignmentsForm } from "./ImportAssignmentsForm";
import { BulkAssignmentsForm } from "./BulkAssignmentsForm";
import { copyOfAssignment } from "./copyAssignment";
import { ScheduleList, type FormSlotProps } from "./ScheduleList";
import { UNIT_LABELS, unitTitle } from "../../components/unitLabels";
import { useWeightSuggestion } from "./useWeightSuggestion";
import { EffortField } from "./EffortField";
import { unitsPerDay } from "./effort";
import type { EffortPick } from "./effort";
import { weightCardText } from "./weightText";

export { LIMITS };

/** A day has this many minutes: the most a custom answer may be. */
const MAX_MINUTES_A_DAY = 1440;

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
          copyOf={(a) => copyOfAssignment(a, l)}
          renderCard={(a) => <AssignmentCard a={a} l={l} />}
          renderForm={(p) => <AssignmentForm {...p} l={l} />}
          renderBulkForm={(p) => <BulkAssignmentsForm {...p} l={l} />}
          renderImportForm={(p) => <ImportAssignmentsForm {...p} l={l} />}
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

type Errors = Partial<Record<"subject" | "title" | "totalUnits" | "effort" | "dates" | "children", string>>;

export function AssignmentForm({ item, initial, onSaved, onCancel, extra, externalError, l }: FormSlotProps<Assignment> & { l: Lookups }) {
  // S3a-01: a copy opens the Add form (item null) prefilled from `initial`.
  const start = item ?? initial ?? null;
  const activeSubjects = l.subjects.filter((s) => !s.archived || s.id === start?.subjectId);
  const [subjectId, setSubjectId] = useState(start?.subjectId ?? (activeSubjects.length === 1 ? activeSubjects[0]!.id : ""));
  const [title, setTitle] = useState(start?.title ?? "");
  const [unitType, setUnitType] = useState<UnitType>(start?.unitType ?? "lessons");
  const [totalUnits, setTotalUnits] = useState(start ? String(start.totalUnits) : "");
  // S6-09: what the parent picked for "about how long"; null = untouched (the suggestion, or what is stored, stands).
  const [pick, setPick] = useState<EffortPick | null>(null);
  // S2b-11: adding (or changing the unit) follows the suggestion until the parent picks; editing or copying shows what's stored.
  const [suggesting, setSuggesting] = useState(!start);
  const [startDate, setStartDate] = useState(start?.startDate ?? "");
  const [endDate, setEndDate] = useState(start?.endDate ?? "");
  const activeChildren = l.children.filter((c) => !c.archived);
  const [childIds, setChildIds] = useState<string[]>(start?.childIds ?? (activeChildren.length === 1 ? [activeChildren[0]!.id] : []));
  // S4-07: the chips start from the assignment's own days, else the subject's default, else every school day.
  const dayChoice = useWeekdayChoice(l, subjectId, start?.weekdays ?? null);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ids = { subject: useId(), title: useId(), unit: useId(), total: useId(), effort: useId(), start: useId(), end: useId(), err: useId() };

  const { suggestion, pending } = useWeightSuggestion(unitType, childIds, subjectId, suggesting);
  const followsSuggestion = suggesting && pick === null;
  // S2c-04: an untouched suggestion is only saved once it's the answer for the current inputs; a pick can always save.
  const awaitingSuggestion = followsSuggestion && pending;

  /** A weight means effort per *this* unit, so changing the unit goes back to the new unit's suggestion (D7). */
  function changeUnit(u: UnitType) {
    setUnitType(u);
    setPick(null);
    setSuggesting(true);
  }

  /**
   * An untouched suggestion: a learned one is stored explicitly so later learning doesn't move this assignment's
   * bars; a subject or built-in one is sent as null so the assignment follows the subject default live (D20).
   */
  const suggestedValue = (): number | null =>
    suggestion && (suggestion.source === "child" || suggestion.source === "children") ? suggestion.weightPerUnit : null;

  /**
   * S4b-05: "Set as default" only marks the choice; the subject is patched when the form is saved (Cancel discards it).
   * The mark belongs to the subject and days it was made for: another subject or another chip tap withdraws it.
   */
  const [defaultMark, setDefaultMark] = useState<{ subjectId: string; days: number[] | null } | null>(null);
  const marked = defaultMark !== null && defaultMark.subjectId === subjectId;
  function changeDays(days: number[]) {
    setDefaultMark(null);
    dayChoice.change(days);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving || awaitingSuggestion) return;
    setFormError(null);
    const errs: Errors = {};
    if (!subjectId) errs.subject = "Pick a subject.";
    const t = title.trim();
    if (!t) errs.title = "Title is required.";
    else if (t.length > LIMITS.title) errs.title = `Title must be ${LIMITS.title} characters or fewer.`;
    const total = parsePositive(totalUnits, "Total", LIMITS.totalUnits);
    if (typeof total === "string") errs.totalUnits = total;
    // S6-09: untouched keeps what the form followed (the suggestion, or the stored weight; null follows the subject default, D21);
    // a pick becomes a weight per unit at this pace.
    let wpu: number | null = followsSuggestion ? suggestedValue() : suggesting ? null : start?.weightPerUnit ?? null;
    if (pick) {
      const minutes = pick.kind === "preset" ? pick.minutes : parsePositive(pick.text, "Minutes", MAX_MINUTES_A_DAY);
      if (typeof minutes === "string") errs.effort = minutes;
      else if (pace === null) errs.effort = "Fill in the total, the dates and the days first.";
      else wpu = weightFromMinutesPerDay(minutes, pace);
    }
    const d = dateRangeError(startDate, endDate, LIMITS.days);
    if (d) errs.dates = d;
    if (childIds.length === 0) errs.children = "Pick at least one child.";
    setErrors(errs);
    if (Object.keys(errs).length > 0 || typeof total === "string") return;

    // S4b-05: a marked default is the subject's first, then the assignment follows it (null).
    const full = { subjectId, title: t, unitType, totalUnits: total, weightPerUnit: wpu, startDate, endDate, childIds, weekdays: marked ? null : dayChoice.value };
    setSaving(true);
    try {
      if (marked) {
        const saved = await apiPatch<Subject>(`/api/subjects/${subjectId}`, { defaultWeekdays: defaultMark.days });
        l.subjectSaved?.(saved);
        dayChoice.follow();
        setDefaultMark(null);
      }
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
      // S4b-04: only when a chip was tapped (or a default was set), so a title-only edit never changes the days.
      if ((dayChoice.touched || marked) && JSON.stringify(full.weekdays) !== JSON.stringify(item.weekdays ?? null)) patch.weekdays = full.weekdays;
      if (Object.keys(patch).length === 0) return onCancel();
      onSaved(await apiPatch<Assignment>(`/api/assignments/${item.id}`, patch));
    } catch (err) {
      setFormError(saveError(err));
    } finally {
      setSaving(false);
    }
  }

  // S6-09: the weight the form stands on (the suggestion, or what's stored resolved like the engine does) as minutes a day.
  const totalNumber = Number(totalUnits);
  const pace = totalUnits.trim() ? unitsPerDay(totalNumber, startDate, endDate, dayChoice.shown) : null;
  const baseWeight = suggesting
    ? suggestion?.weightPerUnit ?? null
    : weightPerUnitOf({ unitType, weightPerUnit: start?.weightPerUnit ?? null }, subjectId ? l.subjectDefault(subjectId) : null).weight;
  const baseMinutes = baseWeight !== null && pace !== null ? minutesPerDayFromWeight(baseWeight, pace) : null;
  const pickedMinutes = pick === null ? null : pick.kind === "preset" ? pick.minutes : Number(pick.text.trim() || NaN);
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
      <ChildPicker options={l.children} value={childIds} onChange={setChildIds} error={errors.children} />
      <div className="field-row">
        {field(ids.start, "Start", undefined,
          <input id={ids.start} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} {...inv(errors.dates, ids.end)} />)}
        {field(ids.end, "End", errors.dates,
          <input id={ids.end} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} {...inv(errors.dates, ids.end)} />)}
      </div>
      <WeekdayPicker legend="Days" offer={dayChoice.offer} value={dayChoice.shown} onChange={changeDays} />
      {marked ? (
        <div className="field">
          <p className="hint">Will be the default for {l.subjectName(subjectId)}.</p>
          <button className="btn btn-secondary" type="button" disabled={saving} onClick={() => setDefaultMark(null)}>Undo</button>
        </div>
      ) : dayChoice.differs && subjectId ? (
        <div className="field">
          <button className="btn btn-secondary" type="button" disabled={saving} onClick={() => setDefaultMark({ subjectId, days: dayChoice.defaultValue })}>
            Set as default for {l.subjectName(subjectId)}
          </button>
        </div>
      ) : null}
      <div className="field-row">
        {field(ids.unit, "Unit", undefined,
          <select id={ids.unit} value={unitType} onChange={(e) => changeUnit(e.target.value as UnitType)}>
            {UNIT_TYPES.map((u) => (
              <option key={u} value={u}>{unitTitle(u)}</option>
            ))}
          </select>)}
        {field(ids.total, "Total", errors.totalUnits,
          <input id={ids.total} type="number" inputMode="decimal" min="0" step="any" value={totalUnits}
            onChange={(e) => setTotalUnits(e.target.value)} {...inv(errors.totalUnits, ids.total)} />)}
      </div>
      <EffortField id={ids.effort} unitType={unitType} pace={pace} pick={pick} onPick={setPick} baseMinutes={baseMinutes}
        suggestion={suggesting ? suggestion : null} subjectName={l.subjectName(subjectId)}
        chosenMinutes={pickedMinutes !== null && Number.isFinite(pickedMinutes) && pickedMinutes > 0 ? pickedMinutes : null} error={errors.effort} />
      <div className="btn-row">
        <button className="btn" type="submit" disabled={saving || awaitingSuggestion} aria-busy={awaitingSuggestion || undefined}>{saving ? "Saving…" : item ? "Save" : "Add"}</button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>Cancel</button>
        {extra}
      </div>
    </form>
  );
}
