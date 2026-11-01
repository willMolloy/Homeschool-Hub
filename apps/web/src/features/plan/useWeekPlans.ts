/** The engine's plans for one week (GET /api/plan), refetched when a save elsewhere changes the plan. */
import { useEffect, useState } from "react";
import { addDays, type ChildPlan, type LocalDate } from "@hh/engine";
import { apiGet } from "../../api/client";
import type { PlanResponse } from "../../api/types";
import { usePlanRefresh } from "./planRefresh";

/** undefined while loading, or when the request failed (the screens then simply show less). */
export function useWeekPlans(weekStart: LocalDate): ChildPlan[] | undefined {
  const [plans, setPlans] = useState<ChildPlan[] | undefined>(undefined);
  const { version } = usePlanRefresh();
  useEffect(() => {
    let live = true;
    apiGet<PlanResponse>(`/api/plan?from=${weekStart}&to=${addDays(weekStart, 6)}`).then(
      (r) => live && setPlans(r.plans),
      () => live && setPlans(undefined),
    );
    return () => { live = false; };
  }, [weekStart, version]);
  return plans;
}
