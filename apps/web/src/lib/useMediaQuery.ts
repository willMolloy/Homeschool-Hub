/** Whether a media query matches, kept up to date. No `matchMedia` (old browsers, jsdom) reads as no match. */
import { useEffect, useState } from "react";

const matches = (query: string) => typeof window !== "undefined" && typeof window.matchMedia === "function"
  && window.matchMedia(query).matches;

export function useMediaQuery(query: string): boolean {
  const [value, setValue] = useState(() => matches(query));
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mql = window.matchMedia(query);
    const update = () => setValue(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, [query]);
  return value;
}
