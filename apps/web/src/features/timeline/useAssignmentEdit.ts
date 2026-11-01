/** T-07e: saving an assignment's dates from the edit bar. S6-08: reset to original. S6-10 weight nudges went with S7b-02 (the Update time estimate sheet saves its own PATCH). S6b-05: the session's date-only Reset (and its kept first dates) is gone. */
import { useState } from "react";
import { ApiError, apiPatch, apiPost } from "../../api/client";
import type { Assignment } from "../../api/types";
import { changedDates, type DateSpan } from "./select";

export function useAssignmentEdit(applyAssignment: (a: Assignment) => void) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (id: string, before: DateSpan, next: DateSpan) => {
    const patch = changedDates(before, next);
    if (!patch) return;
    setBusy(true);
    setError(null);
    try {
      const saved = await apiPatch<Assignment>(`/api/assignments/${id}`, patch);
      applyAssignment(saved);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Couldn't save. Try again.");
    } finally {
      setBusy(false);
    }
  };
  /** S6-08: back to how it was created. Resolves to null on success or the message to show. */
  const reset = async (id: string): Promise<string | null> => {
    setBusy(true);
    setError(null);
    try {
      const { assignment } = await apiPost<{ assignment: Assignment }>(`/api/assignments/${id}/reset`);
      applyAssignment(assignment);
      return null;
    } catch (e) {
      return e instanceof ApiError ? e.message : "Couldn't reset. Try again.";
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, save, reset, clearError: () => setError(null) };
}
