/** S5-07: "Save as a template" on Days off: this year's family-wide days off, kept as offsets from the year's first day. */
import { useId, useMemo, useState, type FormEvent } from "react";
import { isValidLocalDate } from "@hh/engine";
import { apiPost } from "../../api/client";
import type { BlockedRange, CalendarTemplate } from "../../api/types";
import { saveError } from "./formBits";
import { MAX_TEMPLATE_BREAKS, templateBreaksFrom } from "./templates";

/** Mirrors apps/api/src/routes/calendarTemplates.ts. */
export const NAME_MAX = 60;

interface Props {
  existing: BlockedRange[];
  /** Nothing new for the list: a template is not a day off. */
  onSaved: (created: BlockedRange[]) => void;
  onCancel: () => void;
}

export function SaveTemplatePanel({ existing, onSaved, onCancel }: Props) {
  const [name, setName] = useState("");
  const [first, setFirst] = useState("");
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedAs, setSavedAs] = useState<string | null>(null);
  const ids = { name: useId(), first: useId() };

  const picked = isValidLocalDate(first);
  const { breaks, leftOut } = useMemo(() => (picked ? templateBreaksFrom(existing, first) : { breaks: [], leftOut: 0 }), [picked, existing, first]);
  const n = name.trim();
  const problem = !n ? "Name the template."
    : n.length > NAME_MAX ? `Name must be ${NAME_MAX} characters or fewer.`
    : !picked ? "Pick the year's first day."
    : breaks.length === 0 ? "There are no days off for the whole family in that year."
    : breaks.length > MAX_TEMPLATE_BREAKS ? `That year has more than ${MAX_TEMPLATE_BREAKS} days off; a template holds ${MAX_TEMPLATE_BREAKS}.`
    : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError(null);
    setTried(true);
    if (problem) return;
    setSaving(true);
    try {
      const t = await apiPost<CalendarTemplate>("/api/calendar-templates", { name: n, breaks });
      setSavedAs(t.name);
    } catch (err) {
      setError(saveError(err));
    } finally {
      setSaving(false);
    }
  }

  if (savedAs !== null) {
    return (
      <div className="card schedule-form" role="status">
        <p>Saved “{savedAs}”. Find it under Use a template.</p>
        <div className="btn-row">
          <button className="btn" type="button" onClick={() => onSaved([])}>Done</button>
        </div>
      </div>
    );
  }
  return (
    <form className="card schedule-form" aria-label="Save as a template" onSubmit={submit} noValidate>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <div className="field">
        <label htmlFor={ids.name}>Template name</label>
        <input id={ids.name} type="text" value={name} autoComplete="off" placeholder="e.g. Our 2026–27 year" onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor={ids.first}>First day of the year</label>
        <input id={ids.first} type="date" value={first} onChange={(e) => setFirst(e.target.value)} />
      </div>
      {tried && problem ? <p className="field-error" role="alert">{problem}</p> : null}
      {picked ? (
        <div className="template-preview" aria-live="polite">
          <p className="event-preview-title">{breaks.length === 1 ? "1 day off will be saved" : `${breaks.length} days off will be saved`}</p>
          {leftOut > 0 ? <p className="hint">{leftOut === 1 ? "1 day off for one child is left out" : `${leftOut} days off for individual children are left out`}</p> : null}
        </div>
      ) : null}
      <div className="btn-row">
        <button className="btn" type="submit" disabled={saving}>{saving ? "Saving…" : "Save template"}</button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
