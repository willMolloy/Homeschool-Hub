/**
 * S15-01: the account part of the family menu. One login can belong to several accounts (their own family, a co-op they view):
 * "Switch to {account}" for each other one, and, in a viewed account, "Leave {account}". Everything here acts on the person's own
 * memberships; the server checks them again on every call. After a change the whole shell remounts (it is keyed by the account).
 */
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiPost } from "../../api/client";
import { useAuth, useMe } from "../../auth/AuthProvider";
import { Button } from "../../ui/components";
import "./account.css";

export function AccountSwitcher({ onDone }: { onDone?: () => void }) {
  const me = useMe();
  const { refresh, signOut } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const others = me.accounts.filter((a) => !a.current);

  async function switchTo(familyId: string) {
    if (busy) return;
    setBusy(true); setProblem(null);
    try {
      await apiPost("/api/auth/switch", { familyId });
      await refresh();
      onDone?.();
      navigate("/", { replace: true });
    } catch (e) {
      setProblem(e instanceof ApiError && e.status === 404 ? "That account isn't available any more." : "Couldn't switch. Please try again.");
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  async function leave() {
    if (busy) return;
    setBusy(true); setProblem(null);
    try {
      const { next } = await apiPost<{ next: unknown }>("/api/auth/leave");
      if (next) { await refresh(); onDone?.(); navigate("/", { replace: true }); } else { await signOut(); navigate("/login", { replace: true }); }
    } catch {
      setProblem("Couldn't leave. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="account-switcher">
      {others.length > 0 ? (
        <ul className="account-list" aria-label="Your accounts">
          {others.map((a) => (
            <li key={a.familyId}>
              <Button variant="secondary" disabled={busy} onClick={() => void switchTo(a.familyId)}>Switch to {a.familyName}</Button>
              {a.role === "viewer" ? <span className="account-role">View only</span> : null}
            </li>
          ))}
        </ul>
      ) : null}
      {me.role === "viewer" ? (
        confirmLeave ? (
          <div className="account-leave" role="group" aria-label={`Leave ${me.name}`}>
            <p>Leave {me.name}? You will need a new link to look at it again.</p>
            <div className="btn-row">
              <Button variant="secondary" disabled={busy} onClick={() => void leave()}>Yes, leave</Button>
              <Button variant="quiet" disabled={busy} onClick={() => setConfirmLeave(false)}>Stay</Button>
            </div>
          </div>
        ) : (
          <Button variant="quiet" disabled={busy} onClick={() => setConfirmLeave(true)}>Leave {me.name}</Button>
        )
      ) : null}
      {problem ? <p className="form-error" role="alert">{problem}</p> : null}
    </div>
  );
}
