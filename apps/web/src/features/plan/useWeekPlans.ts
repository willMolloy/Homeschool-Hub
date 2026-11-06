/** The engine's plans for one week (GET /api/plan), refetched when a save elsewhere changes the plan. */
import { useCallback, useEffect, useState } from "react";
import { addDays, type ChildPlan, type LocalDate } from "@hh/engine";
import { apiGet } from "../../api/client";
import type { PlanResponse } from "../../api/types";
import { usePlanRefresh } from "./planRefresh";
import { spanWindow } from "./useSpanPlans";

export interface WeekPlansState {
  /** undefined while loading or after a failure. */
  plans: ChildPlan[] | undefined;
  failed: boolean;
  retry: () => void;
}

/**
 * `around` (S18-03): also ask for the days either side of the week (`spanWindow`), which the chapter and lesson words ("start", "day 2 of 3",
 * "finish") need to be exact; the Week bars, a finished week's bars and Update status say the same words as Days and the sheets that way.
 */
export function useWeekPlansState(weekStart: LocalDate | undefined, around = false): WeekPlansState {
  const [plans, setPlans] = useState<ChildPlan[] | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);
  const { version } = usePlanRefresh();
  useEffect(() => {
    if (!weekStart) return;
    let live = true;
    setFailed(false);
    const w = around ? spanWindow(weekStart, addDays(weekStart, 6)) : { from: weekStart, to: addDays(weekStart, 6) };
    apiGet<PlanResponse>(`/api/plan?from=${w.from}&to=${w.to}`).then(
      (r) => live && setPlans(r.plans),
      () => live && (setPlans(undefined), setFailed(true)),
    );
    return () => { live = false; };
  }, [weekStart, version, nonce, around]);
  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { plans, failed, retry };
}

/** Just the plans (undefined while loading or when the request failed: the screens then simply show less). */
export function useWeekPlans(weekStart: LocalDate | undefined, around = false): ChildPlan[] | undefined {
  return useWeekPlansState(weekStart, around).plans;
}
