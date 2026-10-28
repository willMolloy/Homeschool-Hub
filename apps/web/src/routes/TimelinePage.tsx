/**
 * T-04/T-05/T-05c: the year at a glance. A title with the zoom presets beside it (‹ month › under them for
 * This month), then the timeline across the page's
 * full width (full-bleed on phones). Changing zoom crossfades the old picture out over the new one, names included
 * (T-06: names sit inside the bars wherever they fit).
 */
import { useMemo, useRef, useState } from "react";
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
  const { model, loading, failed, reload } = useTimelineData();
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
                <Timeline layout={layout} label={`${shownZoom === "month" && month ? monthName(month) : ZOOM_LABEL[shownZoom]} timeline`} />
              </div>
              {leavingLayout && (
                <div className="tl-leaving" aria-hidden="true" onAnimationEnd={settle}>
                  <Timeline layout={leavingLayout} label="" />
                </div>
              )}
            </div>
            <TimelineLanesList model={model} />
          </>
        )}
      </div>
    </>
  );
}
