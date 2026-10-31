/**
 * S7-05: the sheet behind the zoom row's quiet Edit. Year is always shown; Fall, Spring and This month can be switched
 * off; the family's own views can be added, renamed, re-dated, deleted and moved up or down. At most 6 views show (Year
 * included). Save sends one PATCH /api/family with `zoomViews`; closing the sheet any other way discards the changes.
 */
import { useId, useState, type FormEvent } from "react";
import { apiPatch } from "../../api/client";
import type { CustomZoomView, FamilySettings, ZoomViews } from "../../api/types";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { saveError } from "../schedule/formBits";
import { HIDEABLE_ZOOMS, LIMIT_TEXT, MAX_VISIBLE_ZOOMS, MAX_ZOOM_NAME, newViewId, viewProblem, visibleCount } from "./zoomViews";
import "../../ui/forms.css";
import "../schedule/schedule.css";

const BUILT_IN_NAME: Record<ZoomViews["hidden"][number], string> = { fall: "Fall", spring: "Spring", month: "This month" };

interface SheetProps {
  open: boolean;
  /** What is stored now. */
  views: ZoomViews;
  onSaved: (saved: ZoomViews) => void;
  onClose: () => void;
}

export function EditZoomViewsSheet({ open, views, onSaved, onClose }: SheetProps) {
  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => { if (!o) onClose(); }} title="Zoom views" wide="side">
      <ZoomViewsForm views={views} onSaved={onSaved} onCancel={onClose} />
    </ResponsiveSheet>
  );
}

function ZoomViewsForm({ views, onSaved, onCancel }: { views: ZoomViews; onSaved: (saved: ZoomViews) => void; onCancel: () => void }) {
  const [hidden, setHidden] = useState(views.hidden);
  const [custom, setCustom] = useState<CustomZoomView[]>(views.custom);
  const [tried, setTried] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const draft: ZoomViews = { hidden, custom };
  const full = visibleCount(draft) >= MAX_VISIBLE_ZOOMS;

  const setView = (id: string, patch: Partial<CustomZoomView>) => setCustom((list) => list.map((v) => (v.id === id ? { ...v, ...patch } : v)));
  const move = (i: number, by: -1 | 1) => setCustom((list) => {
    const next = [...list];
    [next[i], next[i + by]] = [next[i + by]!, next[i]!];
    return next;
  });

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setTried(true);
    setError(null);
    if (custom.some((v) => viewProblem(v))) return;
    const body: ZoomViews = { hidden: HIDEABLE_ZOOMS.filter((z) => hidden.includes(z)), custom: custom.map((v) => ({ ...v, name: v.name.trim() })) };
    if (JSON.stringify(body) === JSON.stringify(views)) return onCancel();
    setSaving(true);
    try {
      const saved = await apiPatch<FamilySettings>("/api/family", { zoomViews: body });
      onSaved(saved.zoomViews);
    } catch (err) {
      setError(saveError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="schedule-form zoom-edit" aria-label="Zoom views" onSubmit={submit} noValidate>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      <ul className="zoom-edit-list" aria-label="Built-in views">
        <li className="zoom-edit-row">
          <span>Year</span>
          <span className="hint">Always shown</span>
        </li>
        {HIDEABLE_ZOOMS.map((z) => {
          const shown = !hidden.includes(z);
          return (
            <li key={z} className="zoom-edit-row">
              <label className="choice">
                <input type="checkbox" role="switch" checked={shown} disabled={!shown && full}
                  onChange={() => setHidden(shown ? [...hidden, z] : hidden.filter((h) => h !== z))} />
                {BUILT_IN_NAME[z]}
              </label>
            </li>
          );
        })}
      </ul>
      {custom.map((v, i) => (
        <ViewRow key={v.id} view={v} first={i === 0} last={i === custom.length - 1} problem={tried ? viewProblem(v) : null}
          onChange={(patch) => setView(v.id, patch)} onMove={(by) => move(i, by)} onDelete={() => setCustom((list) => list.filter((x) => x.id !== v.id))} />
      ))}
      <div className="field">
        <button className="btn btn-secondary" type="button" disabled={full}
          onClick={() => setCustom((list) => [...list, { id: newViewId(), name: "", start: "", end: "" }])}>
          Add a view
        </button>
        {full ? <p className="hint">{LIMIT_TEXT}</p> : null}
      </div>
      <div className="btn-row">
        <button className="btn" type="submit" disabled={saving}>{saving ? "Saving…" : "Save"}</button>
        <button className="btn btn-secondary" type="button" onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}

interface RowProps {
  view: CustomZoomView;
  first: boolean;
  last: boolean;
  problem: string | null;
  onChange: (patch: Partial<CustomZoomView>) => void;
  onMove: (by: -1 | 1) => void;
  onDelete: () => void;
}

function ViewRow({ view, first, last, problem, onChange, onMove, onDelete }: RowProps) {
  const id = useId();
  const label = view.name.trim() || "new view";
  return (
    <div className="zoom-edit-view" role="group" aria-label={`View: ${label}`}>
      <div className="field">
        <label htmlFor={`${id}-name`}>Name</label>
        <input id={`${id}-name`} type="text" value={view.name} maxLength={MAX_ZOOM_NAME} autoComplete="off" onChange={(e) => onChange({ name: e.target.value })} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor={`${id}-start`}>First day</label>
          <input id={`${id}-start`} type="date" value={view.start} onChange={(e) => onChange({ start: e.target.value })} />
        </div>
        <div className="field">
          <label htmlFor={`${id}-end`}>Last day</label>
          <input id={`${id}-end`} type="date" value={view.end} onChange={(e) => onChange({ end: e.target.value })} />
        </div>
      </div>
      {problem ? <p className="field-error" role="alert">{problem}</p> : null}
      <div className="btn-row">
        <button className="btn btn-secondary" type="button" aria-label={`Move ${label} up`} disabled={first} onClick={() => onMove(-1)}>Up</button>
        <button className="btn btn-secondary" type="button" aria-label={`Move ${label} down`} disabled={last} onClick={() => onMove(1)}>Down</button>
        <button className="btn btn-secondary btn-danger" type="button" aria-label={`Delete ${label}`} onClick={onDelete}>Delete</button>
      </div>
    </div>
  );
}
