/** The card wired to its data (S2b-25). Loading and errors render nothing, so the plan is never blocked. */
import { useEffect, useState } from "react";
import { LastWeekCard } from "./LastWeekCard";
import { usePastels } from "./usePastels";
import { useLastWeekCheckIn } from "./useLastWeekCheckIn";

/** How long the thank-you line stays before it goes (S2b-26: "about 3 s"). */
export const THANKS_MS = 3000;

export function LastWeekCheckIn() {
  const { week, busy, error, itemErrors, thanks, save } = useLastWeekCheckIn();
  const rowStyle = usePastels();
  const [thanksGone, setThanksGone] = useState(false);
  useEffect(() => {
    if (!thanks) return;
    setThanksGone(false);
    const t = setTimeout(() => setThanksGone(true), THANKS_MS);
    return () => clearTimeout(t);
  }, [thanks]);

  if (!week) return thanks && !thanksGone ? <p className="checkin-thanks" role="status">{thanks}</p> : null;
  return (
    <LastWeekCard week={week} rowStyle={rowStyle} busy={busy} error={error} itemErrors={itemErrors}
      onConfirm={() => void save({ status: "reviewed", items: [] })}
      onSkip={() => void save({ status: "skipped", items: [] })}
      onSave={(items) => void save({ status: "reviewed", items })} />
  );
}
