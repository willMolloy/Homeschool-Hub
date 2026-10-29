/** T-10: what the timeline changes after an assignment is added, so its new bar is in view (pure). */
import type { Zoom } from "./zoom";

export interface AfterAdd {
  /** The child filter would hide the new bar: switch to All. */
  showAllChildren: boolean;
  /** At This month, when the shown month misses the new bar: the month it starts in (clamped to the grid); null to stay. */
  month: string | null;
}

export function afterAdd(
  created: { childIds: readonly string[]; startDate: string; endDate: string },
  view: { childId: string | null; zoom: Zoom; month: string | null; months: readonly string[] },
): AfterAdd {
  const showAllChildren = view.childId !== null && !created.childIds.includes(view.childId);
  if (view.zoom !== "month" || view.months.length === 0) return { showAllChildren, month: null };
  const first = view.months[0]!, last = view.months[view.months.length - 1]!;
  const start = created.startDate.slice(0, 7), end = created.endDate.slice(0, 7);
  if (view.month && view.month >= start && view.month <= end) return { showAllChildren, month: null };
  const target = end < first ? first : start > last ? last : start < first ? first : start;
  return { showAllChildren, month: target };
}
