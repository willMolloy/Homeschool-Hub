/**
 * T-05: zoom state plus the crossfade between zooms. On a change the previous zoom is kept as `leaving` for one
 * fade (FADE_MS, under the 250 ms budget) and then dropped. With reduced motion there is no leaving zoom: the
 * change is instant. The page owns this state, so anything selected beside it survives a zoom change.
 */
import { useCallback, useEffect, useState } from "react";
import { useMediaQuery } from "../../lib/useMediaQuery";
import type { Zoom } from "./zoom";

export const FADE_MS = 200;

export function useZoomFade(initial: Zoom = "year") {
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [zoom, setZoomState] = useState<Zoom>(initial);
  const [leaving, setLeaving] = useState<Zoom | null>(null);

  const setZoom = useCallback((next: Zoom) => {
    if (next === zoom) return;
    setLeaving(reduceMotion ? null : zoom);
    setZoomState(next);
  }, [zoom, reduceMotion]);

  const settle = useCallback(() => setLeaving(null), []);

  // Fallback for when animationend never fires (hidden tab, no CSS animations).
  useEffect(() => {
    if (leaving === null) return;
    const t = setTimeout(settle, FADE_MS + 50);
    return () => clearTimeout(t);
  }, [leaving, zoom, settle]);

  return { zoom, leaving, setZoom, settle };
}
