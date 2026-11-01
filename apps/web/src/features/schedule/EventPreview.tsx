/** S5-02: "What changes" under the event form's rules: the plan's change from the draft, before it is saved. */
import { useEffect, useRef, useState } from "react";
import { apiPost } from "../../api/client";
import type { EventPreview, EventPreviewRow } from "../../api/types";
import { UNIT_LABELS, unitNumber } from "../../components/unitLabels";
import { shortDate } from "./formBits";

/** Quiet time after the last change before the preview is asked for. */
export const PREVIEW_DEBOUNCE_MS = 400;
/** Rows shown; the rest become "and N more". */
export const PREVIEW_ROWS = 5;

/**
 * The preview of `draft` (null while the form isn't valid). Asked for once the draft has stood still for 400 ms.
 * While a new answer loads the last one stays; an error shows nothing and never gets in the way of Save.
 */
export function useEventPreview(draft: object | null, eventId: string | null): EventPreview | null {
  const [preview, setPreview] = useState<EventPreview | null>(null);
  const key = draft ? JSON.stringify([draft, eventId]) : null;
  const latest = useRef<string | null>(null);
  useEffect(() => {
    latest.current = key;
    if (key === null) {
      setPreview(null);
      return;
    }
    const timer = setTimeout(() => {
      apiPost<EventPreview>("/api/plan/preview-event", { event: draft, ...(eventId ? { eventId } : {}) }).then(
        (p) => { if (latest.current === key) setPreview(p); },
        () => { if (latest.current === key) setPreview(null); },
      );
    }, PREVIEW_DEBOUNCE_MS);
    return () => clearTimeout(timer);
    // `key` stands for `draft` and `eventId`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);
  return preview;
}

/** "Treasure Island (Frank): 5 → 6 pages a day · Ends Nov 24, 2026" */
export function previewLine(r: EventPreviewRow): string {
  const unit = UNIT_LABELS[r.unitType][r.after.perDay === 1 ? "one" : "many"];
  const ends = r.after.end !== r.before.end ? ` · Ends ${shortDate(r.after.end)}` : "";
  return `${r.title} (${r.childName}): ${unitNumber(r.before.perDay)} → ${unitNumber(r.after.perDay)} ${unit} a day${ends}`;
}

export function EventPreviewList({ preview }: { preview: EventPreview | null }) {
  if (!preview) return null;
  const shown = preview.changes.slice(0, PREVIEW_ROWS);
  const more = preview.changes.length - shown.length + preview.more;
  return (
    <div className="event-preview" aria-live="polite">
      <p className="event-preview-title">What changes</p>
      {shown.length === 0 ? <p className="hint">No change to the plan.</p> : (
        <ul>
          {shown.map((r) => <li key={`${r.assignmentId}/${r.childId}`}>{previewLine(r)}</li>)}
          {more > 0 ? <li>and {more} more</li> : null}
        </ul>
      )}
    </div>
  );
}
