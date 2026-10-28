/**
 * The subject create/edit form: the shared roster fields plus the default bar width (S2b-35).
 * Kept separate from RosterForm so the kids form never sees subject-only fields.
 */
import { useState } from "react";
import { ApiError } from "../../api/client";
import { useApi } from "../../api/useApi";
import type { Assignment, Subject, SubjectDefaultWeight } from "../../api/types";
import { DefaultWeightSection, draftFrom, draftValue, type DefaultWeightDraft } from "./DefaultWeightSection";
import { RosterForm } from "./RosterForm";
import type { RosterFormSlotProps } from "./RosterPage";
import type { RosterValues } from "./RosterForm";

export interface SubjectValues extends RosterValues {
  defaultWeight: SubjectDefaultWeight | null;
}

/** Live assignments in this subject and unit with no weight of their own, i.e. the ones whose bars follow the default. */
export function countUsingDefault(assignments: readonly Assignment[], subjectId: string, unitType: string): number {
  return assignments.filter((a) => !a.archived && a.subjectId === subjectId && a.unitType === unitType && a.weightPerUnit == null).length;
}

const noteFor = (n: number) =>
  n > 0 ? `This changes the bars of ${n} assignment${n === 1 ? "" : "s"} that use the subject default.` : null;

/** Server errors about the default look like "defaultWeight.weightPerUnit: …". */
const isDefaultWeightError = (err: unknown): err is ApiError =>
  err instanceof ApiError && err.status === 400 && /^defaultWeight\b/.test(err.message);

/** Mounted only while editing, so adding a subject costs no extra request. Says nothing until the list loads. */
function AffectedNote({ subjectId, unitType }: { subjectId: string; unitType: string }) {
  const { data } = useApi<Assignment[]>("/api/assignments");
  const text = data ? noteFor(countUsingDefault(data, subjectId, unitType)) : null;
  return text ? <p className="hint default-weight-note">{text}</p> : null;
}

export function SubjectForm({ initial, onSave, item, ...rest }: RosterFormSlotProps<Subject, SubjectValues>) {
  const [draft, setDraft] = useState<DefaultWeightDraft>(() => draftFrom(initial.defaultWeight));
  const [weightError, setWeightError] = useState<string | null>(null);
  const [weightValid, setWeightValid] = useState(true);

  async function save(values: RosterValues) {
    setWeightError(null);
    try {
      await onSave({ ...values, defaultWeight: draftValue(draft) });
    } catch (err) {
      // Shown next to the default rather than under Name; the form stays open.
      if (isDefaultWeightError(err)) return setWeightError(err.message.replace(/^[a-zA-Z.]+: /, ""));
      throw err;
    }
  }

  return (
    <RosterForm {...rest} initial={{ name: initial.name, color: initial.color }} onSave={save} blocked={!weightValid}>
      <DefaultWeightSection
        value={draft}
        onChange={(d) => {
          setWeightError(null);
          setDraft(d);
        }}
        note={item ? <AffectedNote subjectId={item.id} unitType={draft.unitType} /> : null}
        error={weightError}
        onValidityChange={setWeightValid}
      />
    </RosterForm>
  );
}
