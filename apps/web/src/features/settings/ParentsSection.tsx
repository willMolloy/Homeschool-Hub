/**
 * S14-03: "Parents" in Family settings: who is on the family, "Invite another parent" (a link for THIS family: single use, 7 days,
 * shown once, copyable and shareable), and the open invites with "Cancel invite". No removing parents here (Will).
 */
import { useState } from "react";
import { apiDelete, apiPost } from "../../api/client";
import { useApi } from "../../api/useApi";
import { useMe } from "../../auth/AuthProvider";
import { saveError } from "../schedule/formBits";
import "./parents.css";

interface ParentsResponse {
  parents: { id: string; name: string; you: boolean }[];
  invites: { id: string; createdAt: string; expiresAt: string }[];
}
interface Made { id: string; token: string; expiresAt: string }

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function ParentsSection() {
  const me = useMe();
  const { data, error, loading, reload } = useApi<ParentsResponse>("/api/family/parents");
  const [made, setMade] = useState<(Made & { link: string }) | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function invite() {
    if (busy) return;
    setBusy(true); setProblem(null); setStatus(null);
    try {
      const m = await apiPost<Made>("/api/family/invites");
      setMade({ ...m, link: `${window.location.origin}/join/${m.token}` });
      reload();
    } catch (err) {
      setProblem(saveError(err));
    } finally {
      setBusy(false);
    }
  }

  async function cancel(id: string) {
    if (busy) return;
    setBusy(true); setProblem(null); setStatus(null);
    try {
      await apiDelete(`/api/family/invites/${id}`);
      if (made?.id === id) setMade(null);
      reload();
      setStatus("Invite cancelled.");
    } catch (err) {
      setProblem(saveError(err));
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!made) return;
    try {
      await navigator.clipboard.writeText(made.link);
      setStatus("Link copied.");
    } catch {
      // No clipboard (an insecure address, or a browser that refuses): select the link so it can be copied by hand.
      const box = document.getElementById("parent-invite-link") as HTMLInputElement | null;
      box?.focus();
      box?.select();
      setStatus("Press and hold the link to copy it.");
    }
  }

  async function share() {
    if (!made) return;
    try {
      await navigator.share({ title: "Join our family on Homeschool Hub", url: made.link });
    } catch {
      // The sheet was dismissed: nothing to say.
    }
  }

  return (
    <div className="card schedule-form parents">
      <fieldset className="choice-list">
        <legend>Parents</legend>
        {loading ? <p aria-busy="true">Loading…</p> : error || !data ? (
          <div className="form-error" role="alert">
            <p>{error?.status === 0 ? "Can't reach the server." : "Couldn't load the parents."}</p>
            <button className="btn btn-secondary" type="button" onClick={reload}>Retry</button>
          </div>
        ) : (
          <>
            <ul className="parents-list" aria-label="Parents in this family">
              {data.parents.map((p) => <li key={p.id}>{p.name}{p.you ? <span className="parents-you">(you)</span> : null}</li>)}
            </ul>
            {data.invites.length > 0 ? (
              <ul className="parents-invites" aria-label="Open invites">
                {data.invites.map((i) => (
                  <li key={i.id}>
                    <span>Invite made {day(i.createdAt)}, ends {day(i.expiresAt)}</span>
                    <button className="btn btn-secondary" type="button" disabled={busy} aria-label={`Cancel invite made ${day(i.createdAt)}`} onClick={() => void cancel(i.id)}>Cancel invite</button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
        {made ? (
          <div className="parents-link" role="group" aria-label="Invite link">
            <label htmlFor="parent-invite-link">Send this link to the other parent</label>
            <input id="parent-invite-link" type="text" readOnly value={made.link} onFocus={(e) => e.currentTarget.select()} />
            <div className="btn-row">
              <button className="btn" type="button" onClick={() => void copy()}>Copy link</button>
              {canShare ? <button className="btn btn-secondary" type="button" onClick={() => void share()}>Share</button> : null}
            </div>
            <p className="hint">It works once and ends in 7 days. It is shown only now; if you lose it, cancel the invite and make a new one.</p>
          </div>
        ) : null}
        {me.demo ? (
          <p className="hint">The demo family can&apos;t invite another parent.</p>
        ) : (
          <div className="btn-row">
            <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void invite()}>Invite another parent</button>
          </div>
        )}
        {problem ? <p className="form-error" role="alert">{problem}</p> : null}
        <p className="form-status" role="status">{status}</p>
      </fieldset>
    </div>
  );
}
