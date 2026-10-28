/**
 * The plan's pixel scale for bar thickness (S2b-34). Thickness has no unit (units a day × weight),
 * so every bar on screen (the picker preview and the timeline) goes through here.
 * 2.8 px per point is the prototype's "Exaggerated" feel (product owner, 2026-10-28; was 2). This is the
 * one constant to tune.
 */
export const PX_PER_THICKNESS = 2.8;
/** The widest bar drawn, so a huge weight can't overflow its card. */
export const MAX_BAR_PX = 100;

/** Thickness → pixels, clamped to [0, MAX_BAR_PX]. Non-finite or negative input draws nothing. */
export function thicknessToPx(thickness: number): number {
  if (!Number.isFinite(thickness) || thickness <= 0) return 0;
  return Math.min(MAX_BAR_PX, thickness * PX_PER_THICKNESS);
}
