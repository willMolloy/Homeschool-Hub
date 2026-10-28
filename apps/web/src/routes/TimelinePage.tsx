/**
 * T-04: the year at a glance. One title, then the timeline at Year zoom across the page's full width
 * (full-bleed on phones). Nothing else: zoom presets arrive in T-05, names in the bars in T-06.
 */
import { useMemo } from "react";
import { layoutTimeline } from "../features/timeline/layout";
import { Timeline } from "../features/timeline/Timeline";
import { TimelineLanesList } from "../features/timeline/TimelineLanesList";
import { useElementWidth } from "../features/timeline/useElementWidth";
import { useTimelineData } from "../features/timeline/useTimelineData";
import "../features/timeline/timeline.css";

/** Width used before anything can be measured (the smallest phone we design for). */
const FALLBACK_WIDTH = 360;

export function TimelinePage() {
  const { model, loading, failed, reload } = useTimelineData();
  const { ref, width } = useElementWidth<HTMLDivElement>(FALLBACK_WIDTH);
  const layout = useMemo(() => (model ? layoutTimeline(model, { zoom: "year", width }) : undefined), [model, width]);
  const empty = model !== undefined && model.lanes.length === 0;

  return (
    <>
      <header className="timeline-page-header">
        <h1>Timeline</h1>
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
            <Timeline layout={layout} label="Year timeline" />
            <TimelineLanesList model={model} />
          </>
        )}
      </div>
    </>
  );
}
