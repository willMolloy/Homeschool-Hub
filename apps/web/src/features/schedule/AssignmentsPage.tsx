/**
 * /schedule/assignments (S2a-14): list, add, edit, archive. T-10: the same form opens from the timeline, with the
 * essentials first (subject, title, children, dates, unit and total). S6-09: then "About how long will that take?",
 * asked in minutes a day and saved as a weight per unit; the parent never types a weight.
 * S6b-08: the subject dropdown also offers common subjects and "New subject…" (SubjectSelect).
 * S7-01 / S7-02: "Copy to a new year" and "Copy to another child" (CopyPanels). S3a-04: "Add several" enters a subject's books in one form. S3a-06: "Import CSV" does it from a file.
 */
import { useEffect, useId, useMemo, useRef, useState, type FormEvent, type ReactNode } from "react";
import { UNIT_TYPES, minutesPerDayFromWeight, weightFromMinutesPerDay, weightPerUnitOf } from "@hh/engine";
import { apiPatch, apiPost, onPlanChange } from "../../api/client";
import { useApi } from "../../api/useApi";
import type { Assignment, PlanResponse, Subject, UnitType, WeightSuggestion } from "../../api/types";
import { ChildPicker, dateRange, dateRangeError, parsePositive, saveError, sameSet, shortDate, WeekdayPicker } from "./formBits";
import { useWeekdayChoice } from "./useWeekdayChoice";
import { WithLookups, type Lookups } from "./lookups";
import { LIMITS } from "./assignmentLimits";
import { ImportAssignmentsForm } from "./ImportAssignmentsForm";
import { BulkAssignmentsForm } from "./BulkAssignmentsForm";
import { copyOfAssignment } from "./copyAssignment";
import { CopyToChildPanel, CopyToNewYearPanel } from "./CopyPanels";
import { ScheduleList, type FormSlotProps } from "./ScheduleList";
import { UNIT_LABELS, unitTitle } from "../../components/unitLabels";
import { useWeightSuggestion } from "./useWeightSuggestion";
import { SubjectSelect } from "./SubjectSelect";
import { EffortField } from "./EffortField";
import { paceLooksHigh, paceNoteText, unitsPerCapacityDay, unitsPerDay } from "./effort";
import { requestPace, usableDraft, usePace, type PaceDraft } from "./usePace";
import type { EffortPick } from "./effort";
import { effortCardText } from "./weightText";
import { useMe } from "../../auth/AuthProvider";

export { LIMITS };

/** S7b-14 (F-11): the most minutes a day a learned suggestion may come to before it is set aside. */
export const MAX_SUGGESTED_MINUTES_A_DAY = 240;

/** `s`, unless it was learned from the children and comes to more than 240 min a day at `pace`: then the subject's usual (or the built-in). */
export function capSuggestion(s: WeightSuggestion | null, pace: number | null): WeightSuggestion | null {
  if (!s || pace === null || (s.source !== "child" && s.source !== "children")) return s;
  if (minutesPerDayFromWeight(s.weightPerUnit, pace) <= MAX_SUGGESTED_MINUTES_A_DAY) return s;
  const fallback = weightPerUnitOf({ unitType: s.unitType, weightPerUnit: null }, s.subjectDefault);
  return { ...s, weightPerUnit: fallback.weight, source: fallback.source === "subject" ? "subject" : "builtin", children: s.children.map((c) => ({ ...c, usual: null })) };
}

/** A day has this many minutes: the most a custom answer may be. */
const MAX_MINUTES_A_DAY = 1440;

const units = (n: number, t: UnitType) => `${n.toLocaleString("en-US")} ${n === 1 ? UNIT_LABELS[t].one : UNIT_LABELS[t].many}`;

const byStart = (a: Assignment, b: Assignment) => a.startDate.localeCompare(b.startDate) || a.title.localeCompare(b.title);

/**
 * S7b-14 (F-13): the day each assignment's plan really ends, when that is later than its stored end (a week adjustment that
 * pushes the end back). The plan's `end` doesn't depend on the days asked for, so one day's request is enough. Without an
 * answer (or a plan that ends on time) nothing is said.
 */
function usePlanEnds(): ReadonlyMap<string, string> {
  const { today } = useMe();
  const plan = useApi<PlanResponse>(`/api/plan?from=${today}&to=${today}`);
  const { reload } = plan;
  useEffect(() => onPlanChange(reload), [reload]);
  return useMemo(() => {
    const ends = new Map<string, string>();
    for (const p of plan.data?.plans ?? []) if (p.end > (ends.get(p.assignmentId) ?? "")) ends.set(p.assignmentId, p.end);
    return ends;
  }, [plan.data]);
}

export function AssignmentsPage() {
  const planEnds = usePlanEnds();
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
          renderCard={(a) => <AssignmentCard a={a} l={l} planEnd={planEnds.get(a.id)} />}
          renderForm={(p) => <AssignmentForm {...p} l={l} />}
          renderBulkForm={(p) => <BulkAssignmentsForm {...p} l={l} />}
          renderImportForm={(p) => <ImportAssignmentsForm {...p} l={l} />}
          panels={[
            { id: "copy-year", label: "Copy to a new year", render: (p) => <CopyToNewYearPanel {...p} l={l} /> },
            { id: "copy-child", label: "Copy to another child", render: (p) => <CopyToChildPanel {...p} l={l} /> },
          ]}
        />
      )}
    </WithLookups>
  );
}

function AssignmentCard({ a, l, planEnd }: { a: Assignment; l: Lookups; planEnd?: string }) {
  // S6b-13: effort as minutes a day at the assignment's own pace (its days, else the subject's, else every school day).
  const { schoolDays } = useMe();
  // S7b-10: over the days the plan really has (breaks, days off, skips); until that answers, the weekdays in the dates.
  const days = a.weekdays ?? l.subjectWeekdays(a.subjectId) ?? schoolDays;
  const real = usePace({ subjectId: a.subjectId, childIds: a.childIds, startDate: a.startDate, endDate: a.endDate, weekdays: days });
  const perDay = real ? unitsPerCapacityDay(a.totalUnits, real.capacityDays) : unitsPerDay(a.totalUnits, a.startDate, a.endDate, days);
  const effort = effortCardText(a, l.subjectDefault(a.subjectId), perDay);
  return (
    <span className="card-body">
      <span className="card-title">{a.title}</span>
      <span className="card-line">{l.subjectName(a.subjectId)} · {a.childIds.map(l.childName).join(", ")}</span>
      <span className="card-line">
        {units(a.totalUnits, a.unitType)}{effort ? ` · ${effort}` : ""}
      </span>
      <span className="card-line">{dateRange(a.startDate, a.endDate)}{planEnd && planEnd > a.endDate ? ` · plan ends ${shortDate(planEnd)}` : ""}</span>
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
  const [pick, setPickState] = useState<EffortPick | null>(null);
  // S6b-13: "Use the subject's usual" was chosen: the assignment follows the subject again (saves null).
  const [usual, setUsual] = useState(false);
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

  const { suggestion: learned, pending } = useWeightSuggestion(unitType, childIds, subjectId, suggesting);
  const subjectUsual = subjectId ? l.subjectDefault(subjectId) : null;
  const usualApplies = subjectUsual !== null && subjectUsual.unitType === unitType;
  const usualNow = usual && usualApplies;
  const followsSuggestion = suggesting && pick === null && !usualNow;
  /** A parent's own answer wins over "the subject's usual". */
  const setPick = (p: EffortPick | null) => {
    setPickState(p);
    if (p !== null) setUsual(false);
  };
  // S2c-04: an untouched suggestion is only saved once it's the answer for the current inputs; a pick can always save.
  const awaitingSuggestion = followsSuggestion && pending;

  /** A weight means effort per *this* unit, so changing the unit goes back to the new unit's suggestion (D7). */
  function changeUnit(u: UnitType) {
    setUnitType(u);
    setPick(null);
    setUsual(false);
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

  const newSubject = useRef<(() => Promise<string | null | undefined>) | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving || awaitingSuggestion) return;
    setFormError(null);
    // S7-16: a subject name typed under "New subject…" is created first and used; if that fails nothing is saved.
    const made = await newSubject.current?.();
    if (made === null) return;
    const sid = made ?? subjectId;
    const markedNow = marked && sid === subjectId; // a default marked for the old subject isn't the new one's
    const errs: Errors = {};
    if (!sid) errs.subject = "Pick a subject.";
    const t = title.trim();
    if (!t) errs.title = "Title is required.";
    else if (t.length > LIMITS.title) errs.title = `Title must be ${LIMITS.title} characters or fewer.`;
    const total = parsePositive(totalUnits, "Total", LIMITS.totalUnits);
    if (typeof total === "string") errs.totalUnits = total;
    // S6-09: untouched keeps what the form followed (the suggestion, or the stored weight; null follows the subject default, D21);
    // a pick becomes a weight per unit at this pace.
    let wpu: number | null = usualNow ? null : followsSuggestion ? suggestedValue() : suggesting ? null : start?.weightPerUnit ?? null;
    if (pick) {
      const minutes = pick.kind === "preset" ? pick.minutes : parsePositive(pick.text, "Minutes", MAX_MINUTES_A_DAY);
      // S7b-10: the pace is asked afresh here, so the weight never rests on a count that is still loading.
      let exact = pace;
      if (typeof total === "number" && paceDraft && usableDraft(paceDraft)) {
        try {
          exact = unitsPerCapacityDay(total, (await requestPace({ ...paceDraft, subjectId: sid || null })).capacityDays);
        } catch { /* keep the pace the form shows */ }
      }
      if (typeof minutes === "string") errs.effort = minutes;
      else if (exact === null) errs.effort = "Fill in the total, the dates and the days first.";
      else wpu = weightFromMinutesPerDay(minutes, exact);
    }
    const d = dateRangeError(startDate, endDate, LIMITS.days);
    if (d) errs.dates = d;
    if (childIds.length === 0) errs.children = "Pick at least one child.";
    setErrors(errs);
    if (Object.keys(errs).length > 0 || typeof total === "string") return;

    // S4b-05: a marked default is the subject's first, then the assignment follows it (null).
    const full = { subjectId: sid, title: t, unitType, totalUnits: total, weightPerUnit: wpu, startDate, endDate, childIds, weekdays: markedNow ? null : dayChoice.value };
    setSaving(true);
    try {
      if (markedNow) {
        const saved = await apiPatch<Subject>(`/api/subjects/${sid}`, { defaultWeekdays: defaultMark.days });
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
      if ((dayChoice.touched || markedNow) && JSON.stringify(full.weekdays) !== JSON.stringify(item.weekdays ?? null)) patch.weekdays = full.weekdays;
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
  // S7b-10: units a day over the days the plan will really use (breaks, days off, event skips and the days chosen), asked
  // from the API; until it answers (or if it can't), the weekdays between the dates.
  const paceDraft: PaceDraft = { subjectId: subjectId || null, childIds, startDate, endDate, weekdays: dayChoice.shown };
  const real = usePace(totalUnits.trim() ? paceDraft : null, 250);
  const pace = !totalUnits.trim() ? null : real ? unitsPerCapacityDay(totalNumber, real.capacityDays) : unitsPerDay(totalNumber, startDate, endDate, dayChoice.shown);
  const paceNote = (() => {
    if (!real || real.perChild.length < 2 || real.perChild.every((c) => c.capacityDays === real.capacityDays)) return null;
    const fewest = real.perChild.find((c) => c.capacityDays === real.capacityDays)!;
    return `${l.childName(fewest.childId)} has the fewest school days here, so this counts ${l.childName(fewest.childId)}'s.`;
  })();
  // S7b-14 (F-11): a learned suggestion that would be more than 240 min a day here is not offered (a 1-day book once said
  // "Frank usually does about 1950 min a day"); the subject's usual, else the built-in, stands in.
  const suggestion = capSuggestion(learned, pace);
  const baseWeight = usualNow
    ? weightPerUnitOf({ unitType, weightPerUnit: null }, subjectUsual).weight
    : suggesting
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
        <SubjectSelect id={ids.subject} value={subjectId} onChange={setSubjectId} l={l} options={activeSubjects} invalidProps={inv(errors.subject, ids.subject)} resolveRef={newSubject} />)}
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
      {/* S6b-07: one quiet line for a pace that looks like a typo; it never blocks Save. */}
      {pace !== null && paceLooksHigh(pace, unitType) ? <p className="hint pace-note" role="note">{paceNoteText(pace, unitType)}</p> : null}
      <EffortField id={ids.effort} unitType={unitType} pace={pace} paceNote={paceNote} pick={pick} onPick={setPick} baseMinutes={baseMinutes}
        suggestion={suggesting && !usualNow ? suggestion : null} subjectName={l.subjectName(subjectId)}
        usual={{
          active: usualNow,
          // Own effort is a pick, or what is stored when editing; while following a subject-sourced suggestion the existing "Use about" covers it.
          offer: usualApplies && !usualNow && (pick !== null ? suggestion?.source !== "subject" || !suggesting : !suggesting && start?.weightPerUnit != null),
          onUse: () => { setPickState(null); setUsual(true); },
          weight: subjectUsual?.weightPerUnit ?? null,
        }}
        chosenMinutes={pickedMinutes !== null && Number.isFinite(pickedMinutes) && pickedMinutes > 0 ? pickedMinutes : null} error={errors.effort} />
      <div className="btn-row">
        <button className="btn" type="submit" disabled={saving || awaitingSuggestion} aria-busy={awaitingSuggestion || undefined}>{saving ? "Saving…" : item ? "Save" : "Add"}</button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>Cancel</button>
        {extra}
      </div>
    </form>
  );
}
