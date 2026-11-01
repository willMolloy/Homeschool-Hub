/**
 * T-04: draws a TimelineLayout as one SVG. Pure rendering: every position comes from layout.ts.
 * Back to front: breaks, gridlines, bands, event strips, Today. One path per band and per event, so the Year view
 * stays well under 300 nodes. Colours are the `--tl-*` tokens (palette and theme switch without a re-render).
 */
import { useEffect, useId, useState, type CSSProperties } from "react";
import { ChartBar } from "@phosphor-icons/react";
import type { Subject } from "../../api/types";
import { SubjectBadge } from "../subjects/SubjectIcon";
import { bandExtent } from "./drag";
import { AXIS_HEIGHT_PX, BADGE_HIT_PX, BADGE_PX, GUTTER_PX, type TimelineLayout } from "./layout";
import type { ChildStep } from "./model";

/** Room under the lanes for the Today pill. */
export const TODAY_PILL_PX = 22;
const PILL_W = 44;
const PILL_H = 18;
/** T-08b: the grip at each end of the selected bar: a small pill in the bar's label colour. */
export const HANDLE_W_PX = 4;
export const HANDLE_INSET_PX = 3;
const HANDLE_H = (rowHeight: number) => Math.min(14, Math.max(8, rowHeight - 6));

const STEP_SUFFIX: Record<ChildStep, string> = { base: "", light: "-light", dark: "-dark" };
export const bandFill = (slot: number, step: ChildStep) => `var(--tl-subject-${slot}${STEP_SUFFIX[step]})`;
/** T-06: the AA label colour picked for each swatch (light or dark text, from the tokens). */
export const nameFill = (slot: number, step: ChildStep) => `var(--tl-subject-${slot}${STEP_SUFFIX[step]}-label)`;

/** T-05b: the summed bar pinned above the lanes. S8-07: it has no text label; its chart icon in the gutter says so (title and name). */
export const TOTALS_LABEL = "All subjects";

export interface TimelineProps {
  layout: TimelineLayout;
  /** The accessible name of the picture (the lanes are listed for screen readers next to it). */
  label: string;
  /** T-07: the selected assignment; the other bars and names dim. */
  selectedId?: string | null;
  /** T-07: a click or tap on the picture, in its own coordinates. */
  onPick?: (x: number, y: number) => void;
  /** T-10: a just-added assignment, briefly highlighted. */
  flashId?: string | null;
  /** S7-20: draw the selected bar's end grips (only meaningful while bars can be dragged). */
  grips?: boolean;
  /** S8-07: the family's subjects, for each lane badge's icon (a missing subject shows its first letter). */
  subjects?: readonly Pick<Subject, "id" | "name" | "icon">[];
}

export function Timeline({ layout, label, selectedId = null, onPick, flashId = null, grips = true, subjects = [] }: TimelineProps) {
  const hatchId = `tl-hatch-${useId().replace(/:/g, "")}`;
  /** T-05c: zoomed out, breaks are a very faint plain tint instead of a hatch. */
  const quiet = layout.detail === "smooth";
  const bottom = Math.max(layout.lanesBottom, layout.totals.y + layout.totals.height);
  const height = layout.height + (layout.todayX === null ? 0 : TODAY_PILL_PX);
  // S8-07: tapping a lane's badge names its subject in a small popover and highlights that lane (the other lanes dim).
  const [lane, setLane] = useState<string | null>(null);
  const laneIds = new Map(layout.bands.map((b) => [b.assignmentId, b.laneKey]));
  useEffect(() => {
    if (lane === null) return;
    const away = (e: Event) => { if (!(e.target instanceof Element) || !e.target.closest(".tl-gutter")) setLane(null); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setLane(null); };
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", away); document.removeEventListener("keydown", esc); };
  }, [lane]);
  const picked = lane !== null && layout.badges.some((b) => b.laneKey === lane) ? lane : null;
  const dim = (id: string) => {
    const base = selectedId === null ? "" : id === selectedId ? " tl-selected" : " tl-dim";
    const lit = picked === null || selectedId !== null ? "" : laneIds.get(id) === picked ? "" : " tl-dim";
    return base + lit + (id === flashId ? " tl-flash" : "");
  };
  // T-08b: one pair of grips per lane the selected assignment is drawn in, at its outer ends.
  const handles = selectedId === null || !grips ? [] : layout.bands.filter((b, i, all) => b.assignmentId === selectedId && b.d
    && all.findIndex((o) => o.assignmentId === selectedId && o.laneKey === b.laneKey && o.d) === i).flatMap((b) => {
    const extent = bandExtent(layout, b);
    const row = layout.rows.find((r) => r.key === b.rowKey);
    if (!extent || !row) return [];
    const h = HANDLE_H(row.height);
    const xs = [extent[0] + HANDLE_INSET_PX, extent[1] - HANDLE_INSET_PX - HANDLE_W_PX];
    return xs.map((x, k) => ({ key: `${b.laneKey}-${k}`, x, y: b.cy - h / 2, h, fill: nameFill(b.paletteSlot, b.step) }));
  });
  const pillX = layout.todayX === null ? 0 : Math.max(0, Math.min(layout.width - PILL_W, layout.todayX - PILL_W / 2));

  return (
    <div className="tl-wrap" style={{ width: layout.width, height }}>
    <svg className="tl-svg" width={layout.width} height={height} viewBox={`0 0 ${layout.width} ${height}`} role="img" aria-label={label} data-pickable={onPick ? "" : undefined}
      onClick={onPick ? (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onPick(e.clientX - r.left, e.clientY - r.top);
      } : undefined}>
      <defs>
        <pattern id={hatchId} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line className="tl-hatch-line" x1={0} y1={0} x2={0} y2={6} />
        </pattern>
      </defs>

      <g className="tl-breaks">
        {layout.breaks.map((b, i) => (
          <rect key={`${b.breakId}-${i}`} x={b.x} y={b.y} width={b.width} height={b.height}
            className={quiet ? "tl-break-quiet" : undefined} fill={quiet ? undefined : `url(#${hatchId})`}>
            {b.label ? <title>{b.label}</title> : null}
          </rect>
        ))}
      </g>

      <g className="tl-grid">
        {layout.ticks.map((t) => (
          <line key={`${t.kind}-${t.index}`} className={t.kind === "month" ? "tl-tick-month" : "tl-tick-week"}
            x1={t.x} x2={t.x} y1={AXIS_HEIGHT_PX - 4} y2={bottom} />
        ))}
        {layout.ticks.map((t) => (t.label ? (
          <text key={`label-${t.index}`} className="tl-axis-label" x={t.x + 3} y={AXIS_HEIGHT_PX - 7}>{t.label}</text>
        ) : null))}
      </g>

      <g className="tl-bands">
        {layout.totals.d ? <path className="tl-totals" d={layout.totals.d} /> : null}
        {layout.bands.flatMap((b) => b.connectors.map((c, k) => (
          <line key={`c-${b.rowKey}-${b.assignmentId}-${k}`} className={`tl-connector${dim(b.assignmentId)}`} x1={c.x0} x2={c.x1} y1={b.cy} y2={b.cy}
            style={{ stroke: bandFill(b.paletteSlot, b.step) }} data-connector-for={b.assignmentId} />
        )))}
        {layout.bands.map((b) => (b.d ? (
          <path key={`${b.rowKey}-${b.assignmentId}`} className={`tl-band${dim(b.assignmentId)}`} d={b.d} style={{ fill: bandFill(b.paletteSlot, b.step), stroke: `var(--tl-subject-${b.paletteSlot}-strong)` }}
            data-assignment={b.assignmentId} />
        ) : null))}
      </g>

      <g className="tl-names" aria-hidden="true">
        {layout.names.map((n) => (
          // T-11d: an inside name stays at full strength while its bar dims (it only gains contrast); an outside
          // name dims with its bar (page text at the dim opacity still meets AA).
          <g key={`${n.rowKey}-${n.assignmentId}-${n.piece}`} className={(n.outside ? dim(n.assignmentId) : dim(n.assignmentId).replace(" tl-dim", "")).trim() || undefined} data-name-for={n.assignmentId}>
            {n.outside
              ? <text className="tl-outside-name" x={n.textX} y={n.textY}>{n.text}</text>
              : <text className="tl-name" x={n.textX} y={n.textY} dominantBaseline="central" style={{ fill: nameFill(n.paletteSlot, n.step) }}>{n.text}</text>}
          </g>
        ))}
      </g>

      {handles.length > 0 && (
        <g className="tl-handles" aria-hidden="true">
          {handles.map((h) => <rect key={h.key} className="tl-handle" x={h.x} y={h.y} width={HANDLE_W_PX} height={h.h} rx={HANDLE_W_PX / 2} style={{ fill: h.fill }} />)}
        </g>
      )}

      <g className="tl-events">
        {layout.events.map((e) => (e.d ? (
          <path key={e.eventId} className="tl-event" d={e.d}><title>{e.name}</title></path>
        ) : null))}
      </g>

      {layout.todayX === null ? null : (
        <g className="tl-today" data-today>
          <line x1={layout.todayX} x2={layout.todayX} y1={layout.todayTop} y2={bottom + 4} />
          <rect x={pillX} y={bottom + 4} width={PILL_W} height={PILL_H} rx={PILL_H / 2} />
          <text x={pillX + PILL_W / 2} y={bottom + 4 + PILL_H - 5} textAnchor="middle">Today</text>
        </g>
      )}

    </svg>
    {/* S8-07: the gutter. One round badge per lane (the subject's icon, or its letter) and a chart icon for All subjects; no names on the picture. */}
    <div className="tl-gutter" style={{ width: GUTTER_PX }}>
      {layout.rows.length > 0 && (
        <span className="tl-total-icon" title={TOTALS_LABEL} style={{ top: layout.totals.cy - BADGE_PX / 2, width: GUTTER_PX, height: BADGE_PX } as CSSProperties}>
          <ChartBar size={14} weight="light" aria-hidden="true" />
        </span>
      )}
      {layout.badges.map((b) => (
        <button key={b.laneKey} type="button" className="tl-badge" aria-label={b.text} aria-pressed={picked === b.laneKey}
          style={{ top: b.top, height: Math.max(BADGE_HIT_PX, b.bottom - b.top), width: GUTTER_PX } as CSSProperties}
          onClick={() => setLane(picked === b.laneKey ? null : b.laneKey)}>
          <SubjectBadge subject={subjects.find((s) => s.id === b.subjectId) ?? { name: b.subjectName, icon: null }} slot={b.paletteSlot} size={BADGE_PX} />
        </button>
      ))}
      {layout.badges.filter((b) => b.laneKey === picked).map((b) => (
        <div key={b.laneKey} className="tl-lane-pop" role="status" style={{ top: b.cy - 14 }}>{b.text}</div>
      ))}
    </div>
    </div>
  );
}
