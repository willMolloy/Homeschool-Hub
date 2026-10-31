/**
 * S6-08: the "last change" the API can undo (S6-06), for the quiet bar at the bottom. Any successful plan-changing
 * request (see `onPlanChange` in api/client.ts) asks GET /api/undo what to offer. The offer goes away on the next
 * navigation to another page, or when the next change replaces it. Undo puts the change back, then remounts the page
 * (`round`) so every list and picture reloads from the API.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ApiError, apiGet, apiPost, onPlanChange } from "../../api/client";

export interface UndoState {
  /** What the last change was ("Moved Treasure Island"), or null when nothing is offered. */
  label: string | null;
  /** A refusal or failure to show in place of the offer. */
  error: string | null;
  busy: boolean;
  /** Bumps after an undo attempt; the shell remounts the page on it. */
  round: number;
  undo: () => Promise<void>;
}

const NONE: UndoState = { label: null, error: null, busy: false, round: 0, undo: async () => {} };
const UndoContext = createContext<UndoState>(NONE);
export const useUndo = () => useContext(UndoContext);

export const CANT_UNDO = "That change can't be undone any more.";

export function UndoProvider({ children }: { children: ReactNode }) {
  const [label, setLabel] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [round, setRound] = useState(0);
  const { pathname } = useLocation();
  // An answer that started before the last navigation is for the page we left.
  const page = useRef(0);
  useEffect(() => {
    page.current += 1;
    setLabel(null);
    setError(null);
  }, [pathname]);

  useEffect(() => onPlanChange(() => {
    const at = page.current;
    setError(null);
    apiGet<{ label: string } | null>("/api/undo").then(
      (entry) => { if (at === page.current) setLabel(entry?.label ?? null); },
      () => { if (at === page.current) setLabel(null); },
    );
  }), []);

  const undo = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      await apiPost("/api/undo");
      setLabel(null);
      setRound((r) => r + 1);
    } catch (e) {
      if (e instanceof ApiError && (e.status === 409 || e.status === 404)) {
        setLabel(null);
        setError(CANT_UNDO);
        setRound((r) => r + 1);
      } else {
        setError("Couldn't undo. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const value = useMemo(() => ({ label, error, busy, round, undo }), [label, error, busy, round, undo]);
  return <UndoContext.Provider value={value}>{children}</UndoContext.Provider>;
}
