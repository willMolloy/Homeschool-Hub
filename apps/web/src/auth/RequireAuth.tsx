import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "./AuthProvider";
import "../ui/forms.css";
import "./auth.css";

/** Renders children only when signed in; otherwise redirects to /login, remembering where we were. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { me, refresh } = useAuth();
  const location = useLocation();
  if (me === "loading") {
    return (
      <div className="auth-wait" role="status" aria-live="polite">
        <span className="spinner" aria-hidden="true" />
        <span>Loading…</span>
      </div>
    );
  }
  if (me === "error") {
    return (
      <div className="auth-wait" role="alert">
        <p>Can't reach the server.</p>
        <button className="btn" type="button" onClick={() => void refresh()}>Try again</button>
      </div>
    );
  }
  if (me === null) return <Navigate to="/login" state={{ from: location }} replace />;
  return <>{children}</>;
}
