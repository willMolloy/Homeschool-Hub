/**
 * T-07e: the edit bar for one selected assignment, fixed to the bottom of the viewport (above the tab bar on
 * phones). Not modal: the page scrolls and zooms behind it. It only exists while something is selected
 * (DeeDee's T-02b rule). Esc or × clears the selection. S6-10: Heavier and Lighter nudge the weight about 25%.
 */
import { forwardRef, useEffect, useState } from "react";
import type { Nudge } from "./nudge";
import { canEndEarlier, datesError, moveWeeks, shiftEnd, type DateSpan, type Selection } from "./select";

export interface EditBarProps {
  selection: Selection;
  /** The dates before the first change in this visit; null when unchanged (no Reset). */
  original: DateSpan | null;
  busy: boolean;
  error: string | null;
  onSave: (dates: DateSpan) => void;
  /** S3a-02: opens the Add assignment sheet prefilled from this assignment. */
  onCopy: () => void;
  /** S6-10: "Heavier" / "Lighter"; a direction is disabled when the weight is already at its limit. */
  onNudge: (direction: Nudge) => void;
  canNudge: Record<Nudge, boolean>;
  /** S6-08: asks to put the assignment back to how it was created (the page confirms first). */
  onReset: () => void;
  onClose: () => void;
}

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export const EditBar = forwardRef<HTMLElement, EditBarProps>(function EditBar({ selection: s, original, busy, error, onSave, onCopy, onNudge, canNudge, onReset, onClose }, ref) {
  const [invalid, setInvalid] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  useEffect(() => setInvalid(null), [s.assignmentId, s.startDate, s.endDate]);
  // T-08b: the fields follow the selection live (a drag updates them as it goes); a pick shows at once.
  // A typed date shows until the selection changes (a save lands, a drag moves it, another bar is picked).
  const shown = `${s.assignmentId}:${s.startDate}:${s.endDate}`;
  const [typed, setTyped] = useState<{ for: string; dates: DateSpan } | null>(null);
  const draft = typed?.for === shown ? typed.dates : { startDate: s.startDate, endDate: s.endDate };

  const save = (next: DateSpan) => {
    const bad = datesError(next);
    setInvalid(bad);
    if (!bad) onSave(next);
  };
  const onDate = (field: keyof DateSpan) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setTyped({ for: shown, dates: { ...draft, [field]: e.target.value } });
    if (ISO.test(e.target.value)) save({ startDate: s.startDate, endDate: s.endDate, [field]: e.target.value });
  };
  const changed = original !== null && (original.startDate !== s.startDate || original.endDate !== s.endDate);
  const message = invalid ?? error;
  const step = (label: string, next: DateSpan) => (
    <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => save(next)}>{label}</button>
  );

  return (
    <section ref={ref} className="tl-edit" aria-label={`Edit ${s.title}`}>
      <div className="tl-edit-head">
        <div className="tl-edit-name">
          <p className="tl-edit-title">{s.title}</p>
          <p className="tl-edit-sub">{s.subtitle}</p>
        </div>
        <button type="button" className="tl-edit-close" aria-label="Close" onClick={onClose}>×</button>
      </div>
      <div className="tl-edit-body">
        <div className="tl-edit-moves">
          {step("Move back a week", moveWeeks(s, -1))}
          {step("Move forward a week", moveWeeks(s, 1))}
        </div>
        <div className="tl-edit-dates">
          <label>Start <input type="date" value={draft.startDate} disabled={busy} onChange={onDate("startDate")} /></label>
          <label>End <input type="date" value={draft.endDate} disabled={busy} onChange={onDate("endDate")} /></label>
          {changed && original && step("Reset", original)}
        </div>
        <div className="tl-edit-ends">
          {canEndEarlier(s.startDate, s.endDate) && step("End a week earlier", { startDate: s.startDate, endDate: shiftEnd(s.endDate, -1) })}
          {step("End a week later", { startDate: s.startDate, endDate: shiftEnd(s.endDate, 1) })}
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={onCopy}>Copy</button>
          <button type="button" className="btn btn-secondary" disabled={busy || !canNudge.heavier} onClick={() => onNudge("heavier")}>Heavier</button>
          <button type="button" className="btn btn-secondary" disabled={busy || !canNudge.lighter} onClick={() => onNudge("lighter")}>Lighter</button>
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={onReset}>Reset to original</button>
        </div>
      </div>
      {message && <p className="tl-edit-error" role="alert">{message}</p>}
    </section>
  );
});
