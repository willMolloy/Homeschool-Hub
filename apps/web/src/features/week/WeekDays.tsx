/** S16-01: the Days layout with the family's breaks (GET /api/blocked-ranges, which a viewer may read). `plans` are the shown week's engine plans. */
import type { ChildPlan } from "@hh/engine";
import type { BlockedRange, Child } from "../../api/types";
import { useApi } from "../../api/useApi";
import { DaysView, type DaysViewProps } from "./DaysView";
import type { WeekLookups } from "./useWeekLookups";

export function WeekDays({ plans, kids, look, ...rest }: Omit<DaysViewProps, "blocked"> & { plans: readonly ChildPlan[]; kids: readonly Child[]; look: WeekLookups }) {
  const blocked = useApi<BlockedRange[]>("/api/blocked-ranges");
  if (blocked.loading && !blocked.data) return <p aria-busy="true">Loading…</p>;
  return <DaysView plans={plans} kids={kids} look={look} blocked={blocked.data ?? []} {...rest} />;
}
