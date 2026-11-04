/**
 * S11-03, step 4: the school year's first and last day and its shape (the shared form, `YearForm`). Continue adds the shape's
 * breaks and term views and saves the two days and the shape; "I'll set this later" saves nothing and leaves a reminder on Home
 * ("Set your school year"). On its own from that reminder (`?only=year`) the button reads Save.
 */
import type { FamilySettings } from "../../api/types";
import { useApi } from "../../api/useApi";
import { StepHeading, useStep } from "./stepContext";
import { YearForm } from "./YearForm";

export function YearStep() {
  const family = useApi<FamilySettings>("/api/family");
  const { next, busy, fail, only } = useStep();
  return (
    <>
      <StepHeading>When is your school year?</StepHeading>
      {family.loading ? <p aria-busy="true">Loading…</p> : (
        <YearForm saved={family.data?.schoolYear ?? null} allowLater laterFirst={!only} submitLabel={only ? "Save" : "Continue"} busy={busy} fail={fail} onSave={next} />
      )}
    </>
  );
}
