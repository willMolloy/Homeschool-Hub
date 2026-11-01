/**
 * S9-01, S9-03, S9-07: Records, the second main job. A family with no log setup is asked to set one up first (template styles,
 * never a state). Then: Log (a sheet), Log setup, and the entries list with Edit and Delete (Delete is undone from the undo bar).
 * Totals for a range come with S9-08.
 */
import { useState } from "react";
import { ApiError, apiDelete } from "../../api/client";
import type { Child, FamilySettings, RecordEntry, Subject } from "../../api/types";
import { useApi } from "../../api/useApi";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { Button } from "../../ui/components";
import { LogEntryForm } from "./LogEntryForm";
import { LogSetupForm } from "./LogSetupForm";
import { dayWords, summaryOf } from "./entryText";
import { trackedWords } from "./logSetup";
import "./records.css";

export function RecordsPage() {
  const family = useApi<FamilySettings>("/api/family");
  const subjects = useApi<Subject[]>("/api/subjects");
  const children = useApi<Child[]>("/api/children");
  const entries = useApi<RecordEntry[]>("/api/log-entries");
  const [changing, setChanging] = useState(false);
  const [logging, setLogging] = useState<RecordEntry | "new" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const setup = family.data?.logSetup ?? null;

  const failed = family.error || subjects.error || children.error || entries.error;
  if (failed) {
    return <section className="records-page"><h1>Records</h1><div className="form-error" role="alert"><p>Couldn&apos;t load your records.</p><Button variant="secondary" onClick={() => { family.reload(); subjects.reload(); children.reload(); entries.reload(); }}>Retry</Button></div></section>;
  }
  if (!family.data || !subjects.data || !children.data || !entries.data) return <section className="records-page"><h1>Records</h1><p aria-busy="true">Loading…</p></section>;

  const saved = (f: FamilySettings, s: Subject[]) => { family.setData(f); subjects.setData(s); setChanging(false); };
  if (!setup || changing) {
    return (
      <section className="records-page">
        <h1>{setup ? "Log setup" : "Set up your log"}</h1>
        {!setup ? <p className="records-lead">Choose what your records track. You can change this any time, and nothing you have logged is lost.</p> : null}
        <LogSetupForm initial={setup?.fields ?? null} subjects={subjects.data} onSaved={saved} onCancel={setup ? () => setChanging(false) : undefined} />
      </section>
    );
  }
  const nameOf = (id: string) => children.data!.find((c) => c.id === id)?.name ?? "Child";
  const remove = async (e: RecordEntry) => {
    setError(null);
    try { await apiDelete(`/api/log-entries/${e.id}`); entries.reload(); }
    catch (err) { setError(err instanceof ApiError ? err.message : "Couldn't delete that. Please try again."); }
  };
  return (
    <section className="records-page">
      <h1>Records</h1>
      <div className="records-actions">
        <Button onClick={() => setLogging("new")}>Log</Button>
        <Button variant="secondary" onClick={() => setChanging(true)}>Change log setup</Button>
      </div>
      <p className="records-lead">Your log tracks <strong>{trackedWords(setup.fields)}</strong>.</p>
      {error ? <p className="form-error" role="alert">{error}</p> : null}
      {entries.data.length === 0 ? <p className="records-lead">Nothing logged yet. Tap Log to add a day, a week or a month.</p> : (
        <ul className="entry-list" aria-label="Log entries">
          {entries.data.map((e) => (
            <li key={e.id} className="entry-row">
              <div className="entry-head">{dayWords(e)} · {nameOf(e.childId)}</div>
              <p className="entry-sum">{summaryOf(e, subjects.data!)}</p>
              <div className="entry-actions">
                <Button variant="quiet" aria-label={`Edit ${nameOf(e.childId)}, ${dayWords(e)}`} onClick={() => setLogging(e)}>Edit</Button>
                <Button variant="quiet" aria-label={`Delete ${nameOf(e.childId)}, ${dayWords(e)}`} onClick={() => void remove(e)}>Delete</Button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <ResponsiveSheet open={logging !== null} onOpenChange={(o) => !o && setLogging(null)} title={logging === "new" || logging === null ? "Log" : "Change entry"} wide="side">
        {logging ? (
          <LogEntryForm key={logging === "new" ? "new" : logging.id} fields={setup.fields} children={children.data} subjects={subjects.data}
            entry={logging === "new" ? undefined : logging} onCancel={() => setLogging(null)} onSaved={() => { setLogging(null); entries.reload(); }} />
        ) : null}
      </ResponsiveSheet>
    </section>
  );
}
