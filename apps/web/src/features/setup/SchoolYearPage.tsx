/**
 * S11b-02: /setup/school-year. The school year's first and last day, its shape and its term views, always reachable from Set up,
 * so putting the year off in the setup flow (and hiding the Home reminder) never loses it. It is the setup flow's step 4
 * (`YearForm`), with the saved shape chosen, no "I'll set this later", and a way to edit the term views.
 */
import { useState } from "react";
import { apiPatch } from "../../api/client";
import type { FamilySettings, FamilySettingsPatch } from "../../api/types";
import { useApi } from "../../api/useApi";
import { useAuth } from "../../auth/AuthProvider";
import { Button } from "../../ui/components";
import { EditZoomViewsSheet } from "../timeline/EditZoomViews";
import { saveError } from "../schedule/formBits";
import { YearForm } from "../welcome/YearForm";
import { BackToSetup } from "./SetupPage";
import "../../ui/forms.css";
import "../schedule/schedule.css";

export function SchoolYearPage() {
  const { data, error, loading, reload, setData } = useApi<FamilySettings>("/api/family");
  const { refresh } = useAuth();
  const [problem, setProblem] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [views, setViews] = useState(false);

  async function save(patch: FamilySettingsPatch): Promise<boolean> {
    setBusy(true);
    setStatus(null);
    try {
      if (Object.keys(patch).length > 0) await apiPatch("/api/family", patch);
      await refresh();
      reload();
      setStatus("Saved.");
      return true;
    } catch (err) {
      setProblem(saveError(err));
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="schedule">
      <BackToSetup />
      <h1>School year</h1>
      {loading ? <p aria-busy="true">Loading…</p> : error || !data ? (
        <div className="form-error" role="alert">
          <p>{error?.status === 0 ? "Can't reach the server." : "Couldn't load your school year."}</p>
          <button className="btn btn-secondary" type="button" onClick={reload}>Retry</button>
        </div>
      ) : (
        <div className="card">
          {problem ? <p className="form-error" role="alert">{problem}</p> : null}
          <YearForm key={JSON.stringify(data.schoolYear ?? null)} saved={data.schoolYear ?? null} allowLater={false} laterFirst={false} submitLabel="Save" busy={busy} fail={setProblem} onSave={save} />
          <p className="form-status" role="status">{status}</p>
          <div className="btn-row"><Button variant="secondary" onClick={() => setViews(true)}>Edit term views</Button></div>
          <EditZoomViewsSheet open={views} views={data.zoomViews} onClose={() => setViews(false)} onSaved={(z) => { setData({ ...data, zoomViews: z }); setViews(false); }} />
        </div>
      )}
    </section>
  );
}
