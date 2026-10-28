/**
 * Who is signed in. Asks GET /api/me once on mount; any later 401 from the API
 * wrapper (session expired while the app was open) clears it, which sends the
 * user to /login via <RequireAuth>.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ApiError, apiGet, apiPost, onUnauthenticated } from "../api/client";
import type { Me } from "../api/types";

/** 'loading' until the first /api/me answers; 'error' if it failed for a reason other than 401. */
export type MeState = Me | null | "loading" | "error";

interface AuthContextValue {
  me: MeState;
  /** Re-ask /api/me (after login, or Retry). */
  refresh: () => Promise<void>;
  /** POST /api/auth/logout, then forget the family. */
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<MeState>("loading");

  const refresh = useCallback(async () => {
    try {
      setMe(await apiGet<Me>("/api/me"));
    } catch (e) {
      setMe(e instanceof ApiError && e.status === 401 ? null : "error");
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      await apiPost("/api/auth/logout");
    } catch {
      // Logout always clears the cookie server-side when reachable; locally we sign out regardless.
    }
    setMe(null);
  }, []);

  useEffect(() => onUnauthenticated(() => setMe(null)), []);
  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(() => ({ me, refresh, signOut }), [me, refresh, signOut]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

/** The signed-in family. Only call below <RequireAuth>. */
export function useMe(): Me {
  const { me } = useAuth();
  if (me === null || me === "loading" || me === "error") throw new Error("useMe called while signed out");
  return me;
}
