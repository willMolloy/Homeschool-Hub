/** S8-05/06: a finished week on Schedule's Week view: the check-in board for that week (a bar opens Update status). */
import { useWeekCheckIn } from "../checkin/useLastWeekCheckIn";
import { useWeekPlans } from "../plan/useWeekPlans";
import type { WeekLookups } from "../week/useWeekLookups";
import { CheckInBoard } from "./CheckInBoard";

export function PastWeek({ weekStart, choice, look }: { weekStart: string; choice: string | null; look: WeekLookups }) {
  const state = useWeekCheckIn(weekStart);
  const plans = useWeekPlans(weekStart);
  if (state.loadError) return <p className="checkin-error" role="alert">{state.loadError}</p>;
  if (!state.data || !look.ready) return <p aria-busy="true">Loading…</p>;
  return (
    <>
      <CheckInBoard key={`${state.data.weekStart}/${state.data.status ?? ""}`} week={state.data} choice={choice} look={look} plans={plans}
        busy={state.busy} error={state.error} itemErrors={state.itemErrors} save={state.save} whenText="week" />
      {state.thanks ? <p className="checkin-thanks" role="status">{state.thanks}</p> : null}
    </>
  );
}
