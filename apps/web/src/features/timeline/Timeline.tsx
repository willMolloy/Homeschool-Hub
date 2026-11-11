/**
 * T-04: draws a TimelineLayout as one SVG. Pure rendering: every position comes from layout.ts.
 * Back to front: breaks, gridlines, bands, event strips, Today. One path per band and per event, so the Year view
 * stays well under 300 nodes. Colours are the `--tl-*` tokens (palette and theme switch without a re-render).
 */
import { useEffect, useState, type CSSProperties } from "react";
import { UsersThree } from "@phosphor-icons/react";
import type { Subject } from "../../api/types";
import { SubjectBadge } from "../subjects/SubjectIcon";
import { bandExtent } from "./drag";
import { BADGE_HIT_PX, nearestBadge, type TimelineLayout } from "./layout";
import type { ChildStep } from "./model";

/** Room under the lanes for the Today pill. */
/** S10-03: the Today pill, on the axis's second line. */
const PILL_W = 50;
const PILL_H = 18;
/** S10-03: the months' baseline on the axis's first line. */
const AXIS_LINE1_Y = 15;
/** T-08b: the grip at each end of the selected bar: a small pill in the bar's label colour. */
export const HANDLE_W_PX = 4;
export const HANDLE_INSET_PX = 3;
const HANDLE_H = (rowHeight: number) => Math.min(14, Math.max(8, rowHeight - 6));

/** S12-04: an ended bar is drawn in the lighter step of its colour (calmer); a stopped one is also muted and dashed (timeline.css). */
const stepOf = (step: ChildStep, ended?: "finished" | "stopped"): ChildStep => (ended ? "light" : step);
const STEP_SUFFIX: Record<ChildStep, string> = { base: "", light: "-light", dark: "-dark" };
/**
 * S19-04: mix this much of the strong tone into the pastel. The bar stays a pastel, a little stronger than the
 * page-mixed fill, and the opacity token stays at 1 (not a flat solid, and not above 1).
 */
export const BAR_STRONG_MIX = 0.08;
/**
 * The strong token exists only on the base step (`--tl-subject-N-strong`). Ended bars use the light
 * step's fill. Mixing in `--tl-subject-N-light-strong` (which is not a token) paints those bars black.
 */
export const bandFill = (slot: number, step: ChildStep) => {
  const suffix = STEP_SUFFIX[step];
  const pct = Math.round(BAR_STRONG_MIX * 100);
  return `color-mix(in srgb, var(--tl-subject-${slot}-strong) ${pct}%, var(--tl-subject-${slot}${suffix}))`;
};
/** T-06: the AA label colour picked for each swatch (light or dark text, from the tokens). */
export const nameFill = (slot: number, step: ChildStep) => `var(--tl-subject-${slot}${STEP_SUFFIX[step]}-label)`;

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
  const bottom = layout.lanesBottom;
  const m = layout.metrics;
  const height = layout.height;
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
    <div className="tl-wrap" style={{ width: layout.width, height, "--tl-sticky-top": `${m.axis}px` } as CSSProperties}>
    {/* S10-03: the axis sticks to the top while the lanes scroll: months on line 1, the Today pill on line 2. The group
        header rows stick just under it. It lies over the top of the picture (the layout leaves it room). */}
    <div className="tl-axis" data-axis style={{ height: m.axis, marginBottom: -m.axis }}>
      <svg className="tl-axis-svg" width={layout.width} height={m.axis} aria-hidden="true">
        {layout.ticks.map((t) => (t.label ? (
          <text key={`label-${t.index}`} className="tl-axis-label" x={t.x + 3} y={AXIS_LINE1_Y}>{t.label}</text>
        ) : null))}
        <line className="tl-axis-rule" x1={0} x2={layout.width} y1={m.axis - 0.5} y2={m.axis - 0.5} />
        {layout.todayX === null ? null : (
          <g className="tl-today" data-today-pill>
            <line className="tl-today-stub" x1={layout.todayX} x2={layout.todayX} y1={AXIS_LINE1_Y + 4} y2={m.axis} />
            <rect x={pillX} y={m.axis - PILL_H - 2} width={PILL_W} height={PILL_H} rx={PILL_H / 2} />
            <text x={pillX + PILL_W / 2} y={m.axis - 7} textAnchor="middle">Today</text>
          </g>
        )}
      </svg>
    </div>
    <svg className="tl-svg" width={layout.width} height={height} viewBox={`0 0 ${layout.width} ${height}`} role="img" aria-label={label} data-pickable={onPick ? "" : undefined}
      tabIndex={onPick ? -1 : undefined}
      onClick={onPick ? (e) => {
        const r = e.currentTarget.getBoundingClientRect();
        onPick(e.clientX - r.left, e.clientY - r.top);
      } : undefined}>
      {/* S10-05 (mockup): each break is a soft band behind the grid, and the same band washed over the bars. */}
      <g className="tl-breaks">
        {layout.breaks.map((b, i) => (
          <rect key={`${b.breakId}-${i}`} className="tl-break" x={b.x} y={b.y} width={b.width} height={b.height} />
        ))}
      </g>

      <g className="tl-grid">
        {layout.ticks.map((t) => (
          <line key={`${t.kind}-${t.index}`} className={t.kind === "month" ? "tl-tick-month" : "tl-tick-week"}
            x1={t.x} x2={t.x} y1={m.axis} y2={bottom} />
        ))}
      </g>

      <g className="tl-rules">
        {layout.rules.map((r) => (
          <line key={`${r.kind}-${r.y}`} className={r.kind === "group" ? "tl-rule-group" : "tl-rule-lane"} x1={r.x0} x2={layout.width} y1={r.y} y2={r.y} />
        ))}
      </g>

      <g className="tl-bands">
        {layout.bands.flatMap((b) => b.connectors.map((c, k) => (
          <line key={`c-${b.rowKey}-${b.assignmentId}-${k}`} className={`tl-connector${dim(b.assignmentId)}`} x1={c.x0} x2={c.x1} y1={b.cy} y2={b.cy}
            style={{ stroke: bandFill(b.paletteSlot, b.step) }} data-connector-for={b.assignmentId} />
        )))}
        {layout.bands.map((b) => (b.d ? (
          <path key={`${b.rowKey}-${b.assignmentId}`} className={`tl-band${b.ended ? ` tl-ended tl-${b.ended}` : ""}${dim(b.assignmentId)}`} d={b.d}
            style={{ fill: bandFill(b.paletteSlot, stepOf(b.step, b.ended)), stroke: `var(--tl-subject-${b.paletteSlot}-strong)` }}
            data-assignment={b.assignmentId} {...(b.ended ? { "data-ended": b.ended } : {})} />
        ) : null))}
      </g>

      <g className="tl-wash" data-wash>
        {layout.breaks.map((b, i) => (
          <rect key={`${b.breakId}-${i}`} x={b.x} y={b.y} width={b.width} height={b.height}>
            {b.label ? <title>{b.label}</title> : null}
          </rect>
        ))}
      </g>
      {/* S19-06: a named break of a week or longer. Regular weekly days off are not labeled, and never "Wednesdays off". */}
      <g className="tl-break-labels">
        {layout.breaks.map((b, i) => b.title ? (
          <text key={`label-${b.breakId}-${i}`} className="tl-break-label" x={b.title.x} y={b.title.y} dominantBaseline="central">{b.title.text}</text>
        ) : null)}
      </g>

      {/* S10-03: the dashed Today line runs through every lane, over the bars and under their names (which carry a halo). */}
      {layout.todayX === null ? null : (
        <g className="tl-today" data-today>
          <line x1={layout.todayX} x2={layout.todayX} y1={layout.todayTop} y2={bottom} />
        </g>
      )}

      <g className="tl-names" aria-hidden="true">
        {layout.names.map((n) => (
          // T-11d: a name stays at full strength while its bar dims (an inside name only gains contrast; S10-04b: an
          // outside name is muted page text, which would drop below AA if it dimmed too).
          <g key={`${n.rowKey}-${n.assignmentId}-${n.piece}`} className={`${n.ended ? `tl-ended tl-${n.ended} ` : ""}${dim(n.assignmentId).replace(" tl-dim", "").trim()}`.trim() || undefined} data-name-for={n.assignmentId}>
            {n.outside
              ? <text className="tl-outside-name" x={n.textX} y={n.textY} dominantBaseline="central">{n.text}</text>
              : <text className="tl-name" x={n.textX} y={n.textY} dominantBaseline="central" style={{ fill: nameFill(n.paletteSlot, stepOf(n.step, n.ended)), stroke: bandFill(n.paletteSlot, stepOf(n.step, n.ended)) }}>{n.text}</text>}
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


    </svg>
    {/* S8-07: the gutter. S10-02: one round badge per lane, pinned to the centre of the lane's first row. */}
    <div className="tl-gutter" style={{ width: m.gutter }}>
      {layout.badges.map((b) => (
        <button key={b.laneKey} type="button" className="tl-badge" aria-label={b.label} aria-pressed={picked === b.laneKey}
          style={{ top: b.cy - BADGE_HIT_PX / 2, height: BADGE_HIT_PX, width: Math.max(BADGE_HIT_PX, m.gutter), "--tl-badge-w": `${m.gutter}px` } as CSSProperties}
          onClick={(e) => {
            // S10-15: zones overlap a little; a pointer tap goes to the nearest badge centre (a keyboard press to this one).
            const r = e.currentTarget.getBoundingClientRect();
            const inside = e.detail > 0 && r.height > 0 && e.clientY >= r.top && e.clientY <= r.bottom;
            const hit = inside ? nearestBadge(layout.badges, b.cy - BADGE_HIT_PX / 2 + (e.clientY - r.top)) ?? b : b;
            setLane(picked === hit.laneKey ? null : hit.laneKey);
          }}>
          <SubjectBadge subject={subjects.find((s) => s.id === b.subjectId) ?? { name: b.subjectName, icon: null }} slot={b.paletteSlot} size={m.badge} />
        </button>
      ))}
      {layout.badges.filter((b) => b.laneKey === picked).map((b) => (
        <div key={b.laneKey} className="tl-lane-pop" role="status" style={{ top: b.cy - 14, left: m.gutter + 2 }}>{b.text}</div>
      ))}
    </div>
    {/* S10-02: each group's header row (the child's initial and load ribbon, or Together) stays at the top while its lanes scroll. */}
    {layout.groups.map((g) => (
      <div key={g.key} className="tl-group" data-group={g.key} style={{ top: g.top, height: g.bottom - g.top }}>
        <div className="tl-group-head" style={{ height: g.header.height }}>
          <svg className="tl-ribbon" width={layout.width} height={g.header.height} aria-hidden="true">
            {g.header.ribbon ? <path d={g.header.ribbon} /> : null}
          </svg>
          <span className="tl-group-avatar" style={{ width: m.gutter }} aria-hidden="true">
            <span style={{ width: m.badge, height: m.badge }}>{g.kind === "together" ? <UsersThree size={15} weight="bold" /> : g.initial}</span>
          </span>
          <span className="tl-group-name" style={{ left: layout.plot.x + 6, fontSize: m.font + 0.5 }}>{g.name}</span>
        </div>
      </div>
    ))}
    </div>
  );
}
