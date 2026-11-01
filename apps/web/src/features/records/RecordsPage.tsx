/**
 * S9-01, S9-03: Records, the second main job. A family with no log setup is asked to set one up first (template styles, never
 * a state); once it has one, the page says what its records track, with a way to change it. Logging and totals come with S9-07/08.
 */
import { useState } from "react";
import type { FamilySettings, Subject } from "../../api/types";
import { useApi } from "../../api/useApi";
import { Button, Card } from "../../ui/components";
import { LogSetupForm } from "./LogSetupForm";
import { trackedWords } from "./logSetup";
import "./records.css";

export function RecordsPage() {
  const family = useApi<FamilySettings>("/api/family");
  const subjects = useApi<Subject[]>("/api/subjects");
  const [changing, setChanging] = useState(false);
  const setup = family.data?.logSetup ?? null;

  if (family.error || subjects.error) {
    return <section className="records-page"><h1>Records</h1><div className="form-error" role="alert"><p>Couldn&apos;t load your records.</p><Button variant="secondary" onClick={() => { family.reload(); subjects.reload(); }}>Retry</Button></div></section>;
  }
  if (!family.data || !subjects.data) return <section className="records-page"><h1>Records</h1><p aria-busy="true">Loading…</p></section>;

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
  return (
    <section className="records-page">
      <h1>Records</h1>
      <Card className="records-tracks">
        <h2>Your log tracks</h2>
        <p>{trackedWords(setup.fields)}</p>
        <Button variant="secondary" onClick={() => setChanging(true)}>Change log setup</Button>
      </Card>
    </section>
  );
}
