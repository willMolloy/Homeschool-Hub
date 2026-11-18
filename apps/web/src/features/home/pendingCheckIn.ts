/** S20-03: the most recently finished week still needs a check-in when it had planned work and nobody has reviewed it. */
import type { WeekCheckIn } from "../../api/types";

export function hasPendingCheckIn(week: Pick<WeekCheckIn, "status" | "items"> | null | undefined): boolean {
  return !!week && week.status == null && week.items.length > 0;
}
