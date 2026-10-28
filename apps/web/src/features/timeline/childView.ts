/**
 * T-07c: one child's view of the timeline. Keeps that child's sub-lanes (and the subjects they sit in), the breaks
 * and events that touch them, and recomputes the All subjects totals from what is left, so the gray bar is
 * normalized to this view's heaviest point. The grid, today and palette slots stay as they are, so colours don't
 * shift between views. Pure, like the model.
 */
import type { Child } from "../../api/types";
import { sumSeries } from "./grid";
import type { TimelineModel } from "./model";

const touches = (childIds: readonly string[], childId: string) => childIds.length === 0 || childIds.includes(childId);

export function forChild(model: TimelineModel, childId: string | null): TimelineModel {
  if (!childId) return model;
  const lanes = model.lanes
    .map((l) => ({ ...l, children: l.children.filter((c) => c.childId === childId) }))
    .filter((l) => l.children.length > 0);
  const subLanes = lanes.flatMap((l) => l.children);
  return {
    ...model,
    lanes,
    breaks: model.breaks.filter((b) => touches(b.childIds, childId)),
    events: model.events.filter((e) => touches(e.childIds, childId)),
    totals: {
      daily: sumSeries(subLanes.map((c) => c.daily), model.dates.length),
      weekly: sumSeries(subLanes.map((c) => c.weekly), model.dates.length),
    },
  };
}

/** The chips: active children with something on the timeline, in display order. */
export function filterChildren(children: readonly Child[], model: TimelineModel | undefined): Child[] {
  const shown = new Set(model?.lanes.flatMap((l) => l.children.map((c) => c.childId)) ?? []);
  return children.filter((c) => !c.archived && shown.has(c.id)).sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

/** The `?child=` value if it names one of the chips, else null (All). */
export function shownChild(param: string | null, children: readonly Child[]): string | null {
  return param && children.length > 1 && children.some((c) => c.id === param) ? param : null;
}
