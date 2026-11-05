/**
 * S16-11: the plans for a run of days plus enough days either side that a chapter or lesson's "start / day 2 of 3 / finish" is exact for
 * the days shown (it needs the days around them: see `daySpanLabels`). `SPAN_PAD_DAYS` each side is far more than a chapter takes; the
 * API allows 400 days at a time, so a week or a day plus the pad is well inside it.
 */
import { useEffect, useState } from "react";
import { addDays, type ChildPlan, type LocalDate } from "@hh/engine";
import { apiGet } from "../../api/client";
import type { PlanResponse } from "../../api/types";
import { usePlanRefresh } from "./planRefresh";

export const SPAN_PAD_DAYS = 60;
export const spanWindow = (from: LocalDate, to: LocalDate): { from: LocalDate; to: LocalDate } => ({ from: addDays(from, -SPAN_PAD_DAYS), to: addDays(to, SPAN_PAD_DAYS) });

/** undefined while loading or after a failure (the screen then shows less). */
export function useSpanPlans(from: LocalDate, to: LocalDate): ChildPlan[] | undefined {
  const [plans, setPlans] = useState<ChildPlan[] | undefined>(undefined);
  const { version } = usePlanRefresh();
  useEffect(() => {
    let live = true;
    const w = spanWindow(from, to);
    apiGet<PlanResponse>(`/api/plan?from=${w.from}&to=${w.to}`).then((r) => live && setPlans(r.plans), () => live && setPlans(undefined));
    return () => { live = false; };
  }, [from, to, version]);
  return plans;
}
