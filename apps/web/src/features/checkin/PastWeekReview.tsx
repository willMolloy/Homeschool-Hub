/**
 * "Review a past week" under the plan (S2b-27): a link opens the week picker; choosing a week opens the
 * check-in card in edit mode for it. Saving refreshes the picker's labels and (via the hook) the plan.
 */
import { useId, useState } from "react";
import type { PastWeek } from "../../api/types";
import { useApi } from "../../api/useApi";
import { LastWeekCard } from "./LastWeekCard";
import { laterCheckInsExist, PastWeekPicker } from "./PastWeekPicker";
import { useWeekCheckIn } from "./useLastWeekCheckIn";

export const LATER_NOTE = "Later check-ins still apply from their weeks on.";

function PastWeekEditor({ weekStart, laterNote, onSaved, onClose }: {
  weekStart: string; laterNote: boolean; onSaved: () => void; onClose: () => void;
}) {
  const { data, loadError, busy, error, itemErrors, thanks, save } = useWeekCheckIn(weekStart, onSaved);
  if (loadError) return <p className="checkin-error" role="alert">{loadError}</p>;
  if (!data) return <p aria-busy="true">Loading…</p>;
  return (
    <>
      {laterNote && <p className="checkin-note">{LATER_NOTE}</p>}
      <LastWeekCard key={`${data.weekStart}/${data.status ?? ""}`} mode="edit" week={data} busy={busy} error={error}
        itemErrors={itemErrors} onClose={onClose}
        onSave={(items) => void save({ status: "reviewed", items })} />
      {thanks && <p className="checkin-thanks" role="status">{thanks}</p>}
    </>
  );
}

function PastWeeks() {
  const api = useApi<{ weeks: PastWeek[] }>("/api/check-ins/weeks");
  const [selected, setSelected] = useState<string | null>(null);
  if (api.error) return <p className="checkin-error" role="alert">Couldn't load past weeks.</p>;
  if (!api.data) return <p aria-busy="true">Loading…</p>;
  const weeks = api.data.weeks;
  return (
    <>
      <PastWeekPicker weeks={weeks} selected={selected} onChoose={setSelected} />
      {selected && (
        <PastWeekEditor key={selected} weekStart={selected} laterNote={laterCheckInsExist(weeks, selected)}
          onSaved={api.reload} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

export function PastWeekReview() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  return (
    <div className="past-week-review">
      <button type="button" className="btn-link" aria-expanded={open} aria-controls={panelId} onClick={() => setOpen((o) => !o)}>
        Review a past week
      </button>
      <div id={panelId} hidden={!open}>{open && <PastWeeks />}</div>
    </div>
  );
}
