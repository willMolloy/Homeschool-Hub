/**
 * S8-04: /schedule, with a Week | Year switch. Week is this week's plan (S8-05); Year is the timeline (S8-07).
 * The choice is in `?view=` and remembered on this device (`hh.schedule.view`; storage may be blocked).
 * S10-08: the title row holds the Year view's "+" (Add assignment), at the row's end.
 */
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Segmented } from "../../ui/components";
import { TimelinePage } from "../../routes/TimelinePage";
import { WeekView } from "../week/WeekView";
import "../home/home.css";

export type ScheduleView = "week" | "year";
const VIEW_KEY = "hh.schedule.view";
const isView = (v: unknown): v is ScheduleView => v === "week" || v === "year";

function savedView(): ScheduleView {
  try {
    const v = window.localStorage.getItem(VIEW_KEY);
    return isView(v) ? v : "week";
  } catch {
    return "week";
  }
}

export function SchedulePage() {
  const [params, setParams] = useSearchParams();
  const asked = params.get("view");
  const view: ScheduleView = isView(asked) ? asked : savedView();
  const choose = (next: ScheduleView) => {
    try { window.localStorage.setItem(VIEW_KEY, next); } catch { /* not remembered */ }
    setParams((p) => {
      const q = new URLSearchParams(p);
      q.set("view", next);
      return q;
    }, { replace: true });
  };
  const [titleSlot, setTitleSlot] = useState<HTMLElement | null>(null);
  return (
    <section className="schedule-page">
      <div className="schedule-title-row">
        <h1>Schedule</h1>
        <span ref={setTitleSlot} className="schedule-title-actions" />
      </div>
      <Segmented as="tabs" label="View" value={view} onChange={choose} options={[{ value: "week", label: "Week" }, { value: "year", label: "Year" }]} />
      {view === "week" ? <WeekView /> : <TimelinePage embedded titleSlot={titleSlot} />}
    </section>
  );
}
