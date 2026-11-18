/**
 * S21-01: ask before a save that would cover open books. No overlap saves straight away.
 * Cancel leaves the plan alone. The caller saves, and a failed save keeps the sheet open.
 */
import { useState } from "react";
import type { BreakOverlap, OverlapAssignment } from "@hh/engine";
import type { BlockedRange } from "../../api/types";
import { saveError } from "./formBits";
import { BreakOverlapSheet } from "./BreakOverlapSheet";
import { overlapContext, type ProposedBreak } from "./breakOverlap";

interface Pending {
  rows: BreakOverlap[];
  proposed: ProposedBreak[];
  assignments: OverlapAssignment[];
  existing: BlockedRange[];
  schoolDays: number[];
  subjectWeekdays: { subjectId: string; weekdays: number[] | null }[];
  perform: (adjustments: { assignmentId: string; endDate: string }[]) => Promise<void>;
  resolve: () => void;
}

export function useBreakOverlap(schoolDays: readonly number[]) {
  const [pending, setPending] = useState<Pending | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /** True when the save ran (or there was nothing to ask). False when she cancels the sheet. */
  async function ask(proposed: ProposedBreak[], existing: readonly BlockedRange[], perform: (adjustments: { assignmentId: string; endDate: string }[] | null) => Promise<void>): Promise<boolean> {
    const found = await overlapContext(proposed, existing, schoolDays);
    if (found.rows.length === 0) {
      await perform(null);
      return true;
    }
    return new Promise<boolean>((resolve) => {
      setError(null);
      setPending({
        rows: found.rows,
        proposed: [...proposed],
        assignments: found.assignments,
        existing: [...existing],
        schoolDays: [...schoolDays],
        subjectWeekdays: found.subjectWeekdays,
        perform: async (adjustments) => {
          setSaving(true);
          setError(null);
          try {
            await perform(adjustments);
            setPending(null);
            resolve(true);
          } catch (err) {
            setError(saveError(err));
          } finally {
            setSaving(false);
          }
        },
        resolve: () => resolve(false),
      });
    });
  }

  const sheet = pending ? (
    <BreakOverlapSheet
      rows={pending.rows}
      proposed={pending.proposed}
      assignments={pending.assignments}
      existing={pending.existing.map((b) => ({ start: b.startDate, end: b.endDate, childIds: b.childIds }))}
      schoolDays={pending.schoolDays}
      subjectWeekdays={pending.subjectWeekdays}
      saving={saving}
      error={error}
      onCancel={() => {
        if (saving) return;
        const done = pending.resolve;
        setPending(null);
        done();
      }}
      onConfirm={(adjustments) => { void pending.perform(adjustments); }}
    />
  ) : null;

  return { ask, sheet };
}
