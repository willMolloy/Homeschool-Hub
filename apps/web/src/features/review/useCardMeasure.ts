/** S13-05: text width in the card's fonts (canvas), once the fonts have loaded, so the layout fits the real text. */
import { useEffect, useMemo, useState } from "react";
import type { Font } from "./cardLayout";
import { FONT_FAMILY } from "./TermCardSvg";

export function cardMeasure(ctx: CanvasRenderingContext2D | null): (text: string, size: number, weight: number, font: Font) => number {
  return (text, size, weight, font) => {
    if (!ctx) return text.length * size * 0.55;
    ctx.font = `${weight} ${size}px ${FONT_FAMILY[font]}`;
    return ctx.measureText(text).width;
  };
}

/** The measure, and whether the fonts are in (before that, a layout would be measured in the fallback font). */
export function useCardMeasure(): { measure: ReturnType<typeof cardMeasure>; ready: boolean } {
  const [ready, setReady] = useState(typeof document === "undefined" || !document.fonts);
  useEffect(() => {
    if (ready) return;
    let live = true;
    const loads = [
      document.fonts.load('600 88px "Fraunces Variable"'), document.fonts.load('500 27px "Fraunces Variable"'),
      document.fonts.load('400 26px "Nunito Sans Variable"'), document.fonts.load('800 26px "Nunito Sans Variable"'),
    ];
    void Promise.allSettled(loads).then(() => document.fonts.ready).then(() => live && setReady(true), () => live && setReady(true));
    return () => { live = false; };
  }, [ready]);
  const measure = useMemo(() => {
    let ctx: CanvasRenderingContext2D | null = null;
    try { ctx = document.createElement("canvas").getContext("2d"); } catch { ctx = null; }
    return cardMeasure(ctx);
  }, []);
  return { measure, ready };
}
