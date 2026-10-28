/**
 * Tells views to refetch after a save elsewhere on the page, so they update without a page reload:
 * plan views when the plan changed (S2b-26), and check-in lists after any check-in save (S2c-05).
 * Outside a provider both signals are no-ops and both versions stay 0.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface PlanRefresh {
  /** Bumps on every invalidate; plan views refetch when it changes. */
  version: number;
  invalidate: () => void;
  /** Bumps on every successful check-in save, whatever it changed; check-in lists refetch when it changes. */
  checkInsVersion: number;
  checkInsSaved: () => void;
}

const PlanRefreshContext = createContext<PlanRefresh>({ version: 0, invalidate: () => {}, checkInsVersion: 0, checkInsSaved: () => {} });

export function PlanRefreshProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const [checkInsVersion, setCheckInsVersion] = useState(0);
  const invalidate = useCallback(() => setVersion((v) => v + 1), []);
  const checkInsSaved = useCallback(() => setCheckInsVersion((v) => v + 1), []);
  const value = useMemo(() => ({ version, invalidate, checkInsVersion, checkInsSaved }), [version, invalidate, checkInsVersion, checkInsSaved]);
  return <PlanRefreshContext.Provider value={value}>{children}</PlanRefreshContext.Provider>;
}

export const usePlanRefresh = () => useContext(PlanRefreshContext);
