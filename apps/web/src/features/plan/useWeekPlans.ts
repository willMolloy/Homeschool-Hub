/** The engine's plans for one week (GET /api/plan), refetched when a save elsewhere changes the plan. */
import { useCallback, useEffect, useState } from "react";
import { addDays, type ChildPlan, type LocalDate } from "@hh/engine";
import { apiGet } from "../../api/client";
import type { PlanResponse } from "../../api/types";
import { usePlanRefresh } from "./planRefresh";

export interface WeekPlansState {
  /** undefined while loading or after a failure. */
  plans: ChildPlan[] | undefined;
  failed: boolean;
  retry: () => void;
}

export function useWeekPlansState(weekStart: LocalDate | undefined): WeekPlansState {
  const [plans, setPlans] = useState<ChildPlan[] | undefined>(undefined);
  const [failed, setFailed] = useState(false);
  const [nonce, setNonce] = useState(0);
  const { version } = usePlanRefresh();
  useEffect(() => {
    if (!weekStart) return;
    let live = true;
    setFailed(false);
    apiGet<PlanResponse>(`/api/plan?from=${weekStart}&to=${addDays(weekStart, 6)}`).then(
      (r) => live && setPlans(r.plans),
      () => live && (setPlans(undefined), setFailed(true)),
    );
    return () => { live = false; };
  }, [weekStart, version, nonce]);
  const retry = useCallback(() => setNonce((n) => n + 1), []);
  return { plans, failed, retry };
}

/** Just the plans (undefined while loading or when the request failed: the screens then simply show less). */
export function useWeekPlans(weekStart: LocalDate | undefined): ChildPlan[] | undefined {
  return useWeekPlansState(weekStart).plans;
}
