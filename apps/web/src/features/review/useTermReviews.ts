/** S13-04: the Term in review numbers for several children and one range, from the family's own data (nothing is sent anywhere). */
import { useEffect, useState } from "react";
import { apiGet } from "../../api/client";
import type { Child, FamilySettings, LogFields, RecordTotals, Subject } from "../../api/types";
import { buildTermReview, type TermReview } from "./termReview";

/** A family that hasn't set up its log tracks nothing: the card then has nothing to show. */
const NOTHING_TRACKED: LogFields = { subjectHours: false, coreSplit: false, totalHours: false, schoolDays: false, homeAway: false, notes: false, books: false };

export interface TermReviewsState { reviews: TermReview[] | undefined; failed: boolean }

export function useTermReviews(input: { kids: readonly Child[]; range: { start: string; end: string } | null; subjects: readonly Subject[] | undefined; family: FamilySettings | undefined }): TermReviewsState {
  const { kids, range, subjects, family } = input;
  const [state, setState] = useState<TermReviewsState>({ reviews: undefined, failed: false });
  const ids = kids.map((k) => k.id).join(",");
  const fields = family ? family.logSetup?.fields ?? NOTHING_TRACKED : undefined;
  useEffect(() => {
    if (!range || !subjects || !fields || kids.length === 0) { setState({ reviews: undefined, failed: false }); return; }
    let live = true;
    setState({ reviews: undefined, failed: false });
    Promise.all(kids.map((c) => apiGet<RecordTotals>(`/api/records/totals?from=${range.start}&to=${range.end}&childId=${c.id}`))).then(
      (all) => live && setState({ reviews: kids.map((c, i) => buildTermReview({ child: c, range, subjects, fields, totals: all[i]! })), failed: false }),
      () => live && setState({ reviews: undefined, failed: true }),
    );
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids, range?.start, range?.end, subjects, fields]);
  return state;
}
