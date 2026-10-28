/**
 * T-08: pointer handling for dragging bars, spread on the timeline's stage. A mouse drags any bar straight away
 * (after DRAG_THRESHOLD_PX); touch and pen drag only the selected bar, so a finger on an unselected bar still
 * scrolls the page (the stage lets the browser pan vertically and pinch, see timeline.css). The dates preview while
 * dragging and save on release; a cancelled pointer (the browser took over to scroll) drops the drag.
 */
import { useRef } from "react";
import { bandExtent, DRAG_THRESHOLD_PX, draggedSpan, dragKind, grabSelected, type DragKind } from "./drag";
import { hitTest } from "./hit";
import type { TimelineLayout } from "./layout";
import type { TimelineModel } from "./model";
import { changedDates, type DateSpan } from "./select";
import type { Zoom } from "./zoom";

export interface DragPreview { assignmentId: string; span: DateSpan }

interface Press { pointerId: number; assignmentId: string; kind: DragKind; x: number; before: DateSpan; dragging: boolean; span: DateSpan }

export interface BarDragOptions {
  stage: React.RefObject<HTMLDivElement | null>;
  layout: TimelineLayout | undefined;
  model: TimelineModel | undefined;
  zoom: Zoom;
  selectedId: string | null;
  spanOf: (assignmentId: string) => DateSpan | null;
  onSelect: (assignmentId: string) => void;
  onPreview: (p: DragPreview | null) => void;
  onCommit: (assignmentId: string, before: DateSpan, after: DateSpan) => Promise<void>;
}

/** T-08b: the move cursor over a bar's body, the resize cursor over its ends. */
export const CURSOR: Record<DragKind, string> = { move: "move", start: "ew-resize", end: "ew-resize" };

export function useBarDrag(o: BarDragOptions) {
  const press = useRef<Press | null>(null);
  const suppressClick = useRef(false);
  const live = useRef(o);
  live.current = o;

  const local = (e: React.PointerEvent) => {
    const svg = live.current.stage.current?.querySelector(":scope > :not(.tl-leaving) svg");
    const r = svg?.getBoundingClientRect();
    return r ? { x: e.clientX - r.left, y: e.clientY - r.top } : null;
  };
  const grab = (e: React.PointerEvent): { assignmentId: string; kind: DragKind } | null => {
    const { layout, selectedId } = live.current;
    const p = local(e);
    const selected = layout && p ? grabSelected(layout, selectedId, p.x, p.y) : null;
    if (selected) return { assignmentId: selected.band.assignmentId, kind: selected.kind };
    const band = layout && p ? hitTest(layout, p.x, p.y) : null;
    const extent = band && layout ? bandExtent(layout, band) : null;
    return band && extent && p ? { assignmentId: band.assignmentId, kind: dragKind(extent, p.x) } : null;
  };
  const end = () => {
    press.current = null;
  };

  return {
    onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
      if (e.button !== 0 || !e.isPrimary) return;
      const hit = grab(e);
      if (!hit) return;
      if (e.pointerType !== "mouse" && hit.assignmentId !== live.current.selectedId) return;
      const before = live.current.spanOf(hit.assignmentId);
      if (!before) return;
      press.current = { pointerId: e.pointerId, ...hit, x: e.clientX, before, dragging: false, span: before };
    },
    onPointerMove(e: React.PointerEvent<HTMLDivElement>) {
      const p = press.current;
      if (!p) {
        if (e.pointerType === "mouse") {
          const hit = grab(e);
          e.currentTarget.style.cursor = hit ? CURSOR[hit.kind] : "";
        }
        return;
      }
      if (e.pointerId !== p.pointerId) return;
      const dx = e.clientX - p.x;
      if (!p.dragging) {
        if (Math.abs(dx) < DRAG_THRESHOLD_PX) return;
        p.dragging = true;
        e.currentTarget.setPointerCapture?.(e.pointerId);
        if (live.current.selectedId !== p.assignmentId) live.current.onSelect(p.assignmentId);
      }
      const { model, layout, zoom } = live.current;
      if (!model || !layout) return;
      const span = draggedSpan(model, layout, zoom, p.kind, p.before, dx);
      if (span.startDate === p.span.startDate && span.endDate === p.span.endDate) return;
      p.span = span;
      live.current.onPreview({ assignmentId: p.assignmentId, span });
    },
    onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
      const p = press.current;
      if (!p || e.pointerId !== p.pointerId) return;
      end();
      if (!p.dragging) return;
      suppressClick.current = true;
      if (!changedDates(p.before, p.span)) { live.current.onPreview(null); return; }
      void live.current.onCommit(p.assignmentId, p.before, p.span).finally(() => live.current.onPreview(null));
    },
    onPointerCancel(e: React.PointerEvent<HTMLDivElement>) {
      const p = press.current;
      if (!p || e.pointerId !== p.pointerId) return;
      end();
      if (p.dragging) live.current.onPreview(null);
    },
    onClickCapture(e: React.MouseEvent<HTMLDivElement>) {
      if (!suppressClick.current) return;
      suppressClick.current = false;
      e.stopPropagation();
    },
  };
}
