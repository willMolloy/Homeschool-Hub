/**
 * S7-05: the sheet behind the zoom row's quiet Edit. Year is always shown; Fall, Spring and This month can be switched
 * off; the family's own views can be added, renamed, re-dated, deleted and moved up or down. At most 6 views show (Year
 * included). S9-06: Fall and Spring also take a name and first and last day (the default halves of the year until changed),
 * with "Reset to default". Save sends one PATCH /api/family with `zoomViews`; closing the sheet any other way discards the changes.
 */
import { useId, useState, type FormEvent } from "react";
import { apiPatch } from "../../api/client";
import type { BuiltInZoomOverride, BuiltInZoomOverrides, CustomZoomView, FamilySettings, ZoomViews } from "../../api/types";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { saveError } from "../schedule/formBits";
import { HIDEABLE_ZOOMS, LIMIT_TEXT, MAX_VISIBLE_ZOOMS, MAX_ZOOM_NAME, newViewId, viewProblem, visibleCount } from "./zoomViews";
import "../../ui/forms.css";
import "../schedule/schedule.css";
import { DateField } from "../../ui/DateField";

type Half = "fall" | "spring";
type Halves = Record<Half, { start: string; end: string }>;
const HALVES: readonly Half[] = ["fall", "spring"];
const isHalf = (z: string): z is Half => z === "fall" || z === "spring";

const BUILT_IN_NAME: Record<ZoomViews["hidden"][number], string> = { fall: "Fall", spring: "Spring", month: "This month" };

interface SheetProps {
  open: boolean;
  /** What is stored now. */
  views: ZoomViews;
  /** S7b-07 (F3): built-ins the timeline's dates can't offer (Fall or Spring on a grid without that half); they say so instead of showing a switch. */
  unavailable?: readonly ZoomViews["hidden"][number][];
  /** S9-06: the default Fall and Spring dates of this year's grid (null when it does not span New Year). */
  defaults?: Halves | null;
  onSaved: (saved: ZoomViews) => void;
  onClose: () => void;
}

export function EditZoomViewsSheet({ open, views, unavailable = [], defaults = null, onSaved, onClose }: SheetProps) {
  return (
    <ResponsiveSheet open={open} onOpenChange={(o) => { if (!o) onClose(); }} title="Zoom views" wide="side">
      <ZoomViewsForm views={views} unavailable={unavailable} defaults={defaults} onSaved={onSaved} onCancel={onClose} />
    </ResponsiveSheet>
  );
}

function ZoomViewsForm({ views, unavailable, defaults, onSaved, onCancel }: { views: ZoomViews; unavailable: readonly ZoomViews["hidden"][number][]; defaults: Halves | null; onSaved: (saved: ZoomViews) => void; onCancel: () => void }) {
  const [hidden, setHidden] = useState(views.hidden);
  const [custom, setCustom] = useState<CustomZoomView[]>(views.custom);
  // S9-06: only what differs from the default is kept; a half with no entry is at its default name and dates.
  const [edits, setEdits] = useState<BuiltInZoomOverrides>(views.overrides ?? {});
  const shownHalf = (z: Half): BuiltInZoomOverride => edits[z] ?? { name: BUILT_IN_NAME[z], start: defaults?.[z].start ?? "", end: defaults?.[z].end ?? "" };
  const editHalf = (z: Half, patch: Partial<BuiltInZoomOverride>) => setEdits((e) => ({ ...e, [z]: { ...shownHalf(z), ...patch } }));
  const isDefault = (z: Half, v: BuiltInZoomOverride) => !!defaults && v.name.trim() === BUILT_IN_NAME[z] && v.start === defaults[z].start && v.end === defaults[z].end;
  const keptEdits = (): BuiltInZoomOverrides => {
    const out: BuiltInZoomOverrides = {};
    for (const z of HALVES) {
      const v = edits[z];
      if (v && !isDefault(z, v)) out[z] = { ...v, name: v.name.trim() };
    }
    return out;
  };
  const halfProblem = (z: Half) => { const v = edits[z]; return v && !isDefault(z, v) ? viewProblem(v) : null; };
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
    if (custom.some((v) => viewProblem(v)) || HALVES.some((z) => halfProblem(z))) return;
    const body: ZoomViews = { hidden: HIDEABLE_ZOOMS.filter((z) => hidden.includes(z)), custom: custom.map((v) => ({ ...v, name: v.name.trim() })) };
    const kept = keptEdits();
    if (Object.keys(kept).length > 0) body.overrides = kept;
    if (JSON.stringify(body) === JSON.stringify({ ...views, overrides: views.overrides && Object.keys(views.overrides).length > 0 ? views.overrides : undefined })) return onCancel();
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
          if (unavailable.includes(z)) {
            return (
              <li key={z} className="zoom-edit-row">
                <span>{BUILT_IN_NAME[z]}</span>
                <span className="hint">Not in this year's dates</span>
              </li>
            );
          }
          return (
            <li key={z} className="zoom-edit-row">
              <label className="choice">
                <input type="checkbox" role="switch" checked={shown} disabled={!shown && full}
                  onChange={() => setHidden(shown ? [...hidden, z] : hidden.filter((h) => h !== z))} />
                {isHalf(z) ? shownHalf(z).name.trim() || BUILT_IN_NAME[z] : BUILT_IN_NAME[z]}
              </label>
              {isHalf(z) && shown ? (
                <HalfFields name={BUILT_IN_NAME[z]} value={shownHalf(z)} changed={!!edits[z]} problem={tried ? halfProblem(z) : null}
                  onChange={(patch) => editHalf(z, patch)} onReset={() => setEdits((e) => { const { [z]: _gone, ...rest } = e; return rest; })} />
              ) : null}
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
          <DateField id={`${id}-start`} value={view.start} onChange={(v) => onChange({ start: v })} />
        </div>
        <div className="field">
          <label htmlFor={`${id}-end`}>Last day</label>
          <DateField id={`${id}-end`} value={view.end} onChange={(v) => onChange({ end: v })} />
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

/** S9-06: the name and dates of Fall or Spring, under its switch. */
function HalfFields({ name, value, changed, problem, onChange, onReset }: { name: string; value: BuiltInZoomOverride; changed: boolean; problem: string | null; onChange: (patch: Partial<BuiltInZoomOverride>) => void; onReset: () => void }) {
  const id = useId();
  return (
    <div className="zoom-edit-view" role="group" aria-label={`${name} name and dates`}>
      <div className="field">
        <label htmlFor={`${id}-name`}>Name</label>
        <input id={`${id}-name`} type="text" value={value.name} maxLength={MAX_ZOOM_NAME} autoComplete="off" onChange={(e) => onChange({ name: e.target.value })} />
      </div>
      <div className="field-row">
        <div className="field">
          <label htmlFor={`${id}-start`}>First day</label>
          <DateField id={`${id}-start`} value={value.start} onChange={(v) => onChange({ start: v })} />
        </div>
        <div className="field">
          <label htmlFor={`${id}-end`}>Last day</label>
          <DateField id={`${id}-end`} value={value.end} onChange={(v) => onChange({ end: v })} />
        </div>
      </div>
      {problem ? <p className="field-error" role="alert">{problem}</p> : null}
      {/* S9b-05 (N10): the accessible name starts with the visible text, so "click Reset to default" works by voice. */}
      {changed ? <div className="btn-row"><button className="btn btn-secondary" type="button" aria-label={`Reset to default: ${name}`} onClick={onReset}>Reset to default</button></div> : null}
    </div>
  );
}
