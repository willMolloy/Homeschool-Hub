/**
 * T-04/T-05/T-05c: the year at a glance. A title with the zoom presets beside it (‹ month › under them for
 * This month), then the timeline across the page's
 * full width (full-bleed on phones). Changing zoom crossfades the old picture out over the new one, names included
 * (T-06: names sit inside the bars wherever they fit). T-07: tapping a bar selects it and opens the adjust sheet.
 */
import { useMemo, useRef, useState } from "react";
import { ApiError, apiPatch } from "../api/client";
import type { Assignment } from "../api/types";
import { AdjustSheet } from "../features/timeline/AdjustSheet";
import { hitTest } from "../features/timeline/hit";
import { selectionFor } from "../features/timeline/select";
import { layoutTimeline } from "../features/timeline/layout";
import type { TimelineModel } from "../features/timeline/model";
import type { MeasureText } from "../features/timeline/names";
import { Timeline } from "../features/timeline/Timeline";
import { TimelineLanesList } from "../features/timeline/TimelineLanesList";
import { useMeasureText } from "../features/timeline/useMeasureText";
import { useElementWidth } from "../features/timeline/useElementWidth";
import { useTimelineData } from "../features/timeline/useTimelineData";
import { useZoomFade } from "../features/timeline/useZoomFade";
import { availableZooms, defaultMonth, gridMonths, ZOOM_LABEL, type DrawnDetail, type Zoom } from "../features/timeline/zoom";
import { MonthNav, monthName } from "../features/timeline/MonthNav";
import { ZoomPresets } from "../features/timeline/ZoomPresets";
import "../features/timeline/timeline.css";

/** Width used before anything can be measured (the smallest phone we design for). */
const FALLBACK_WIDTH = 360;

interface LayoutArgs { width: number; measureText: MeasureText; month: string | null; previousDetail?: DrawnDetail }
const layoutFor = (model: TimelineModel | undefined, zoom: Zoom | null, a: LayoutArgs) =>
  model && zoom ? layoutTimeline(model, { zoom, ...a }) : undefined;

export function TimelinePage() {
  const { model, loading, failed, reload, assignments, applyAssignment } = useTimelineData();
  const { ref, width } = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const { zoom, leaving, setZoom, settle } = useZoomFade("year");
  const zooms = useMemo(() => (model ? availableZooms(model) : (["year"] as Zoom[])), [model]);
  const shownZoom = zooms.includes(zoom) ? zoom : "year";
  const measureText = useMeasureText();
  // T-05c: This month starts at the month holding today; ‹ › flip it.
  const months = useMemo(() => (model ? gridMonths(model) : []), [model]);
  const [pickedMonth, setMonth] = useState<string | null>(null);
  const month = pickedMonth && months.includes(pickedMonth) ? pickedMonth : model ? defaultMonth(model) : null;
  const choose = (z: Zoom) => {
    if (z === "month") setMonth(null);
    setZoom(z);
  };
  // The last detail drawn, for the detail threshold's hysteresis.
  const lastDetail = useRef<DrawnDetail | undefined>(undefined);
  const layout = useMemo(
    () => layoutFor(model, shownZoom, { width, measureText, month, previousDetail: lastDetail.current }),
    [model, shownZoom, width, measureText, month],
  );
  lastDetail.current = layout?.detail;
  const leavingLayout = useMemo(() => layoutFor(model, leaving, { width, measureText, month }), [model, leaving, width, measureText, month]);
  // T-07: the selection lives beside the zoom, so it survives zoom changes and month flips.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [originalEnds, setOriginalEnds] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const selection = model && selectedId ? selectionFor(model, assignments, selectedId) : null;
  const select = (id: string | null) => {
    setSelectedId(id);
    setSaveError(null);
  };
  const pick = (x: number, y: number) => select(layout ? hitTest(layout, x, y)?.assignmentId ?? null : null);
  const saveEnd = async (endDate: string) => {
    if (!selection) return;
    const { assignmentId: id, endDate: before } = selection;
    setBusy(true);
    setSaveError(null);
    try {
      const saved = await apiPatch<Assignment>(`/api/assignments/${id}`, { endDate });
      setOriginalEnds((o) => {
        const first = o[id] ?? before;
        const next = { ...o };
        if (saved.endDate === first) delete next[id];
        else next[id] = first;
        return next;
      });
      applyAssignment(saved);
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : "Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  };
  const empty = model !== undefined && model.lanes.length === 0;
  const ready = !failed && !loading && model && layout && !empty;

  return (
    <>
      <header className="timeline-page-header">
        <h1>Timeline</h1>
        {ready && <ZoomPresets zooms={zooms} value={shownZoom} onChange={choose} />}
      </header>
      {ready && shownZoom === "month" && month && <MonthNav months={months} value={month} onChange={setMonth} />}
      <div ref={ref} className="timeline-bleed">
        {failed ? (
          <p role="alert">
            Couldn't load the timeline. <button type="button" className="btn btn-secondary" onClick={reload}>Retry</button>
          </p>
        ) : loading || !model || !layout ? (
          <p aria-busy="true">Loading…</p>
        ) : empty ? (
          <p>Nothing planned yet.</p>
        ) : (
          <>
            <div className="tl-stage">
              <div key={shownZoom} className={leavingLayout ? "tl-entering" : undefined}>
                <Timeline layout={layout} label={`${shownZoom === "month" && month ? monthName(month) : ZOOM_LABEL[shownZoom]} timeline`}
                  selectedId={selection ? selectedId : null} onPick={pick} />
              </div>
              {leavingLayout && (
                <div className="tl-leaving" aria-hidden="true" onAnimationEnd={settle}>
                  <Timeline layout={leavingLayout} label="" selectedId={selection ? selectedId : null} />
                </div>
              )}
            </div>
            <TimelineLanesList model={model} onSelect={select} />
            {selection && (
              <AdjustSheet selection={selection} originalEnd={originalEnds[selection.assignmentId] ?? null}
                busy={busy} error={saveError} onEnd={(d) => void saveEnd(d)} onClose={() => select(null)} />
            )}
          </>
        )}
      </div>
    </>
  );
}
