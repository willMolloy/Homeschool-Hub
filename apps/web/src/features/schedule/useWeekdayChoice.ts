/**
 * S4-07: the weekday chips of the assignment forms. The chips start from what the assignment would inherit
 * (the subject's default, else every school day); tapping one customises, and until then a change of subject re-prefills.
 * What is saved is null when the chips equal what is inherited, so the assignment keeps following the subject (S4-05).
 */
import { useState } from "react";
import { useMe } from "../../auth/AuthProvider";
import { offeredDays, sameSet } from "./formBits";
import type { Lookups } from "./lookups";

const sorted = (days: readonly number[]) => [...days].sort((a, b) => a - b);

export function useWeekdayChoice(l: Lookups, subjectId: string, own: number[] | null) {
  const { schoolDays } = useMe();
  const [picked, setPicked] = useState<number[] | null>(own);
  // S4b-04: whether a chip was tapped; an edit that never touched the chips never sends `weekdays`.
  const [touched, setTouched] = useState(false);
  const inherited = (subjectId ? l.subjectWeekdays(subjectId) : null) ?? schoolDays;
  const shown = picked ?? inherited;
  const matches = sameSet(shown, inherited);
  return {
    shown,
    offer: offeredDays(schoolDays, [...inherited, ...(own ?? [])]),
    /** A tap: at least one day always stays. */
    change: (days: number[]) => {
      if (days.length === 0) return;
      setPicked(days);
      setTouched(true);
    },
    touched,
    /** Back to following the subject (after it was made the subject's default). */
    follow: () => {
      setPicked(null);
      setTouched(true);
    },
    /** What a save sends: null = follow the subject. */
    value: matches ? null : sorted(shown),
    /** The chips differ from the subject's days, so "Set as default" applies. */
    differs: !matches,
    /** What "Set as default" stores on the subject: null when every school day is chosen. */
    defaultValue: sameSet(shown, schoolDays) ? null : sorted(shown),
  };
}
