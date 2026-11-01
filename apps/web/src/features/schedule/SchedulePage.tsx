/**
 * S8-04: /schedule, with a Week | Year switch. Week is this week's plan (S8-05); Year is the timeline (S8-07).
 * The choice is in `?view=` and remembered on this device (`hh.schedule.view`; storage may be blocked).
 */
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
  return (
    <section className="schedule-page">
      <h1>Schedule</h1>
      <Segmented as="tabs" label="View" value={view} onChange={choose} options={[{ value: "week", label: "Week" }, { value: "year", label: "Year" }]} />
      {view === "week" ? <WeekView /> : <TimelinePage embedded />}
    </section>
  );
}
