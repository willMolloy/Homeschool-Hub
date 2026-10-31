/**
 * The plan's pixel scale for bar thickness (S2b-34). Thickness has no unit (units a day × weight),
 * so every bar on screen (the picker preview and the timeline) goes through here.
 * 2.8 px per point is the prototype's "Exaggerated" feel (product owner, 2026-10-28; was 2). This is the
 * one constant to tune.
 */
export const PX_PER_THICKNESS = 2.8;
/**
 * S6b-06: the soft cap on bar height, the two numbers to tune. Up to the knee (a typical day, 20 points at
 * `PX_PER_THICKNESS`) a bar is drawn at its true height; above it the height grows ever more slowly and
 * approaches, but never passes, `MAX_BAR_PX`. Heavier days still look heavier; 300 pages a day no longer
 * fills the screen.
 */
export const SOFT_CAP_KNEE_PX = 56;
/** The tallest bar drawn (S6b-06: was 100, only the picker preview used it; now every bar). */
export const MAX_BAR_PX = 96;

/**
 * S6b-06: pixels as scaled (thickness × px per point) → pixels drawn. Unchanged up to `SOFT_CAP_KNEE_PX`, then
 * knee + (max - knee) × (1 - e^(-(raw - knee) / (max - knee))): strictly increasing, never above `MAX_BAR_PX`.
 * Non-finite or non-positive input draws nothing.
 */
export function softCapPx(rawPx: number): number {
  if (!Number.isFinite(rawPx) || rawPx <= 0) return 0;
  if (rawPx <= SOFT_CAP_KNEE_PX) return rawPx;
  const room = MAX_BAR_PX - SOFT_CAP_KNEE_PX;
  return Math.min(MAX_BAR_PX, SOFT_CAP_KNEE_PX + room * (1 - Math.exp(-(rawPx - SOFT_CAP_KNEE_PX) / room)));
}

/** Thickness → pixels, soft-capped (see `softCapPx`). Non-finite or negative input draws nothing. */
export function thicknessToPx(thickness: number): number {
  return softCapPx(thickness * PX_PER_THICKNESS);
}
