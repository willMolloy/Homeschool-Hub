/**
 * Tells plan views to refetch after something changed the plan elsewhere on the page (S2b-26), so the
 * bars update without a page reload. Outside a provider, invalidate is a no-op and version stays 0.
 */
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export interface PlanRefresh {
  /** Bumps on every invalidate; plan views refetch when it changes. */
  version: number;
  invalidate: () => void;
}

const PlanRefreshContext = createContext<PlanRefresh>({ version: 0, invalidate: () => {} });

export function PlanRefreshProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0);
  const invalidate = useCallback(() => setVersion((v) => v + 1), []);
  const value = useMemo(() => ({ version, invalidate }), [version, invalidate]);
  return <PlanRefreshContext.Provider value={value}>{children}</PlanRefreshContext.Provider>;
}

export const usePlanRefresh = () => useContext(PlanRefreshContext);
