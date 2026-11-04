/**
 * T-05: the zoom presets as one quiet group of toggle buttons. Hidden when only Year makes sense.
 * S7-04: the family's own views are labelled by `labelOf`; a long row scrolls sideways on phones.
 * S7-05: `onEdit` adds a quiet Edit at the end of the row (outside the toggle group), shown even when only Year is left.
 * S9b-05 (N11): when the row scrolls, the edge with more presets past it fades out (data-more), so a cut-off chip reads as
 * "scroll for more"; a very long view name ends in "…" (its full name stays the button's name and its tooltip).
 * S10-08: Edit is a pencil, "Edit views", pinned at the row's end (outside the scrolling group, so it stays put while the chips scroll).
 * S10-19 (R4): the fade alone was too weak a cue at 320 px with a long term name, so a scrolling edge also shows a caret over
 * the fade (decorative; the chips themselves stay the way to choose), and on phones a chip is at most 7.5rem wide.
 */
import { CaretLeft, CaretRight, PencilSimple } from "@phosphor-icons/react";
import { useCallback, useLayoutEffect, useRef, useState } from "react";
import { zoomLabel, type Zoom } from "./zoom";

type More = "start" | "end" | "both" | undefined;
/** Which edges of a scrolling row have more past them. */
export function moreEdges(el: { scrollLeft: number; scrollWidth: number; clientWidth: number }): More {
  const before = el.scrollLeft > 1;
  const after = el.scrollLeft + el.clientWidth < el.scrollWidth - 1;
  return before && after ? "both" : before ? "start" : after ? "end" : undefined;
}

export interface ZoomPresetsProps {
  zooms: readonly Zoom[];
  value: Zoom;
  onChange: (zoom: Zoom) => void;
  /** The words for a zoom; default: the built-in names. */
  labelOf?: (zoom: Zoom) => string;
  /** S7-05: opens the zoom views editor. */
  onEdit?: () => void;
}

export function ZoomPresets({ zooms, value, onChange, labelOf = (z) => zoomLabel(z), onEdit }: ZoomPresetsProps) {
  const row = useRef<HTMLDivElement>(null);
  const [more, setMore] = useState<More>(undefined);
  const measure = useCallback(() => { if (row.current) setMore(moreEdges(row.current)); }, []);
  useLayoutEffect(() => {
    measure();
    if (typeof ResizeObserver === "undefined" || !row.current) return;
    const ro = new ResizeObserver(measure);
    ro.observe(row.current);
    return () => ro.disconnect();
  }, [measure, zooms.length]);
  if (zooms.length < 2 && !onEdit) return null;
  return (
    <div className="tl-zoom-row" data-edit={onEdit ? "" : undefined}>
      {zooms.length >= 2 ? (
        <div ref={row} className="tl-zoom" role="group" aria-label="Zoom" data-more={more} onScroll={measure}>
          {zooms.map((z) => (
            <button key={z} type="button" aria-pressed={z === value} title={labelOf(z)} onClick={() => onChange(z)}>
              {labelOf(z)}
            </button>
          ))}
        </div>
      ) : null}
      {more === "start" || more === "both" ? <CaretLeft className="tl-zoom-more tl-zoom-more-start" size={16} weight="bold" aria-hidden="true" /> : null}
      {more === "end" || more === "both" ? <CaretRight className="tl-zoom-more tl-zoom-more-end" size={16} weight="bold" aria-hidden="true" /> : null}
      {onEdit ? <button type="button" className="tl-zoom-edit" aria-label="Edit views" title="Edit views" onClick={onEdit}><PencilSimple size={20} aria-hidden="true" /></button> : null}
    </div>
  );
}
