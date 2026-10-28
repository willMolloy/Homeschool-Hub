/**
 * T-04/T-05: the year at a glance. A title with the zoom presets beside it, then the timeline across the page's
 * full width (full-bleed on phones). Changing zoom crossfades the old picture out over the new one, names included
 * (T-06: names sit inside the bars wherever they fit).
 */
import { useMemo } from "react";
import { layoutTimeline } from "../features/timeline/layout";
import type { TimelineModel } from "../features/timeline/model";
import type { MeasureText } from "../features/timeline/names";
import { Timeline } from "../features/timeline/Timeline";
import { TimelineLanesList } from "../features/timeline/TimelineLanesList";
import { useMeasureText } from "../features/timeline/useMeasureText";
import { useElementWidth } from "../features/timeline/useElementWidth";
import { useTimelineData } from "../features/timeline/useTimelineData";
import { useZoomFade } from "../features/timeline/useZoomFade";
import { availableZooms, ZOOM_LABEL, type Zoom } from "../features/timeline/zoom";
import { ZoomPresets } from "../features/timeline/ZoomPresets";
import "../features/timeline/timeline.css";

/** Width used before anything can be measured (the smallest phone we design for). */
const FALLBACK_WIDTH = 360;

const layoutFor = (model: TimelineModel | undefined, zoom: Zoom | null, width: number, measureText: MeasureText) =>
  model && zoom ? layoutTimeline(model, { zoom, width, measureText }) : undefined;

export function TimelinePage() {
  const { model, loading, failed, reload } = useTimelineData();
  const { ref, width } = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const { zoom, leaving, setZoom, settle } = useZoomFade("year");
  const zooms = useMemo(() => (model ? availableZooms(model) : (["year"] as Zoom[])), [model]);
  const shownZoom = zooms.includes(zoom) ? zoom : "year";
  const measureText = useMeasureText();
  const layout = useMemo(() => layoutFor(model, shownZoom, width, measureText), [model, shownZoom, width, measureText]);
  const leavingLayout = useMemo(() => layoutFor(model, leaving, width, measureText), [model, leaving, width, measureText]);
  const empty = model !== undefined && model.lanes.length === 0;
  const ready = !failed && !loading && model && layout && !empty;

  return (
    <>
      <header className="timeline-page-header">
        <h1>Timeline</h1>
        {ready && <ZoomPresets zooms={zooms} value={shownZoom} onChange={setZoom} />}
      </header>
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
                <Timeline layout={layout} label={`${ZOOM_LABEL[shownZoom]} timeline`} />
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
