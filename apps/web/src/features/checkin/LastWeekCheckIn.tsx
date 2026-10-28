/** The card wired to its data (S2b-25). Loading and errors render nothing, so the plan is never blocked. */
import { LastWeekCard } from "./LastWeekCard";
import { useLastWeekCheckIn } from "./useLastWeekCheckIn";

export function LastWeekCheckIn() {
  const { week, busy, error, thanked, save } = useLastWeekCheckIn();
  if (!week) return thanked ? <p className="checkin-thanks" role="status">Thanks!</p> : null;
  return (
    <LastWeekCard week={week} busy={busy} error={error}
      onConfirm={() => void save({ status: "reviewed", items: [] })}
      onSkip={() => void save({ status: "skipped", items: [] })} />
  );
}
