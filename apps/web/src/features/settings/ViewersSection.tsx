/**
 * S15-01: "View-only access" in Family settings: make a sign-up link (an optional label such as "Co-op"; single use, 7 days, shown once,
 * copyable and shareable; no limit on how many), cancel an open one, and see the people who can look at this account (name, email, when they
 * joined) with Remove. A viewer only ever sees Schedule and Records and can never change anything. Only parents see this section.
 */
import { useState, type FormEvent } from "react";
import { apiDelete, apiPost } from "../../api/client";
import { useApi } from "../../api/useApi";
import { useMe } from "../../auth/AuthProvider";
import { saveError } from "../schedule/formBits";
import "./parents.css";

interface ViewersResponse {
  links: { id: string; label: string | null; createdAt: string; expiresAt: string }[];
  viewers: { id: string; name: string; email: string; joinedAt: string }[];
}
interface Made { id: string; token: string; expiresAt: string }

const day = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" });

export function ViewersSection() {
  const me = useMe();
  const { data, error, loading, reload } = useApi<ViewersResponse>("/api/family/viewers");
  const [label, setLabel] = useState("");
  const [made, setMade] = useState<(Made & { link: string }) | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const canShare = typeof navigator !== "undefined" && typeof navigator.share === "function";

  async function run(work: () => Promise<void>) {
    if (busy) return;
    setBusy(true); setProblem(null); setStatus(null);
    try { await work(); } catch (err) { setProblem(saveError(err)); } finally { setBusy(false); }
  }

  const create = (e: FormEvent) => {
    e.preventDefault();
    void run(async () => {
      const m = await apiPost<Made>("/api/family/view-links", label.trim() ? { label: label.trim() } : {});
      setMade({ ...m, link: `${window.location.origin}/join/${m.token}` });
      setLabel("");
      reload();
    });
  };
  const cancel = (id: string) => run(async () => {
    await apiDelete(`/api/family/view-links/${id}`);
    if (made?.id === id) setMade(null);
    reload();
    setStatus("Link cancelled.");
  });
  const remove = (id: string, name: string) => run(async () => {
    await apiDelete(`/api/family/viewers/${id}`);
    setConfirming(null);
    reload();
    setStatus(`${name} was removed.`);
  });

  async function copy() {
    if (!made) return;
    try {
      await navigator.clipboard.writeText(made.link);
      setStatus("Link copied.");
    } catch {
      const box = document.getElementById("view-link-box") as HTMLInputElement | null;
      box?.focus();
      box?.select();
      setStatus("Press and hold the link to copy it.");
    }
  }
  async function share() {
    if (!made) return;
    try { await navigator.share({ title: `Look at ${me.name} on Homeschool Hub`, url: made.link }); } catch { /* dismissed */ }
  }

  return (
    <div className="card schedule-form parents">
      <fieldset className="choice-list">
        <legend>View-only access</legend>
        <p className="hint">People you send a link to can look at the Schedule and Records, and print or export them. They can never change anything. Access lasts until you remove it.</p>
        {loading ? <p aria-busy="true">Loading…</p> : error || !data ? (
          <div className="form-error" role="alert">
            <p>{error?.status === 0 ? "Can't reach the server." : "Couldn't load who can view."}</p>
            <button className="btn btn-secondary" type="button" onClick={reload}>Retry</button>
          </div>
        ) : (
          <>
            {data.viewers.length > 0 ? (
              <ul className="parents-invites viewers-list" aria-label="People who can view">
                {data.viewers.map((v) => (
                  <li key={v.id}>
                    <span><strong>{v.name}</strong><br /><span className="viewers-meta">{v.email} · joined {day(v.joinedAt)}</span></span>
                    {confirming === v.id ? (
                      <span className="viewers-confirm" role="group" aria-label={`Remove ${v.name}`}>
                        <button className="btn btn-secondary" type="button" disabled={busy} onClick={() => void remove(v.id, v.name)}>Yes, remove</button>
                        <button className="btn btn-quiet" type="button" disabled={busy} onClick={() => setConfirming(null)}>Keep</button>
                      </span>
                    ) : (
                      <button className="btn btn-secondary" type="button" disabled={busy} aria-label={`Remove ${v.name}`} onClick={() => setConfirming(v.id)}>Remove</button>
                    )}
                  </li>
                ))}
              </ul>
            ) : <p className="hint">No one has joined yet.</p>}
            {data.links.length > 0 ? (
              <ul className="parents-invites" aria-label="Open view-only links">
                {data.links.map((l) => (
                  <li key={l.id}>
                    <span>{l.label ? `${l.label}: ` : ""}link made {day(l.createdAt)}, ends {day(l.expiresAt)}</span>
                    <button className="btn btn-secondary" type="button" disabled={busy} aria-label={`Cancel link made ${day(l.createdAt)}${l.label ? ` (${l.label})` : ""}`} onClick={() => void cancel(l.id)}>Cancel link</button>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        )}
        {made ? (
          <div className="parents-link" role="group" aria-label="View-only link">
            <label htmlFor="view-link-box">Send this link to the person who should see your schedule</label>
            <input id="view-link-box" type="text" readOnly value={made.link} onFocus={(e) => e.currentTarget.select()} />
            <div className="btn-row">
              <button className="btn" type="button" onClick={() => void copy()}>Copy link</button>
              {canShare ? <button className="btn btn-secondary" type="button" onClick={() => void share()}>Share</button> : null}
            </div>
            <p className="hint">It works once and ends in 7 days if unused. It is shown only now; if you lose it, cancel it and make a new one.</p>
          </div>
        ) : null}
        {me.demo ? (
          <p className="hint">The demo family can&apos;t share view-only access.</p>
        ) : (
          <form className="viewers-new" onSubmit={create}>
            <label htmlFor="view-link-label">Label (optional)</label>
            <input id="view-link-label" type="text" maxLength={60} autoComplete="off" placeholder="Co-op" value={label} onChange={(e) => setLabel(e.target.value)} />
            <div className="btn-row">
              <button className="btn btn-secondary" type="submit" disabled={busy}>Create a sign-up link</button>
            </div>
          </form>
        )}
        {problem ? <p className="form-error" role="alert">{problem}</p> : null}
        <p className="form-status" role="status">{status}</p>
      </fieldset>
    </div>
  );
}
