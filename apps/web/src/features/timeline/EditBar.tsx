/**
 * T-07e: the edit bar for one selected assignment, fixed to the bottom of the viewport (above the tab bar on
 * phones). Not modal: the page scrolls and zooms behind it. It only exists while something is selected
 * (DeeDee's T-02b rule). Esc or × clears the selection. S6-10: Heavier and Lighter nudge the weight about 25%.
 * S6b-05: only Start, End, Copy and a quiet "More" show; More holds Heavier, Lighter and Reset to original. The
 * week-step buttons and the session's date-only Reset are gone (date pickers, dragging, Undo and Reset to original
 * cover them).
 */
import { forwardRef, useEffect, useRef, useState } from "react";
import type { Nudge } from "./nudge";
import { datesError, type DateSpan, type Selection } from "./select";

export interface EditBarProps {
  selection: Selection;
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

export const EditBar = forwardRef<HTMLElement, EditBarProps>(function EditBar({ selection: s, busy, error, onSave, onCopy, onNudge, canNudge, onReset, onClose }, ref) {
  const [invalid, setInvalid] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  // Esc closes the open menu first, then the bar; a tap outside the menu closes it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (more) setMore(false);
      else onClose();
    };
    const onDown = (e: PointerEvent) => {
      if (more && !moreRef.current?.contains(e.target as Node)) setMore(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onDown);
    };
  }, [onClose, more]);
  useEffect(() => setMore(false), [s.assignmentId]);
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
  const message = invalid ?? error;

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
        <div className="tl-edit-dates">
          <label>Start <input type="date" value={draft.startDate} disabled={busy} onChange={onDate("startDate")} /></label>
          <label>End <input type="date" value={draft.endDate} disabled={busy} onChange={onDate("endDate")} /></label>
        </div>
        <div className="tl-edit-ends">
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={onCopy}>Copy</button>
          <div className="tl-more" ref={moreRef}>
            <button type="button" className="btn btn-secondary tl-more-btn" aria-expanded={more} aria-controls="tl-more-menu" onClick={() => setMore((m) => !m)}>More</button>
            {more && (
              <div id="tl-more-menu" className="tl-more-menu" role="group" aria-label="More">
                <button type="button" disabled={busy || !canNudge.heavier} onClick={() => onNudge("heavier")}>Heavier</button>
                <button type="button" disabled={busy || !canNudge.lighter} onClick={() => onNudge("lighter")}>Lighter</button>
                <button type="button" disabled={busy} onClick={() => { setMore(false); onReset(); }}>Reset to original</button>
              </div>
            )}
          </div>
        </div>
      </div>
      {message && <p className="tl-edit-error" role="alert">{message}</p>}
    </section>
  );
});
