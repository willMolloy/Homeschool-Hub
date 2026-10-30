/**
 * T-04: draws a TimelineLayout as one SVG. Pure rendering: every position comes from layout.ts.
 * Back to front: breaks, gridlines, bands, event strips, Today. One path per band and per event, so the Year view
 * stays well under 300 nodes. Colours are the `--tl-*` tokens (palette and theme switch without a re-render).
 */
import { useId } from "react";
import { bandExtent } from "./drag";
import { AXIS_HEIGHT_PX, LABEL_ROW_PX, type TimelineLayout } from "./layout";
import type { ChildStep } from "./model";

/** Room under the lanes for the Today pill. */
export const TODAY_PILL_PX = 22;
const PILL_W = 44;
const PILL_H = 18;
/** Baseline of 12 px text in a 16 px label row. */
const LABEL_BASELINE = LABEL_ROW_PX - 4;
/** T-08b: the grip at each end of the selected bar: a small pill in the bar's label colour. */
export const HANDLE_W_PX = 4;
export const HANDLE_INSET_PX = 3;
const HANDLE_H = (rowHeight: number) => Math.min(14, Math.max(8, rowHeight - 6));

const STEP_SUFFIX: Record<ChildStep, string> = { base: "", light: "-light", dark: "-dark" };
export const bandFill = (slot: number, step: ChildStep) => `var(--tl-subject-${slot}${STEP_SUFFIX[step]})`;
/** T-06: the AA label colour picked for each swatch (light or dark text, from the tokens). */
export const nameFill = (slot: number, step: ChildStep) => `var(--tl-subject-${slot}${STEP_SUFFIX[step]}-label)`;

/** T-05b: the label of the summed bar pinned above the lanes. */
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
}

export function Timeline({ layout, label, selectedId = null, onPick, flashId = null }: TimelineProps) {
  const hatchId = `tl-hatch-${useId().replace(/:/g, "")}`;
  /** T-05c: zoomed out, breaks are a very faint plain tint instead of a hatch. */
  const quiet = layout.detail === "smooth";
  const bottom = Math.max(layout.lanesBottom, layout.totals.y + layout.totals.height);
  const height = layout.height + (layout.todayX === null ? 0 : TODAY_PILL_PX);
  const dim = (id: string) => (selectedId === null ? "" : id === selectedId ? " tl-selected" : " tl-dim") + (id === flashId ? " tl-flash" : "");
  // T-08b: one pair of grips per lane the selected assignment is drawn in, at its outer ends.
  const handles = selectedId === null ? [] : layout.bands.filter((b, i, all) => b.assignmentId === selectedId && b.d
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

      <g className="tl-labels">
        <text className="tl-lane-label" x={layout.plot.x} y={layout.totals.labelY + LABEL_BASELINE}>{TOTALS_LABEL}</text>
        {layout.labels.map((l) => (
          <text key={l.laneKey} className="tl-lane-label" x={l.x} y={l.y + LABEL_BASELINE}>{l.text}</text>
        ))}
      </g>

      <g className="tl-bands">
        {layout.totals.d ? <path className="tl-totals" d={layout.totals.d} /> : null}
        {layout.bands.flatMap((b) => b.connectors.map((c, k) => (
          <line key={`c-${b.rowKey}-${b.assignmentId}-${k}`} className={`tl-connector${dim(b.assignmentId)}`} x1={c.x0} x2={c.x1} y1={b.cy} y2={b.cy}
            style={{ stroke: bandFill(b.paletteSlot, b.step) }} data-connector-for={b.assignmentId} />
        )))}
        {layout.bands.map((b) => (b.d ? (
          <path key={`${b.rowKey}-${b.assignmentId}`} className={`tl-band${dim(b.assignmentId)}`} d={b.d} style={{ fill: bandFill(b.paletteSlot, b.step) }}
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
          <line x1={layout.todayX} x2={layout.todayX} y1={AXIS_HEIGHT_PX - 4} y2={bottom + 4} />
          <rect x={pillX} y={bottom + 4} width={PILL_W} height={PILL_H} rx={PILL_H / 2} />
          <text x={pillX + PILL_W / 2} y={bottom + 4 + PILL_H - 5} textAnchor="middle">Today</text>
        </g>
      )}
    </svg>
  );
}
