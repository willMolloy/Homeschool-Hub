/** /schedule/events (S2a-16): recurring events such as co-op or piano, with per-subject rules. Archive only. */
import { useId, useState, type FormEvent } from "react";
import { apiPatch, apiPost } from "../../api/client";
import type { EventRule, ScheduleEvent } from "../../api/types";
import { ChildPicker, dateRange, saveError, sameSet, shortDate, spanDays, WeekdayPicker, weekdaySummary } from "./formBits";
import { WithLookups, type Lookups } from "./lookups";
import { ScheduleList, type FormSlotProps } from "./ScheduleList";

/** Mirrors apps/api/src/routes/events.ts and scheduleLimits.ts. */
export const LIMITS = { name: 120 } as const;

export const RULE_LABELS: Record<EventRule, string> = { skip: "Skip", lighter: "Lighter", normal: "Normal" };
const RULES = Object.keys(RULE_LABELS) as EventRule[];
/** Select value for "no rule of its own". */
const USE_DEFAULT = "";

const byName = (a: ScheduleEvent, b: ScheduleEvent) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id);

/** "Nov 2, 2026 – Jun 5, 2027", "From Nov 2, 2026", "Until Jun 5, 2027" or "Ongoing". */
export function eventDates(start: string | null, end: string | null): string {
  if (start && end) return dateRange(start, end);
  if (start) return `From ${shortDate(start)}`;
  if (end) return `Until ${shortDate(end)}`;
  return "Ongoing";
}

/** "50%" for 0.5; one decimal at most. */
const percent = (f: number) => `${Math.round(f * 1000) / 10}%`;

/** The capacity box: 0–100 with at most one decimal (the API keeps three decimals of a fraction). */
export function parsePercent(raw: string): number | string {
  const t = raw.trim();
  if (!t) return "Enter how much of the day is left, 0–100.";
  const v = Number(t);
  if (!Number.isFinite(v) || v < 0 || v > 100) return "Enter a number from 0 to 100.";
  if (Math.abs(v * 10 - Math.round(v * 10)) > 1e-6) return "Use at most one decimal place.";
  return Math.round(v * 10) / 1000;
}

export function EventsPage() {
  return (
    <WithLookups title="Events">
      {(l) => (
        <ScheduleList<ScheduleEvent>
          title="Events"
          noun="event"
          endpoint="/api/events"
          emptyText="No events yet. Add things like co-op or piano that change a school day."
          removal="archive"
          labelOf={(e) => e.name}
          sort={byName}
          confirmText="The plan stops using it. You can unarchive it later from Show archived."
          renderCard={(e) => <EventCard e={e} l={l} />}
          renderForm={(p) => <EventForm {...p} l={l} />}
        />
      )}
    </WithLookups>
  );
}

/** "Normal by default · Skip: History, Science · Lighter (50%): Math" — subjects grouped by their own rule. */
export function ruleSummary(e: ScheduleEvent, l: Lookups): string {
  const parts = [`${RULE_LABELS[e.defaultRule]} by default${e.defaultRule === "lighter" ? ` (${percent(e.capacityFraction)})` : ""}`];
  for (const rule of RULES) {
    const names = Object.keys(e.subjectRules).filter((sid) => e.subjectRules[sid] === rule).map(l.subjectName).sort((x, y) => x.localeCompare(y));
    if (names.length === 0) continue;
    parts.push(`${RULE_LABELS[rule]}${rule === "lighter" ? ` (${percent(e.capacityFraction)})` : ""}: ${names.join(", ")}`);
  }
  return parts.join(" · ");
}

function EventCard({ e, l }: { e: ScheduleEvent; l: Lookups }) {
  return (
    <span className="card-body">
      <span className="card-title">{e.name}</span>
      <span className="card-line">
        {weekdaySummary(e.weekdays)} · {e.childIds.length === 0 ? "Whole family" : e.childIds.map(l.childName).join(", ")}
      </span>
      <span className="card-line">{ruleSummary(e, l)}</span>
      <span className="card-line">{eventDates(e.startDate, e.endDate)}</span>
    </span>
  );
}

type Errors = Partial<Record<"name" | "weekdays" | "dates" | "capacity" | "children", string>>;

function EventForm({ item, onSaved, onCancel, extra, externalError, l }: FormSlotProps<ScheduleEvent> & { l: Lookups }) {
  const [name, setName] = useState(item?.name ?? "");
  const [weekdays, setWeekdays] = useState<number[]>(item?.weekdays ?? []);
  const [startDate, setStartDate] = useState(item?.startDate ?? "");
  const [endDate, setEndDate] = useState(item?.endDate ?? "");
  const [capacity, setCapacity] = useState(String(Math.round((item?.capacityFraction ?? 0.5) * 1000) / 10));
  const [defaultRule, setDefaultRule] = useState<EventRule>(item?.defaultRule ?? "normal");
  const [rules, setRules] = useState<Record<string, EventRule>>(() => ({ ...(item?.subjectRules ?? {}) }));
  const [wholeFamily, setWholeFamily] = useState(!item || item.childIds.length === 0);
  const [childIds, setChildIds] = useState<string[]>(item?.childIds ?? []);
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ids = { name: useId(), start: useId(), end: useId(), capacity: useId(), def: useId(), rule: useId() };

  const active = l.subjects.filter((s) => !s.archived);
  const activeIds = new Set(active.map((s) => s.id));
  // Rules saved for subjects that are archived now: kept as they are unless the rules are changed.
  const staleRules = Object.keys(item?.subjectRules ?? {}).filter((sid) => !activeIds.has(sid));
  const usesLighter = defaultRule === "lighter" || Object.values(rules).includes("lighter");

  function setRule(sid: string, v: string) {
    setRules((prev) => {
      const next = { ...prev };
      if (v === USE_DEFAULT) delete next[sid];
      else next[sid] = v as EventRule;
      return next;
    });
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setFormError(null);
    const errs: Errors = {};
    const n = name.trim();
    if (!n) errs.name = "Name is required.";
    else if (n.length > LIMITS.name) errs.name = `Name must be ${LIMITS.name} characters or fewer.`;
    if (weekdays.length === 0) errs.weekdays = "Pick at least one day.";
    if (startDate && endDate && spanDays(startDate, endDate) < 1) errs.dates = "The end date must be on or after the start date.";
    const cap = parsePercent(capacity);
    if (typeof cap === "string") errs.capacity = cap;
    if (!wholeFamily && childIds.length === 0) errs.children = "Pick at least one child, or choose Whole family.";
    setErrors(errs);
    if (Object.keys(errs).length > 0 || typeof cap === "string") return;

    // Only active subjects' own rules are sent; "Use default" ones are left out.
    const subjectRules: Record<string, EventRule> = {};
    for (const s of active) if (rules[s.id]) subjectRules[s.id] = rules[s.id]!;
    const full = {
      name: n,
      weekdays: [...weekdays].sort((a, b) => a - b),
      startDate: startDate || null,
      endDate: endDate || null,
      capacityFraction: cap,
      defaultRule,
      subjectRules,
      childIds: wholeFamily ? [] : childIds,
    };
    setSaving(true);
    try {
      if (!item) {
        onSaved(await apiPost<ScheduleEvent>("/api/events", full));
        return;
      }
      const patch: Partial<typeof full> = {};
      if (full.name !== item.name) patch.name = full.name;
      if (!sameSet(full.weekdays, item.weekdays)) patch.weekdays = full.weekdays;
      if (full.startDate !== item.startDate) patch.startDate = full.startDate;
      if (full.endDate !== item.endDate) patch.endDate = full.endDate;
      if (Math.abs(full.capacityFraction - item.capacityFraction) > 1e-9) patch.capacityFraction = full.capacityFraction;
      if (full.defaultRule !== item.defaultRule) patch.defaultRule = full.defaultRule;
      // The server replaces the whole set, so send it whole when anything in it changed.
      const before = Object.entries(item.subjectRules).filter(([sid]) => activeIds.has(sid));
      const after = Object.entries(subjectRules);
      const rulesChanged = before.length !== after.length || before.some(([sid, r]) => subjectRules[sid] !== r);
      if (rulesChanged) patch.subjectRules = full.subjectRules;
      if (!sameSet(full.childIds, item.childIds)) patch.childIds = full.childIds;
      if (Object.keys(patch).length === 0) return onCancel();
      onSaved(await apiPatch<ScheduleEvent>(`/api/events/${item.id}`, patch));
    } catch (err) {
      setFormError(saveError(err));
    } finally {
      setSaving(false);
    }
  }

  const shownError = formError ?? externalError;
  const inv = (err: string | undefined, id: string) => (err ? { "aria-invalid": true as const, "aria-describedby": `${id}-err` } : {});
  return (
    <form className="card schedule-form" aria-label={item ? `Edit ${item.name}` : "Add event"} onSubmit={submit} noValidate>
      {shownError ? <p className="form-error" role="alert">{shownError}</p> : null}
      <div className="field">
        <label htmlFor={ids.name}>Name</label>
        <input id={ids.name} type="text" value={name} autoComplete="off" placeholder="e.g. Co-op"
          onChange={(e) => setName(e.target.value)} {...inv(errors.name, ids.name)} />
        {errors.name ? <p id={`${ids.name}-err`} className="field-error" role="alert">{errors.name}</p> : null}
      </div>
      <WeekdayPicker legend="Which days" value={weekdays} onChange={setWeekdays} error={errors.weekdays} />
      <div className="field-row">
        <div className="field">
          <label htmlFor={ids.start}>Starts (optional)</label>
          <input id={ids.start} type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} {...inv(errors.dates, ids.end)} />
        </div>
        <div className="field">
          <label htmlFor={ids.end}>Ends (optional)</label>
          <input id={ids.end} type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} {...inv(errors.dates, ids.end)} />
          {errors.dates ? <p id={`${ids.end}-err`} className="field-error" role="alert">{errors.dates}</p> : null}
        </div>
      </div>
      <p className="hint">Leave both blank for an event that runs all year.</p>
      <div className="field">
        <label htmlFor={ids.def}>Default for subjects</label>
        <select id={ids.def} value={defaultRule} onChange={(e) => setDefaultRule(e.target.value as EventRule)}>
          {RULES.map((r) => <option key={r} value={r}>{RULE_LABELS[r]}</option>)}
        </select>
        <p className="hint">Skip: no work that day. Lighter: a shorter day. Normal: no change.</p>
      </div>
      <fieldset className="rule-list">
        <legend>Subject rules</legend>
        {active.length === 0 ? <p className="hint">No subjects yet. Add them under Subjects.</p> : null}
        {active.map((s) => {
          const id = `${ids.rule}-${s.id}`;
          return (
            <div key={s.id} className="rule-row">
              <label htmlFor={id}>{s.name}</label>
              <select id={id} value={rules[s.id] ?? USE_DEFAULT} onChange={(e) => setRule(s.id, e.target.value)}>
                <option value={USE_DEFAULT}>Use default ({RULE_LABELS[defaultRule]})</option>
                {RULES.map((r) => <option key={r} value={r}>{RULE_LABELS[r]}</option>)}
              </select>
            </div>
          );
        })}
        {staleRules.length > 0 ? (
          <p className="hint">
            Also has rules for archived {staleRules.length === 1 ? "subject" : "subjects"} {staleRules.map(l.subjectName).join(", ")}.
            They stay unless you change the rules here.
          </p>
        ) : null}
      </fieldset>
      <div className="field">
        <label htmlFor={ids.capacity}>Left on a lighter day (%)</label>
        <input id={ids.capacity} type="number" inputMode="decimal" min={0} max={100} step="any" value={capacity}
          onChange={(e) => setCapacity(e.target.value)} {...inv(errors.capacity, ids.capacity)}
          aria-describedby={errors.capacity ? `${ids.capacity}-err` : `${ids.capacity}-hint`} />
        {errors.capacity ? (
          <p id={`${ids.capacity}-err`} className="field-error" role="alert">{errors.capacity}</p>
        ) : (
          <p id={`${ids.capacity}-hint`} className="hint">
            {usesLighter ? "How much of a normal day's work fits on these days." : "Only used by subjects set to Lighter."}
          </p>
        )}
      </div>
      <ChildPicker
        legend="Who it's for"
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
