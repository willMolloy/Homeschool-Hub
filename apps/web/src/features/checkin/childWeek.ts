/** One child's slice of a week's check-in, and putting it back (T-03b). Pure. */
import type { SaveWeekBody, WeekCheckIn } from "../../api/types";

/** The week with only this child's rows and addable pairs. */
export function forChild(week: WeekCheckIn, childId: string): WeekCheckIn {
  return {
    ...week,
    items: week.items.filter((i) => i.childId === childId),
    addable: week.addable.filter((i) => i.childId === childId),
  };
}

/**
 * The PUT replaces the whole week, so a save from one child's sheet carries every other child's stored rows
 * unchanged, after this child's.
 */
export function withOtherChildren(week: WeekCheckIn, childId: string, items: SaveWeekBody["items"]): SaveWeekBody["items"] {
  const others = week.items
    .filter((i) => i.childId !== childId && i.actual !== null)
    .map((i) => ({ assignmentId: i.assignmentId, childId: i.childId, position: i.actual!, mode: i.mode }));
  return [...items, ...others];
}
