/**
 * T-07e: the edit bar never covers the selected bar. It measures the bar's height (so the page gets that much
 * room at the bottom) and, when the selection changes, scrolls the selected bar above it if it would sit under it.
 */
import { useLayoutEffect, useRef, useState } from "react";

/** Space kept between the bar and the edit bar. */
const GAP_PX = 16;

export function useKeepAbove<T extends HTMLElement>(selectedId: string | null, findBars: (id: string) => Element[]) {
  const ref = useRef<T>(null);
  const [height, setHeight] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) { setHeight(0); return; }
    setHeight(el.offsetHeight);
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(() => setHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [selectedId]);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!selectedId || !el || height === 0) return;
    const bottom = Math.max(...findBars(selectedId).map((b) => b.getBoundingClientRect().bottom));
    const top = el.getBoundingClientRect().top;
    if (Number.isFinite(bottom) && bottom > top - GAP_PX) window.scrollBy({ top: bottom - top + GAP_PX, behavior: "smooth" });
    // Only on a new selection (and once the bar is measured), never while editing or dragging.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, height > 0]);
  return { ref, height };
}
