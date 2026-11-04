/**
 * T-03: tap targets. Bars can be 2 px thick and a few px wide, so a tap is matched against a target at
 * least 44 × 44 px centred on the bar (Apple and WCAG 2.5.5). Where two targets meet, the bar whose
 * centerline (then nearest edge) is closer wins, so every tap resolves to one bar or none.
 */
import type { LaneBand, TimelineLayout } from "./layout";

export const MIN_TAP_PX = 44;

/** Horizontal distance from x to a run, 0 inside it. */
const dx = (x: number, run: { x0: number; x1: number }) => (x < run.x0 ? run.x0 - x : x > run.x1 ? x - run.x1 : 0);

/**
 * The tap box of one run: the run itself, widened and heightened about its centre to at least MIN_TAP_PX.
 * S10-04c: `top` is the foot of the group header above the bar (the header takes taps of its own), so a box that
 * would reach under it is moved down to start there, keeping its full height.
 */
export function tapBox(run: { x0: number; x1: number }, cy: number, top = Number.NEGATIVE_INFINITY): { x0: number; x1: number; y0: number; y1: number } {
  const cx = (run.x0 + run.x1) / 2;
  const half = Math.max(MIN_TAP_PX, run.x1 - run.x0) / 2;
  const y0 = Math.max(cy - MIN_TAP_PX / 2, top);
  return { x0: cx - half, x1: cx + half, y0, y1: y0 + MIN_TAP_PX };
}

/** S10-04c: the foot of each row's group header, by row key (rows outside any group get none). */
export function headerFeet(layout: Partial<Pick<TimelineLayout, "rows" | "groups">>): Map<string, number> {
  const feet = new Map<string, number>();
  const groups = new Map((layout.groups ?? []).map((g) => [g.key, g.header.y + g.header.height]));
  for (const r of layout.rows ?? []) {
    const foot = groups.get(r.groupKey);
    if (foot !== undefined) feet.set(r.key, foot);
  }
  return feet;
}

/** The bar a tap at (x, y) lands on, or null. Where boxes overlap, the nearer centreline wins, then the nearer end. */
export function hitTest(layout: Pick<TimelineLayout, "bands"> & Partial<Pick<TimelineLayout, "rows" | "groups">>, x: number, y: number): LaneBand | null {
  const feet = headerFeet(layout);
  let best: { band: LaneBand; dy: number; dx: number } | null = null;
  for (const band of layout.bands) {
    for (const run of band.runs) {
      const box = tapBox(run, band.cy, feet.get(band.rowKey));
      if (x < box.x0 || x > box.x1 || y < box.y0 || y > box.y1) continue;
      const cand = { band, dy: Math.abs(y - band.cy), dx: dx(x, run) };
      if (!best || cand.dy < best.dy || (cand.dy === best.dy && cand.dx < best.dx)) best = cand;
    }
  }
  return best?.band ?? null;
}
