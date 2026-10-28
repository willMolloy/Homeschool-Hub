/**
 * T-06: measures name text with a cached canvas `measureText` in the page's own font. Falls back to the
 * over-estimating `estimateTextWidth` where OffscreenCanvas isn't available (jsdom, old browsers).
 */
import { useMemo } from "react";
import { estimateTextWidth, NAME_FONT_PX, type MeasureText } from "./names";

export function makeCanvasMeasure(fontFamily: string): MeasureText | null {
  if (typeof OffscreenCanvas === "undefined") return null;
  const ctx = new OffscreenCanvas(1, 1).getContext("2d");
  if (!ctx) return null;
  ctx.font = `${NAME_FONT_PX}px ${fontFamily}`;
  const cache = new Map<string, number>();
  return (text) => {
    let w = cache.get(text);
    if (w === undefined) cache.set(text, (w = ctx.measureText(text).width));
    return w;
  };
}

export function useMeasureText(): MeasureText {
  return useMemo(() => {
    const family = typeof document !== "undefined" ? getComputedStyle(document.body).fontFamily : "";
    return makeCanvasMeasure(family || "sans-serif") ?? estimateTextWidth;
  }, []);
}
