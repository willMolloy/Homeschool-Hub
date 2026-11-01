/** S8-05: which child (or Both) the week screens show, remembered on this device (`hh.child`; storage may be blocked). */
import { useCallback, useState } from "react";
import type { Child } from "../../api/types";

export const CHILD_KEY = "hh.child";
export const BOTH = "both";

function saved(): string | null {
  try { return window.localStorage.getItem(CHILD_KEY); } catch { return null; }
}

/** The shown choice: a saved child id that still exists, else Both is only offered with several children; default the first child. */
export function shownChoice(kids: readonly Child[], choice: string | null): string | null {
  if (kids.length === 0) return null;
  if (kids.length > 1 && choice === BOTH) return BOTH;
  return kids.find((k) => k.id === choice)?.id ?? kids[0]!.id;
}

export function useChildChoice(kids: readonly Child[]): [string | null, (v: string) => void] {
  const [choice, setChoice] = useState<string | null>(saved);
  const set = useCallback((v: string) => {
    setChoice(v);
    try { window.localStorage.setItem(CHILD_KEY, v); } catch { /* not remembered */ }
  }, []);
  return [shownChoice(kids, choice), set];
}
