/**
 * T-04: draws a TimelineLayout as one SVG. Pure rendering: every position comes from layout.ts.
 * Back to front: breaks, gridlines, bands, event strips, Today. One path per band and per event, so the Year view
 * stays well under 300 nodes. Colours are the `--tl-*` tokens (palette and theme switch without a re-render).
 */
import { useId } from "react";
import { AXIS_HEIGHT_PX, LABEL_ROW_PX, type TimelineLayout } from "./layout";
import type { ChildStep } from "./model";

/** Room under the totals for the Today pill. */
export const TODAY_PILL_PX = 22;
const PILL_W = 44;
const PILL_H = 18;
/** Baseline of 12 px text in a 16 px label row. */
const LABEL_BASELINE = LABEL_ROW_PX - 4;

const STEP_SUFFIX: Record<ChildStep, string> = { base: "", light: "-light", dark: "-dark" };
export const bandFill = (slot: number, step: ChildStep) => `var(--tl-subject-${slot}${STEP_SUFFIX[step]})`;
/** T-06: the AA label colour picked for each swatch (light or dark text, from the tokens). */
export const nameFill = (slot: number, step: ChildStep) => `var(--tl-subject-${slot}${STEP_SUFFIX[step]}-label)`;

export interface TimelineProps {
  layout: TimelineLayout;
  /** The accessible name of the picture (the lanes are listed for screen readers next to it). */
  label: string;
}

export function Timeline({ layout, label }: TimelineProps) {
  const hatchId = `tl-hatch-${useId().replace(/:/g, "")}`;
  const bottom = layout.totals.y + layout.totals.height;
  const height = layout.height + (layout.todayX === null ? 0 : TODAY_PILL_PX);
  const pillX = layout.todayX === null ? 0 : Math.max(0, Math.min(layout.width - PILL_W, layout.todayX - PILL_W / 2));

  return (
    <svg className="tl-svg" width={layout.width} height={height} viewBox={`0 0 ${layout.width} ${height}`} role="img" aria-label={label}>
      <defs>
        <pattern id={hatchId} width={6} height={6} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line className="tl-hatch-line" x1={0} y1={0} x2={0} y2={6} />
        </pattern>
      </defs>

      <g className="tl-breaks">
        {layout.breaks.map((b, i) => (
          <rect key={`${b.breakId}-${i}`} x={b.x} y={b.y} width={b.width} height={b.height} fill={`url(#${hatchId})`}>
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
        {layout.labels.map((l) => (
          <text key={l.laneKey} className="tl-lane-label" x={l.x} y={l.y + LABEL_BASELINE}>{l.text}</text>
        ))}
        <text className="tl-lane-label" x={layout.plot.x} y={layout.totals.labelY + LABEL_BASELINE}>Total</text>
      </g>

      <g className="tl-bands">
        {layout.bands.map((b) => (b.d ? (
          <path key={`${b.rowKey}-${b.assignmentId}`} className="tl-band" d={b.d} style={{ fill: bandFill(b.paletteSlot, b.step) }}
            data-assignment={b.assignmentId} />
        ) : null))}
        {layout.totals.d ? <path className="tl-totals" d={layout.totals.d} /> : null}
      </g>

      <g className="tl-names" aria-hidden="true">
        {layout.names.map((n) => (
          <g key={`${n.rowKey}-${n.assignmentId}`} data-name-for={n.assignmentId}>
            <rect className="tl-name-patch" x={n.x} y={n.y} width={n.width} height={n.height} style={{ fill: bandFill(n.paletteSlot, n.step) }} />
            <text className="tl-name" x={n.textX} y={n.textY} dominantBaseline="central" style={{ fill: nameFill(n.paletteSlot, n.step) }}>{n.text}</text>
          </g>
        ))}
      </g>

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
