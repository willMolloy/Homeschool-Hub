/**
 * The plan's pixel scale for bar thickness (S2b-34). Thickness has no unit (units a day × weight),
 * so every bar on screen (the picker preview and the timeline) goes through here.
 * 2.8 px per point is the prototype's "Exaggerated" feel (product owner, 2026-10-28; was 2). This is the
 * one constant to tune.
 */
export const PX_PER_THICKNESS = 2.8;
/**
 * S6b-06, S7-18: the soft cap on bar height, the numbers to tune. Up to the knee (a typical day, 20 points at
 * `PX_PER_THICKNESS`) a bar is drawn at its true height; above it the height grows ever more slowly (logarithmically)
 * and stops at `MAX_BAR_PX`. Heavier days still look heavier, well past where the first (exponential) version went
 * flat: 60, 100 and 300 pages a day draw about 75, 82 and 98 px; 1,000 pages a day stops at the maximum.
 */
export const SOFT_CAP_KNEE_PX = 56;
/** The tallest bar drawn (S6b-06: 100, only the picker preview used it; S7-18: 112). */
export const MAX_BAR_PX = 112;
/** S7-18: the log curve's scale: the raw height above the knee is divided by this inside the log (larger = rises more slowly at first). */
export const SOFT_CAP_SCALE_PX = 40;
/** S7-18: the log curve's height gain per e-fold above the knee. */
export const SOFT_CAP_GAIN_PX = 14;

/**
 * S6b-06, S7-18: pixels as scaled (thickness × px per point) → pixels drawn. Unchanged up to `SOFT_CAP_KNEE_PX`, then
 * knee + gain × ln(1 + (raw - knee) / scale), never above `MAX_BAR_PX`: strictly increasing until it reaches the
 * maximum (at about 2,200 px raw). Non-finite or non-positive input draws nothing.
 */
export function softCapPx(rawPx: number): number {
  if (!Number.isFinite(rawPx) || rawPx <= 0) return 0;
  if (rawPx <= SOFT_CAP_KNEE_PX) return rawPx;
  return Math.min(MAX_BAR_PX, SOFT_CAP_KNEE_PX + SOFT_CAP_GAIN_PX * Math.log(1 + (rawPx - SOFT_CAP_KNEE_PX) / SOFT_CAP_SCALE_PX));
}

/** Thickness → pixels, soft-capped (see `softCapPx`). Non-finite or negative input draws nothing. */
export function thicknessToPx(thickness: number): number {
  return softCapPx(thickness * PX_PER_THICKNESS);
}
