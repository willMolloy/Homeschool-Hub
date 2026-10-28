/**
 * T-07: the sheet for one selected assignment. It only exists while something is selected, so its buttons are
 * hidden (not disabled) until then (DeeDee's T-02b rule). Essentials only: title, subject · child, dates, buttons.
 */
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { dateRange } from "../schedule/formBits";
import { canEndEarlier, shiftEnd, type Selection } from "./select";

export interface AdjustSheetProps {
  selection: Selection;
  /** The end before the first change in this visit; null when unchanged (no Reset). */
  originalEnd: string | null;
  busy: boolean;
  error: string | null;
  onEnd: (endDate: string) => void;
  onClose: () => void;
}

export function AdjustSheet({ selection: s, originalEnd, busy, error, onEnd, onClose }: AdjustSheetProps) {
  return (
    <ResponsiveSheet open onOpenChange={(open) => { if (!open) onClose(); }} title={s.title}>
      <div className="tl-adjust">
        <p className="tl-adjust-line">{s.subtitle}</p>
        <p className="tl-adjust-line">{dateRange(s.startDate, s.endDate)}</p>
        {error && <p className="tl-adjust-error" role="alert">{error}</p>}
        <div className="tl-adjust-actions">
          {canEndEarlier(s.startDate, s.endDate) && (
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => onEnd(shiftEnd(s.endDate, -1))}>End one week earlier</button>
          )}
          <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => onEnd(shiftEnd(s.endDate, 1))}>End one week later</button>
          {originalEnd !== null && originalEnd !== s.endDate && (
            <button type="button" className="btn btn-secondary" disabled={busy} onClick={() => onEnd(originalEnd)}>Reset</button>
          )}
        </div>
      </div>
    </ResponsiveSheet>
  );
}
