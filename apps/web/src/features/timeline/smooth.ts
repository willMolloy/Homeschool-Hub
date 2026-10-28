/**
 * T-05c: the calm, zoomed-out series. A centred moving average over school days, done per segment so each
 * assignment still starts and ends in the right week and long gaps (breaks) stay gaps.
 */

/** About three school weeks: wide enough to read calm, narrow enough to follow a term's changes. */
export const SMOOTH_WINDOW_DAYS = 15;
/** Runs of this many zero school days or more split a series (a week off); shorter ones are bridged. */
export const SMOOTH_SPLIT_DAYS = 5;

/**
 * Smooth `series` over the grid's school days (`columns`, the grid indices that are school days, in order).
 * Returns a full-length series: the average of the segment's school days within half a window either side,
 * zero outside segments and on non-school days.
 */
export function smoothSeries(series: readonly number[], columns: readonly number[], window = SMOOTH_WINDOW_DAYS, split = SMOOTH_SPLIT_DAYS): number[] {
  const out = new Array<number>(series.length).fill(0);
  const v = columns.map((i) => series[i] ?? 0);
  // Segments over column positions: nonzero runs joined across gaps shorter than `split`.
  const segments: [number, number][] = [];
  let zeros = 0;
  for (let k = 0; k < v.length; k++) {
    if (v[k]! > 0) {
      const last = segments[segments.length - 1];
      if (last && zeros < split) last[1] = k;
      else segments.push([k, k]);
      zeros = 0;
    } else zeros++;
  }
  const half = Math.floor(window / 2);
  for (const [s, e] of segments) {
    for (let k = s; k <= e; k++) {
      const a = Math.max(s, k - half);
      const b = Math.min(e, k + half);
      let sum = 0;
      for (let j = a; j <= b; j++) sum += v[j]!;
      out[columns[k]!] = sum / (b - a + 1);
    }
  }
  return out;
}
