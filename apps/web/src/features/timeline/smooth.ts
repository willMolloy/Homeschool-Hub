/**
 * T-05c: the calm, zoomed-out series, done per segment so each assignment still starts and ends in the right week
 * and long gaps (breaks) stay gaps.
 *
 * T-08b (DeeDee: "clean in this zoomed out view"): an assignment is drawn as a clean shape (cleanSeries), one
 * thickness per phase, its average daily load; only clearly distinct phases (heavy weeks, then light) change it.
 * All subjects stays a moving average (smoothSeries), now over those clean shapes, so it has no wobble at the edges.
 * Neither reaches across an assignment's start or end or across a break (a week or more with nothing planned);
 * a day or two off inside an assignment is bridged, as before, so a holiday doesn't cut a bar in Year.
 */

/** About three school weeks: wide enough to read calm, narrow enough to follow a term's changes. */
export const SMOOTH_WINDOW_DAYS = 15;
/** Runs of this many zero school days or more split a series (a week off); shorter ones are bridged. */
export const SMOOTH_SPLIT_DAYS = 5;
/** T-08b: a school week, the unit a phase is built from. */
export const PHASE_WEEK_DAYS = 5;
/** T-08b: a week starts a new phase only when its load differs from the phase's by this factor or more. */
export const PHASE_RATIO = 1.5;
/** T-08b: a phase shorter than this (school days) joins its closest neighbour, so short lumps never show. */
export const PHASE_MIN_DAYS = 10;

/** S7-21: the calm look's window, about four school weeks (an assignment's own school days, never past its ends). */
export const CALM_WINDOW_DAYS = 20;
/** S7-21: at the smooth detail a bar's thickness changes by at most this many px per week. */
export const CALM_SLOPE_PX_PER_WEEK = 2;

/** Segments over column positions: nonzero runs joined across gaps shorter than `split`. */
function segmentsOf(v: readonly number[], split: number): [number, number][] {
  const segments: [number, number][] = [];
  let zeros = split;
  for (let k = 0; k < v.length; k++) {
    if (v[k]! > 0) {
      const last = segments[segments.length - 1];
      if (last && zeros < split) last[1] = k;
      else segments.push([k, k]);
      zeros = 0;
    } else zeros++;
  }
  return segments;
}

/**
 * Smooth `series` over the grid's school days (`columns`, the grid indices that are school days, in order).
 * Returns a full-length series: the average of the segment's school days within half a window either side,
 * zero outside segments and on non-school days.
 */
export function smoothSeries(series: readonly number[], columns: readonly number[], window = SMOOTH_WINDOW_DAYS, split = SMOOTH_SPLIT_DAYS): number[] {
  const out = new Array<number>(series.length).fill(0);
  const v = columns.map((i) => series[i] ?? 0);
  const half = Math.floor(window / 2);
  for (const [s, e] of segmentsOf(v, split)) {
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

/**
 * S7-21: an assignment's calm series for the zoomed-out look: a centred moving average over about four school weeks of
 * its own days (the window shrinks at its ends and never reaches across a break), so a short heavy stretch is spread
 * into a gentle swell. The mean of a segment is kept, so a heavier assignment is still a thicker band.
 */
export const calmSeries = (series: readonly number[], columns: readonly number[]): number[] => smoothSeries(series, columns, CALM_WINDOW_DAYS);

/**
 * S7-21: limit how fast heights (px) change from one column to the next: at most `perWeek` px per week of calendar
 * time (`gapDays[k]` is the days from column k-1 to column k). Runs of positive heights are limited on their own, so a
 * bar still starts and ends in the right week. Done forwards and backwards and averaged, so the result is symmetric
 * and still never changes faster than the limit. It only rounds off what the moving average left (an abrupt spike
 * loses height); smooth data passes through unchanged.
 */
export function limitSlope(heights: readonly number[], gapDays: readonly number[], perWeek = CALM_SLOPE_PX_PER_WEEK): number[] {
  const out = [...heights];
  let k = 0;
  while (k < heights.length) {
    if (!(heights[k]! > 0)) { k++; continue; }
    let end = k;
    while (end + 1 < heights.length && heights[end + 1]! > 0) end++;
    const step = (j: number) => (perWeek * Math.max(1, gapDays[j] ?? 1)) / 7;
    const fwd = heights.slice(k, end + 1);
    for (let j = 1; j < fwd.length; j++) fwd[j] = Math.min(fwd[j - 1]! + step(k + j), Math.max(fwd[j - 1]! - step(k + j), fwd[j]!));
    const back = heights.slice(k, end + 1);
    for (let j = back.length - 2; j >= 0; j--) back[j] = Math.min(back[j + 1]! + step(k + j + 1), Math.max(back[j + 1]! - step(k + j + 1), back[j]!));
    for (let j = 0; j < fwd.length; j++) out[k + j] = (fwd[j]! + back[j]!) / 2;
    k = end + 1;
  }
  return out;
}

interface Phase { spans: [number, number][]; sum: number; n: number }
const mean = (p: Phase) => p.sum / p.n;
const ratio = (a: number, b: number) => Math.max(a, b) / Math.max(Math.min(a, b), 1e-9);

/**
 * T-08b: one assignment's clean shape. Its segments are cut into school weeks; consecutive weeks within PHASE_RATIO
 * of each other form a phase, phases under PHASE_MIN_DAYS join their closer neighbour, and every school day of a
 * phase carries the phase's average. Usually that is one thickness for the whole assignment.
 */
export function cleanSeries(series: readonly number[], columns: readonly number[], split = SMOOTH_SPLIT_DAYS): number[] {
  const out = new Array<number>(series.length).fill(0);
  const v = columns.map((i) => series[i] ?? 0);
  const phases: Phase[] = [];
  for (const [s, e] of segmentsOf(v, split)) {
    for (let k = s; k <= e; k += PHASE_WEEK_DAYS) {
      const b = Math.min(e, k + PHASE_WEEK_DAYS - 1);
      let sum = 0;
      for (let j = k; j <= b; j++) sum += v[j]!;
      const n = b - k + 1;
      const last = phases[phases.length - 1];
      if (last && ratio(sum / n, mean(last)) < PHASE_RATIO) {
        last.spans.push([k, b]);
        last.sum += sum;
        last.n += n;
      } else phases.push({ spans: [[k, b]], sum, n });
    }
  }
  const join = (i: number, into: number) => {
    const p = phases[i]!;
    const q = phases[into]!;
    q.spans = into < i ? [...q.spans, ...p.spans] : [...p.spans, ...q.spans];
    q.sum += p.sum;
    q.n += p.n;
    phases.splice(i, 1);
  };
  for (;;) {
    if (phases.length < 2) break;
    // Neighbours that ended up alike (after a short phase joined one) become one phase.
    const alike = phases.findIndex((p, j) => j > 0 && ratio(mean(p), mean(phases[j - 1]!)) < PHASE_RATIO);
    if (alike > 0) { join(alike, alike - 1); continue; }
    let i = -1;
    phases.forEach((p, j) => { if (p.n < PHASE_MIN_DAYS && (i < 0 || p.n < phases[i]!.n)) i = j; });
    if (i < 0) break;
    const p = phases[i]!;
    const prev = phases[i - 1];
    const next = phases[i + 1];
    join(i, !next || (prev && ratio(mean(p), mean(prev)) <= ratio(mean(p), mean(next))) ? i - 1 : i + 1);
  }
  for (const p of phases) for (const [a, b] of p.spans) for (let k = a; k <= b; k++) out[columns[k]!] = mean(p);
  return out;
}
