/** /schedule/days-off (S2a-15): vacations, holidays and other blocked ranges. Delete is permanent. */
import { useId, useState, type FormEvent } from "react";
import { BLOCKED_KINDS } from "@hh/engine";
import { apiPatch, apiPost } from "../../api/client";
import type { BlockedKind, BlockedRange } from "../../api/types";
import { ChildPicker, dateRange, dateRangeError, saveError, sameSet, spanDays } from "./formBits";
import { WithLookups, type Lookups } from "./lookups";
import { TemplatePanel } from "./TemplatePanel";
import { ScheduleList, type FormSlotProps } from "./ScheduleList";

/** Mirrors apps/api/src/routes/blockedRanges.ts and scheduleLimits.ts. */
export const LIMITS = { label: 60, days: 366 } as const;

export const KIND_LABELS: Record<BlockedKind, string> = { vacation: "Vacation", holiday: "Holiday", sick: "Sick day", other: "Other", missed: "Missed day" };

const byStart = (a: BlockedRange, b: BlockedRange) => a.startDate.localeCompare(b.startDate) || a.endDate.localeCompare(b.endDate);
const titleOf = (r: BlockedRange) => r.label ?? KIND_LABELS[r.kind];

export function DaysOffPage() {
  return (
    <WithLookups title="Days off">
      {(l) => (
        <ScheduleList<BlockedRange>
          title="Days off"
          noun="days off"
          endpoint="/api/blocked-ranges"
          emptyText="No days off yet."
          removal="delete"
          labelOf={titleOf}
          sort={byStart}
          confirmText="Those days go back to normal school days in the plan. This can't be undone."
          renderCard={(r) => <DaysOffCard r={r} l={l} />}
          renderForm={(p) => <DaysOffForm {...p} l={l} />}
          panels={[{ id: "template", label: "Use a template", render: (p) => <TemplatePanel {...p} /> }]}
        />
      )}
    </WithLookups>
  );
}

function DaysOffCard({ r, l }: { r: BlockedRange; l: Lookups }) {
  const n = spanDays(r.startDate, r.endDate);
  return (
    <span className="card-body">
      <span className="card-title">{titleOf(r)}</span>
      <span className="card-line">
        {r.label ? `${KIND_LABELS[r.kind]} · ` : null}
        {r.childIds.length === 0 ? "Whole family" : r.childIds.map(l.childName).join(", ")}
      </span>
      <span className="card-line">{dateRange(r.startDate, r.endDate)} ({n} {n === 1 ? "day" : "days"})</span>
    </span>
  );
}

type Errors = Partial<Record<"label" | "dates" | "children", string>>;

function DaysOffForm({ item, onSaved, onCancel, extra, externalError, l }: FormSlotProps<BlockedRange> & { l: Lookups }) {
  const [label, setLabel] = useState(item?.label ?? "");
  const [kind, setKind] = useState<BlockedKind>(item?.kind ?? "vacation");
  const [startDate, setStartDate] = useState(item?.startDate ?? "");
  const [endDate, setEndDate] = useState(item?.endDate ?? "");
  const [wholeFamily, setWholeFamily] = useState(!item || item.childIds.length === 0);
  const [childIds, setChildIds] = useState<string[]>(item?.childIds ?? []);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ids = { label: useId(), kind: useId(), start: useId(), end: useId() };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setFormError(null);
    const errs: Errors = {};
    const t = label.trim();
    if (t.length > LIMITS.label) errs.label = `Label must be ${LIMITS.label} characters or fewer.`;
    const d = dateRangeError(startDate, endDate, LIMITS.days);
    if (d) errs.dates = d;
    if (!wholeFamily && childIds.length === 0) errs.children = "Pick at least one child, or choose Whole family.";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    const full = { label: t || null, kind, startDate, endDate, childIds: wholeFamily ? [] : childIds };
    setSaving(true);
    try {
      if (!item) {
        onSaved(await apiPost<BlockedRange>("/api/blocked-ranges", full));
        return;
      }
      const patch: Partial<typeof full> = {};
      if (full.label !== item.label) patch.label = full.label;
      if (full.kind !== item.kind) patch.kind = full.kind;
      if (full.startDate !== item.startDate) patch.startDate = full.startDate;
      if (full.endDate !== item.endDate) patch.endDate = full.endDate;
      if (!sameSet(full.childIds, item.childIds)) patch.childIds = full.childIds;
      if (Object.keys(patch).length === 0) return onCancel();
      onSaved(await apiPatch<BlockedRange>(`/api/blocked-ranges/${item.id}`, patch));
    } catch (err) {
      setFormError(saveError(err));
    } finally {
      setSaving(false);
    }
  }

  const shownError = formError ?? externalError;
  const inv = (err: string | undefined, id: string) => (err ? { "aria-invalid": true as const, "aria-describedby": `${id}-err` } : {});
  return (
    <form className="card schedule-form" aria-label={item ? `Edit ${titleOf(item)}` : "Add days off"} onSubmit={submit} noValidate>
      {shownError ? <p className="form-error" role="alert">{shownError}</p> : null}
      <div className="field">
        <label htmlFor={ids.kind}>Kind</label>
        <select id={ids.kind} value={kind} onChange={(e) => setKind(e.target.value as BlockedKind)}>
          {/* "Missed day" is made from This Week (S4-10), not here. */}
          {BLOCKED_KINDS.filter((k) => k !== "missed" || kind === "missed").map((k) => <option key={k} value={k}>{KIND_LABELS[k]}</option>)}
        </select>
      </div>
      <div className="field">
        <label htmlFor={ids.label}>Label (optional)</label>
        <input id={ids.label} type="text" value={label} autoComplete="off" placeholder="e.g. Thanksgiving week"
          onChange={(e) => setLabel(e.target.value)} {...inv(errors.label, ids.label)} />
        {errors.label ? <p id={`${ids.label}-err`} className="field-error" role="alert">{errors.label}</p> : null}
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor={ids.start}>First day</label>
          <input id={ids.start} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} {...inv(errors.dates, ids.end)} />
        </div>
        <div className="field">
          <label htmlFor={ids.end}>Last day</label>
          <input id={ids.end} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} {...inv(errors.dates, ids.end)} />
          {errors.dates ? <p id={`${ids.end}-err`} className="field-error" role="alert">{errors.dates}</p> : null}
        </div>
      </div>
      <ChildPicker
        legend="Who is off"
        options={l.children}
        value={childIds}
        onChange={setChildIds}
        wholeFamily={{ value: wholeFamily, onChange: setWholeFamily }}
        error={errors.children}
      />
      <div className="btn-row">
        <button className="btn" type="submit" disabled={saving}>{saving ? "Saving…" : item ? "Save" : "Add"}</button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>Cancel</button>
        {extra}
      </div>
    </form>
  );
}
