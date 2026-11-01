/** S8-05: which child (or All children) the week, track and year screens show, remembered on this device (`hh.child`; storage may be blocked). */
import { useCallback, useState } from "react";
import type { Child } from "../../api/types";

export const CHILD_KEY = "hh.child";
/** Every child. (Saved as "both" before S8b-07: still understood.) */
export const ALL = "all";

function saved(): string | null {
  try { return window.localStorage.getItem(CHILD_KEY); } catch { return null; }
}

/** The shown choice: a saved child id that still exists, else All children is only offered with several children; default the first child. */
export function shownChoice(kids: readonly Child[], choice: string | null, fallback: "first" | "all" = "first"): string | null {
  if (kids.length === 0) return null;
  if (kids.length > 1 && (choice === ALL || choice === "both")) return ALL;
  const found = kids.find((k) => k.id === choice)?.id;
  return found ?? (fallback === "all" && kids.length > 1 ? ALL : kids[0]!.id);
}

/** `fallback`: what shows when nothing is saved: the first child (Week, Track work) or All children (Year, the overview). */
export function useChildChoice(kids: readonly Child[], fallback: "first" | "all" = "first"): [string | null, (v: string) => void] {
  const [choice, setChoice] = useState<string | null>(saved);
  const set = useCallback((v: string) => {
    setChoice(v);
    try { window.localStorage.setItem(CHILD_KEY, v); } catch { /* not remembered */ }
  }, []);
  return [shownChoice(kids, choice, fallback), set];
}
