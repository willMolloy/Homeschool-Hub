import { useLayoutEffect, useRef, useState } from "react";

/**
 * The element's content width, kept current with a ResizeObserver. Measured before paint, so the first frame is
 * already the right size. `fallback` is used while nothing can be measured (no layout, e.g. in tests).
 */
export function useElementWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => setWidth(Math.round(entries[0]?.contentRect.width ?? el.clientWidth)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return { ref, width: width > 0 ? width : fallback };
}
