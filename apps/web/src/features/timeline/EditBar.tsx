/**
 * T-07e: the edit bar for one selected assignment, fixed to the bottom of the viewport (above the tab bar on
 * phones). Not modal: the page scrolls and zooms behind it. It only exists while something is selected
 * (DeeDee's T-02b rule). Esc or × clears the selection. S7b-02: More holds "Update status" (S9-02) and "Update time estimate" (it replaced the S6-10 Heavier and Lighter nudges).
 * S6b-05: only Start, End, Copy and a quiet "More" show; More holds Update time estimate and Reset to original. The
 * week-step buttons and the session's date-only Reset are gone (date pickers, dragging, Undo and Reset to original
 * cover them).
 * S10-18: `panel` (840 px and up) draws the same content as a 360 px side panel on the right, no backdrop, the timeline
 * narrowed beside it. It stays open while other bars are picked; opening it moves focus to its heading (the page returns
 * focus when it closes). The phone and tablet bottom bar is unchanged.
 */
import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";
import { Clock } from "@phosphor-icons/react";
import { datesError, type DateSpan, type Selection } from "./select";
import { DateField } from "../../ui/DateField";
import { TipBubble } from "../tips/TipBubble";
import { endedWords } from "../completion/ended";

export interface EditBarProps {
  selection: Selection;
  busy: boolean;
  error: string | null;
  onSave: (dates: DateSpan) => void;
  /** S3a-02: opens the Add assignment sheet prefilled from this assignment. */
  onCopy: () => void;
  /** S7b-02: opens the sheet where the parent says how long a day of this really takes. */
  onUpdateEstimate: () => void;
  /** S9-02: "got to p. 138, move to {date}" for the selected assignment. */
  onUpdateStatus: () => void;
  /** S6-08: asks to put the assignment back to how it was created (the page confirms first). */
  onReset: () => void;
  onClose: () => void;
  /** S10-06: "About 20 pages a day · 40 min" (rounded), or null while it isn't known. */
  pace?: string | null;
  /** S10-18: a side panel (840 px and up) rather than a bottom bar. */
  panel?: boolean;
  /** S12-04: how the parent said it ended ("Finished Nov 2" / "Stopped Oct 30" shows under the dates), or null while it is open. */
  ended?: { endedAs: "finished" | "stopped"; endedOn: string } | null;
  /** S12-06: opens the sheet that changes how it ended (Change beside "Finished Nov 2"). */
  onChangeEnding?: () => void;
  /** S11-06: the one-time hint for the first bar opened, in the sheet above the dates. */
  tip?: { text: string; onGotIt: () => void } | null;
  /** S18b-02: the other workbooks of this book. */
  copies?: ReactNode;
}

/** S10-18: the width from which the edit sheet is a side panel (DeeDee, 2026-11-03). */
export const EDIT_PANEL_QUERY = "(min-width: 840px)";

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export const EditBar = forwardRef<HTMLElement, EditBarProps>(function EditBar({ selection: s, busy, error, onSave, onCopy, onUpdateEstimate, onUpdateStatus, onReset, onClose, pace = null, panel = false, ended = null, onChangeEnding, tip = null, copies = null }, ref) {
  const [invalid, setInvalid] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  // S10-18: the panel takes focus once, when it opens (it stays mounted while other bars are picked).
  useEffect(() => {
    if (panel) headingRef.current?.focus();
  }, [panel]);
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
  const onDate = (field: keyof DateSpan) => (value: string) => {
    setTyped({ for: shown, dates: { ...draft, [field]: value } });
    if (ISO.test(value)) save({ startDate: s.startDate, endDate: s.endDate, [field]: value });
  };
  const message = invalid ?? error;

  return (
    <section ref={ref} className="tl-edit" aria-label={`Edit ${s.title}`} data-panel={panel ? "" : undefined}>
      <div className="tl-edit-grab" aria-hidden="true" />
      <div className="tl-edit-head">
        <div className="tl-edit-name">
          <h2 ref={headingRef} className="tl-edit-title" tabIndex={-1}>{s.title}</h2>
          <p className="tl-edit-sub">{s.subtitle}</p>
        </div>
        <button type="button" className="tl-edit-close" aria-label="Close" onClick={onClose}>×</button>
      </div>
      <div className="tl-edit-body">
        {tip ? <TipBubble className="tip-inline" text={tip.text} onGotIt={tip.onGotIt} /> : null}
        {/* S10-06 (mockup frame 2): the dates are tiles, each the shared DateField under a small label. */}
        <div className="tl-edit-dates">
          <label className="tl-tile"><span className="tl-tile-label">Start</span><DateField className="tl-tile-field" opens={panel ? "down" : "up"} value={draft.startDate} disabled={busy} onChange={onDate("startDate")} /></label>
          <label className="tl-tile"><span className="tl-tile-label">End</span><DateField className="tl-tile-field" opens={panel ? "down" : "up"} value={draft.endDate} disabled={busy} onChange={onDate("endDate")} /></label>
        </div>
        {pace ? <p className="tl-pace" data-pace><Clock size={18} weight="regular" aria-hidden="true" />{pace}</p> : null}
        {ended ? (
          <div className="ended-row" data-ended={ended.endedAs}>
            <span className="ended-text">{endedWords(ended.endedAs, ended.endedOn)}</span>
            {onChangeEnding ? <button type="button" className="btn btn-secondary" disabled={busy} aria-label={`Change how ${s.title} ended`} onClick={onChangeEnding}>Change</button> : null}
          </div>
        ) : null}
        {copies}
        <div className="tl-edit-ends">
          <button type="button" className="btn btn-secondary tl-copy-btn" disabled={busy} onClick={onCopy}>Copy</button>
          <div className="tl-more" ref={moreRef}>
            <button type="button" className="btn btn-secondary tl-more-btn" aria-expanded={more} aria-controls="tl-more-menu" onClick={() => setMore((m) => !m)}>More</button>
            {more && (
              <div id="tl-more-menu" className="tl-more-menu" role="group" aria-label="More">
                <button type="button" disabled={busy} onClick={() => { setMore(false); onUpdateStatus(); }}>Update status</button>
                <button type="button" disabled={busy} onClick={() => { setMore(false); onUpdateEstimate(); }}>Update time estimate</button>
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
