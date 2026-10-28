/**
 * The suggested weight for an assignment being added (S2b-11): GET /api/weights/suggestion, debounced, with
 * stale responses dropped. A failed request falls back to the built-in so the form is never blocked.
 */
import { useEffect, useRef, useState } from "react";
import { DEFAULT_WEIGHT_PER_UNIT, isLearnedUnit } from "@hh/engine";
import { apiGet } from "../../api/client";
import type { UnitType, WeightSuggestion } from "../../api/types";

export const SUGGESTION_DEBOUNCE_MS = 250;

/** What the form falls back to before or without an answer. */
export const builtinSuggestion = (unitType: UnitType): WeightSuggestion => ({
  unitType,
  weightPerUnit: DEFAULT_WEIGHT_PER_UNIT[unitType],
  source: "builtin",
  builtInDefault: DEFAULT_WEIGHT_PER_UNIT[unitType],
  subjectDefault: null,
  learned: isLearnedUnit(unitType),
  children: [],
});

export function suggestionPath(unitType: UnitType, childIds: readonly string[], subjectId: string): string {
  const q = new URLSearchParams({ unitType });
  if (childIds.length > 0) q.set("childIds", childIds.join(","));
  if (subjectId) q.set("subjectId", subjectId);
  return `/api/weights/suggestion?${q.toString()}`;
}

/**
 * `enabled: false` (editing an untouched unit) makes no request and returns null.
 * Otherwise returns the latest answer for these inputs, the built-in on failure, or null while the first is in flight.
 */
export function useWeightSuggestion(
  unitType: UnitType, childIds: readonly string[], subjectId: string, enabled: boolean,
): WeightSuggestion | null {
  const [result, setResult] = useState<{ path: string; value: WeightSuggestion } | null>(null);
  const latest = useRef(0);
  const path = enabled ? suggestionPath(unitType, [...childIds].sort(), subjectId) : null;

  useEffect(() => {
    if (!path) return;
    const ticket = ++latest.current;
    const timer = setTimeout(() => {
      apiGet<WeightSuggestion>(path).then(
        (value) => { if (ticket === latest.current) setResult({ path, value }); },
        () => { if (ticket === latest.current) setResult({ path, value: builtinSuggestion(unitType) }); },
      );
    }, SUGGESTION_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [path, unitType]);

  if (!path) return null;
  // Keep showing the last answer for the same unit while a newer one loads, so the field doesn't flicker.
  return result && result.value.unitType === unitType ? result.value : null;
}
