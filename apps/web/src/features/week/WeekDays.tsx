/** S16-01: the Days layout with the family's breaks (GET /api/blocked-ranges, which a viewer may read). S16-11: it reads plans with days either side of the week, so a chapter's start / day N of M / finish is exact. */
import { addDays } from "@hh/engine";
import type { BlockedRange, Child, ScheduleEvent } from "../../api/types";
import { useApi } from "../../api/useApi";
import { useSpanPlans } from "../plan/useSpanPlans";
import { DaysView, type DaysViewProps } from "./DaysView";
import type { WeekLookups } from "./useWeekLookups";

export function WeekDays({ kids, look, weekStart, ...rest }: Omit<DaysViewProps, "blocked" | "plans" | "events"> & { kids: readonly Child[]; look: WeekLookups }) {
  const blocked = useApi<BlockedRange[]>("/api/blocked-ranges");
  const events = useApi<ScheduleEvent[]>("/api/events");
  const plans = useSpanPlans(weekStart, addDays(weekStart, 6));
  if ((blocked.loading && !blocked.data) || !plans) return <p aria-busy="true">Loading…</p>;
  return <DaysView weekStart={weekStart} plans={plans} kids={kids} look={look} blocked={blocked.data ?? []} events={events.data ?? []} {...rest} />;
}
