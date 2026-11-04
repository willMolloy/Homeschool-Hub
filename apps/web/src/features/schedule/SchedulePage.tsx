/**
 * S8-04: /schedule, with a Week | Year switch. Week is this week's plan (S8-05); Year is the timeline (S8-07).
 * The choice is in `?view=` and remembered on this device (`hh.schedule.view`; storage may be blocked).
 * S10-08: the title row holds the Year view's "+" (Add assignment), at the row's end.
 * S10-16: `data-view` lets the shell drop its column cap for Year, which uses the full width.
 * S10-13: the Week | Year switch shares its row with Week's ‹ range › group (`viewSlot`, filled by WeekView).
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
  const [viewSlot, setViewSlot] = useState<HTMLElement | null>(null);
  return (
    <section className="schedule-page" data-view={view}>
      <div className="schedule-title-row">
        <h1>Schedule</h1>
        <span ref={setTitleSlot} className="schedule-title-actions" />
      </div>
      <div className="schedule-view-row">
        <Segmented as="tabs" label="View" value={view} onChange={choose} options={[{ value: "week", label: "Week" }, { value: "year", label: "Year" }]} />
        <span ref={setViewSlot} className="schedule-view-actions" />
      </div>
      {view === "week" ? <WeekView headSlot={viewSlot} /> : <TimelinePage embedded titleSlot={titleSlot} />}
    </section>
  );
}
