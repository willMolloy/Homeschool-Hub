/**
 * T-04/T-05/T-05c: the year at a glance. A title with the zoom presets beside it (‹ month › under them for
 * This month), then the timeline across the page's
 * full width (full-bleed on phones). Changing zoom crossfades the old picture out over the new one, names included
 * (T-06: names sit inside the bars wherever they fit). T-07/T-07e: tapping a bar selects it and shows the edit bar at the bottom.
 * T-08: bars can be dragged (body moves, edges change the start or end), previewing live and saving on release.
 * T-07c: with two or more children, a chip row (All, then each child) narrows it to one child, kept in `?child=`.
 * T-10: "+ Add assignment" in the header opens the assignment form; the new bar appears at once, briefly highlighted.
 * S3a-02: the edit bar's Copy opens that form prefilled from the selected assignment.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Assignment } from "../api/types";
import { AddAssignmentButton, AddAssignmentSheet } from "../features/timeline/AddAssignment";
import { copyOfAssignment } from "../features/schedule/copyAssignment";
import { makeLookups } from "../features/schedule/lookups";
import type { Draft } from "../features/schedule/ScheduleList";
import { afterAdd } from "../features/timeline/afterAdd";
import { EditBar } from "../features/timeline/EditBar";
import { useAssignmentEdit } from "../features/timeline/useAssignmentEdit";
import { useKeepAbove } from "../features/timeline/useKeepAbove";
import { grabSelected, previewModel } from "../features/timeline/drag";
import { useBarDrag, type DragPreview } from "../features/timeline/useBarDrag";
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
import { ChildFilter } from "../features/timeline/ChildFilter";
import { filterChildren, forChild, shownChild } from "../features/timeline/childView";
import { useChildParam } from "../features/timeline/useChildParam";
import "../features/timeline/timeline.css";

/** Width used before anything can be measured (the smallest phone we design for). */
const FALLBACK_WIDTH = 360;
/** T-10: how long a just-added bar stays highlighted (keep in step with tl-flash in timeline.css). */
export const FLASH_MS = 2400;

interface LayoutArgs { width: number; measureText: MeasureText; month: string | null; previousDetail?: DrawnDetail }
const layoutFor = (model: TimelineModel | undefined, zoom: Zoom | null, a: LayoutArgs) =>
  model && zoom ? layoutTimeline(model, { zoom, ...a }) : undefined;

export function TimelinePage() {
  const { model: family, loading, failed, reload, assignments, applyAssignment, addAssignment, applySubject, children, subjects } = useTimelineData();
  const childList = useMemo(() => filterChildren(children, family), [children, family]);
  const [childParam, setChild] = useChildParam();
  const childId = shownChild(childParam, childList);
  const model = useMemo(() => (family ? forChild(family, childId) : undefined), [family, childId]);
  // T-08: while a bar is dragged, the picture draws from a preview model (that assignment over its new dates).
  const [preview, setPreview] = useState<DragPreview | null>(null);
  const drawn = useMemo(() => (model && preview ? previewModel(model, preview.assignmentId, preview.span) : model), [model, preview]);
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
    () => layoutFor(drawn, shownZoom, { width, measureText, month, previousDetail: lastDetail.current }),
    [drawn, shownZoom, width, measureText, month],
  );
  lastDetail.current = layout?.detail;
  const leavingLayout = useMemo(() => layoutFor(model, leaving, { width, measureText, month }), [model, leaving, width, measureText, month]);
  // T-07: the selection lives beside the zoom, so it survives zoom changes and month flips.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const edit = useAssignmentEdit(applyAssignment);
  const picked = model && selectedId ? selectionFor(model, assignments, selectedId) : null;
  const selection = picked && preview?.assignmentId === picked.assignmentId ? { ...picked, ...preview.span } : picked;
  const select = (id: string | null) => {
    setSelectedId(id);
    edit.clearError();
  };
  const pick = (x: number, y: number) => select(layout ? (grabSelected(layout, selectedId, x, y)?.band ?? hitTest(layout, x, y))?.assignmentId ?? null : null);
  const stage = useRef<HTMLDivElement>(null);
  const keep = useKeepAbove<HTMLElement>(selection ? selectedId : null,
    (id) => [...(stage.current?.querySelectorAll(`:scope > :not(.tl-leaving) path[data-assignment="${id}"]`) ?? [])]);
  const drag = useBarDrag({
    stage, layout, model, zoom: shownZoom, selectedId: selection ? selectedId : null,
    spanOf: (id) => { const a = assignments.find((x) => x.id === id); return a ? { startDate: a.startDate, endDate: a.endDate } : null; },
    onSelect: select, onPreview: setPreview, onCommit: edit.save,
  });
  const closeEdit = useCallback(() => setSelectedId(null), []);
  // T-10: adding an assignment. The new bar flashes once it is drawn, with the filter and month moved to show it.
  const [adding, setAdding] = useState(false);
  const [copying, setCopying] = useState<Draft<Assignment> | null>(null);
  const lookups = useMemo(() => makeLookups(children, subjects, applySubject), [children, subjects, applySubject]);
  const [flashId, setFlashId] = useState<string | null>(null);
  useEffect(() => {
    if (!flashId) return;
    const t = setTimeout(() => setFlashId(null), FLASH_MS);
    return () => clearTimeout(t);
  }, [flashId]);
  const closeAdd = () => {
    setAdding(false);
    setCopying(null);
  };
  const copySelected = () => {
    const a = assignments.find((x) => x.id === selectedId);
    if (!a) return;
    setCopying(copyOfAssignment(a, lookups));
    setAdding(true);
  };
  const added = (created: Assignment) => {
    closeAdd();
    addAssignment(created);
    const next = afterAdd(created, { childId, zoom: shownZoom, month, months });
    if (next.showAllChildren) setChild(null);
    if (next.month) setMonth(next.month);
    select(null);
    setFlashId(created.id);
  };
  const empty = model !== undefined && model.lanes.length === 0;
  const ready = !failed && !loading && model && layout && !empty;

  return (
    <>
      <header className="timeline-page-header">
        <h1>Timeline</h1>
        {!failed && !loading && model && <AddAssignmentButton onClick={() => { setCopying(null); setAdding(true); }} />}
        {ready && <ZoomPresets zooms={zooms} value={shownZoom} onChange={choose} />}
      </header>
      {ready && <ChildFilter childList={childList} value={childId} onChange={setChild} />}
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
            <div ref={stage} className="tl-stage" data-drag-ready={selection ? "" : undefined} {...drag}>
              <div key={shownZoom} className={leavingLayout ? "tl-entering" : undefined}>
                <Timeline layout={layout} label={`${shownZoom === "month" && month ? monthName(month) : ZOOM_LABEL[shownZoom]} timeline`}
                  selectedId={selection ? selectedId : null} onPick={pick} flashId={flashId} />
              </div>
              {leavingLayout && (
                <div className="tl-leaving" aria-hidden="true" onAnimationEnd={settle}>
                  <Timeline layout={leavingLayout} label="" selectedId={selection ? selectedId : null} />
                </div>
              )}
            </div>
            <TimelineLanesList model={model} onSelect={select} />
            {selection && (
              <>
                <div className="tl-edit-room" style={{ height: keep.height }} aria-hidden="true" />
                <EditBar ref={keep.ref} selection={selection} original={edit.originals[selection.assignmentId] ?? null}
                  busy={edit.busy} error={edit.error} onSave={(d) => void edit.save(selection.assignmentId, selection, d)} onCopy={copySelected} onClose={closeEdit} />
              </>
            )}
          </>
        )}
      </div>
      <AddAssignmentSheet open={adding} lookups={lookups} initial={copying} onSaved={added} onClose={closeAdd} />
    </>
  );
}
