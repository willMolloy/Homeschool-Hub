/** Print pages are always light, whatever the app's theme: set `data-theme="light"` on <html> while mounted, then put it back. */
import { useLayoutEffect } from "react";

export function useLightPage(): void {
  useLayoutEffect(() => {
    const root = document.documentElement;
    const before = root.getAttribute("data-theme");
    root.setAttribute("data-theme", "light");
    return () => { if (before === null) root.removeAttribute("data-theme"); else root.setAttribute("data-theme", before); };
  }, []);
}
