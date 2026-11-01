/**
 * S8-06: Track work. Last week's one question ("Did everything get done?") stays at the top until it is answered:
 * Yes, all done saves the week as planned; Not quite shows last week's bars, each with a round check, and a bar
 * opens Update status. Once answered the bars stay, to correct. Mid-week check-ins are out of scope.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Card, Button } from "../ui/components";
import { ChildSwitch } from "../features/week/ChildSwitch";
import { useWeekCheckIn } from "../features/checkin/useLastWeekCheckIn";
import { PlanRefreshProvider } from "../features/plan/planRefresh";
import { useWeekPlans } from "../features/plan/useWeekPlans";
import { weekSpan } from "../features/home/homeSummary";
import { CheckInBoard } from "../features/track/CheckInBoard";
import { useChildChoice } from "../features/week/useChildChoice";
import { useWeekLookups } from "../features/week/useWeekLookups";
import "../features/week/week.css";

/** After "Not quite": what to do with the bars. */
export const NOT_QUITE_HINT = "Untick what didn't get done, or tap a bar to update it.";

export function TrackPage() {
  return (
    <PlanRefreshProvider>
      <Track />
    </PlanRefreshProvider>
  );
}

function Track() {
  const state = useWeekCheckIn();
  const look = useWeekLookups();
  const [choice, setChoice] = useChildChoice(look.activeChildren);
  const [notQuite, setNotQuite] = useState(false);
  const week = state.data;
  const plans = useWeekPlans(week?.weekStart);
  // One tree for loading and loaded, so the page title is never remounted under a reader.
  if (state.loadError) return <div className="track"><h1>Track work</h1><p className="checkin-error" role="alert">{state.loadError}</p></div>;
  if (!week || !look.ready) return <div className="track"><h1>Track work</h1><p aria-busy="true">Loading…</p></div>;
  const hadWork = week.items.length > 0;
  const unanswered = week.status === null && hadWork;
  return (
    <div className="track">
      <h1>Track work</h1>
      <p className="week-dates">Last week · {weekSpan(week.weekStart)}</p>
      <ChildSwitch kids={look.activeChildren} value={choice} onChange={setChoice} />
      {unanswered && !notQuite ? (
        <Card className="week-card" role="region" aria-label="Last week's check-in">
          <h3>Last week · {weekSpan(week.weekStart)}</h3>
          <p>Did everything get done?</p>
          {state.error ? <p className="checkin-error" role="alert">{state.error}</p> : null}
          <div className="btn-row">
            <Button disabled={state.busy} onClick={() => void state.save({ status: "reviewed", items: [] })}>Yes, all done</Button>
            <Button variant="secondary" disabled={state.busy} onClick={() => setNotQuite(true)}>Not quite</Button>
          </div>
        </Card>
      ) : null}
      {!hadWork && week.addable.length === 0 ? (
        <p className="week-empty">Nothing was planned last week, so there is nothing to check in. <Link to="/schedule">See this week</Link></p>
      ) : null}
      {(!unanswered || notQuite) && (hadWork || week.addable.length > 0) ? (
        <CheckInBoard key={`${week.weekStart}/${week.status ?? ""}`} week={week} choice={choice} look={look} plans={plans}
          busy={state.busy} error={state.error} itemErrors={state.itemErrors} save={state.save} alwaysSave={unanswered} hint={unanswered ? NOT_QUITE_HINT : undefined} whenText="last week" />
      ) : null}
      {state.thanks ? <p className="checkin-thanks" role="status">{state.thanks}</p> : null}
    </div>
  );
}
