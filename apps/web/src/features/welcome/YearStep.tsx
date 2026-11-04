/**
 * S11-03, step 4: the school year's first and last day and its shape, as cards (Fall and Spring by default), or "I'll set this
 * later". A preview line says what the shape adds. Continue adds the shape's breaks (the existing calendar templates), applies
 * its term views, and saves the two days; "later" saves nothing and leaves a reminder on Home ("Set your school year").
 */
import { useId, useMemo, useState, type FormEvent } from "react";
import { apiGet, apiPost } from "../../api/client";
import type { BlockedRange, FamilySettings, SetupDeferral } from "../../api/types";
import { useApi } from "../../api/useApi";
import { useMe } from "../../auth/AuthProvider";
import { Button } from "../../ui/components";
import { DateField } from "../../ui/DateField";
import { dateRangeError, saveError } from "../schedule/formBits";
import { MAX_YEAR_DAYS, leaveOutExisting } from "../schedule/templates";
import { StepHeading, useStep } from "./stepContext";
import { SHAPES, planYear, previewLine, zoomViewsFor, type ShapeId } from "./yearShapes";

export function YearStep() {
  const family = useApi<FamilySettings>("/api/family");
  if (family.loading) return <><StepHeading>When is your school year?</StepHeading><p aria-busy="true">Loading…</p></>;
  return <YearForm saved={family.data?.schoolYear ?? null} />;
}

function YearForm({ saved }: { saved: { start: string; end: string } | null }) {
  const me = useMe();
  const { next, busy, fail, only } = useStep();
  const existing = useApi<BlockedRange[]>("/api/blocked-ranges");
  const [start, setStart] = useState(saved?.start ?? "");
  const [end, setEnd] = useState(saved?.end ?? "");
  const [shape, setShape] = useState<ShapeId>("fall-spring");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const ids = { start: useId(), end: useId() };
  const later = shape === "later";
  const problem = later ? null : dateRangeError(start, end, MAX_YEAR_DAYS);
  const plan = useMemo(() => (later || problem ? null : planYear(shape, start, end, me.weekStart)), [later, problem, shape, start, end, me.weekStart]);
  const preview = later ? previewLine("later", { breaks: [], halves: null, terms: null }, []) : plan && existing.data ? previewLine(shape, plan, existing.data) : null;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy || saving) return;
    fail(null);
    const rest = me.setupDeferred.filter((d) => d !== "year");
    if (later) {
      await next({ setupDeferred: [...rest, "year"] as SetupDeferral[] });
      return;
    }
    if (problem || !plan) return setError(problem === "Pick a start and an end date." ? "Pick the first and last day of the school year." : problem);
    setError(null);
    setSaving(true);
    try {
      // Breaks first: if the save after them fails, trying again leaves out the days off that are already there.
      const { add } = leaveOutExisting(plan.breaks, (await apiGet<BlockedRange[]>("/api/blocked-ranges")));
      if (add.length > 0) {
        await apiPost<BlockedRange[]>("/api/blocked-ranges/bulk", { blockedRanges: add.map((b) => ({ label: b.label, kind: b.kind, startDate: b.start, endDate: b.end, childIds: [] })) });
      }
      const zoom = zoomViewsFor(plan, (await apiGet<FamilySettings>("/api/family")).zoomViews);
      await next({ schoolYear: { start, end }, ...(zoom ? { zoomViews: zoom } : {}), setupDeferred: rest });
    } catch (err) {
      fail(saveError(err));
    } finally {
      setSaving(false);
    }
  }

  const invalid = (id: string) => (error ? { "aria-invalid": true as const, "aria-describedby": `${id}-err` } : {});
  return (
    <form onSubmit={submit} noValidate>
      <StepHeading>When is your school year?</StepHeading>
      {later ? null : (
        <div className="field-row">
          <div className="field">
            <label htmlFor={ids.start}>First day</label>
            <DateField id={ids.start} value={start} onChange={(v) => { setStart(v); setError(null); }} {...invalid(ids.start)} />
          </div>
          <div className="field">
            <label htmlFor={ids.end}>Last day</label>
            <DateField id={ids.end} value={end} onChange={(v) => { setEnd(v); setError(null); }} {...invalid(ids.end)} />
          </div>
        </div>
      )}
      {error ? <p className="field-error" id={`${ids.start}-err`} role="alert">{error}</p> : null}
      <fieldset className="shape-cards">
        <legend>The shape of the year</legend>
        {SHAPES.map((s) => (
          <label key={s.id} className="shape-card">
            <input type="radio" name="shape" value={s.id} checked={shape === s.id} onChange={() => { setShape(s.id); setError(null); }} />
            <span className="shape-name">{s.label}</span>
            <span className="shape-hint">{s.hint}</span>
          </label>
        ))}
      </fieldset>
      <p className="welcome-preview" aria-live="polite">{preview}</p>
      <div className="btn-row"><Button type="submit" disabled={busy || saving}>{only ? "Save" : "Continue"}</Button></div>
    </form>
  );
}

