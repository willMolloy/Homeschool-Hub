/**
 * S8-04: Home. The logo and the family button, a greeting with the date, the briefing when something needs
 * attention, a Track work card, a Schedule card and the Set up row. Nothing here is a number the family did not
 * enter: the progress is a bar and "N left" counts assignments.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { CaretRight, CheckSquare, ListBullets, SlidersHorizontal } from "@phosphor-icons/react";
import type { Assignment, BlockedRange, Child, Subject } from "../../api/types";
import { useApi } from "../../api/useApi";
import { useAuth, useMe } from "../../auth/AuthProvider";
import { ResponsiveSheet } from "../../components/ui/ResponsiveSheet";
import { Logo } from "../../layout/Logo";
import { Button, Card, ListRow } from "../../ui/components";
import { useLastWeekCheckIn } from "../checkin/useLastWeekCheckIn";
import { Briefing } from "../plan/Briefing";
import { Checklist, checklistSteps } from "./Checklist";
import { PlanRefreshProvider } from "../plan/planRefresh";
import { useWeekPlans } from "../plan/useWeekPlans";
import { deviceToday, shownWeek } from "../plan/useShownWeek";
import { isValidLocalDate } from "@hh/engine";
import { subjectSlots } from "../timeline/model";
import { dayMonth, finishGlance, greetingFor, longDate, weekGlance, weekOfSpan, weekSpan } from "./homeSummary";
import "./home.css";

export function HomePage() {
  return (
    <PlanRefreshProvider>
      <Home />
    </PlanRefreshProvider>
  );
}

function Home() {
  const me = useMe();
  const today = isValidLocalDate(me.today) ? me.today : deviceToday();
  const { currentWeekStart } = shownWeek(null, today, me.weekStart);
  const children = useApi<Child[]>("/api/children");
  const assignments = useApi<Assignment[]>("/api/assignments");
  const subjects = useApi<Subject[]>("/api/subjects");
  const blocked = useApi<BlockedRange[]>("/api/blocked-ranges");
  const lastWeek = useLastWeekCheckIn();
  const plans = useWeekPlans(currentWeekStart);
  const live = (assignments.data ?? []).filter((a) => !a.archived);
  const kids = (children.data ?? []).filter((c) => !c.archived);
  const weekNo = weekOfSpan(assignments.data ?? [], today);
  const finish = plans ? finishGlance(plans) : null;

  return (
    <div className="home">
      <header className="home-top">
        <Logo />
        <FamilyButton />
      </header>
      <h1 className="home-greeting">{greetingFor(new Date().getHours())}</h1>
      <p className="home-date">{longDate(today)}{weekNo ? ` · Week ${weekNo.n} of ${weekNo.m}` : ""}</p>
      <Briefing weekStart={currentWeekStart} showNudge={false} />
      {/* S8-09: only once all four lists have answered, so it never flashes for a family that has set up. */}
      {children.data && subjects.data && assignments.data && blocked.data ? (
        <Checklist steps={checklistSteps({
          children: kids.length, subjects: subjects.data.filter((s) => !s.archived).length, assignments: live.length, breaks: blocked.data.length,
        })} />
      ) : null}

      <Card className="home-card">
        <div className="home-card-head">
          <span className="home-icon"><CheckSquare size={24} weight="light" aria-hidden="true" /></span>
          <div className="home-card-text">
            <h2><Link className="home-card-link" to="/track">Track work</Link></h2>
            <div className="home-sub">This week · {weekSpan(currentWeekStart)}</div>
          </div>
          <CaretRight className="home-chevron" size={20} weight="light" aria-hidden="true" />
        </div>
        {plans && kids.map((k) => {
          const g = weekGlance(plans, k.id, currentWeekStart, today);
          return (
            <div className="home-progress" key={k.id}>
              <span className="home-kid">{k.name}</span>
              <span className="home-track" aria-hidden="true"><i style={{ width: `${Math.round(g.progress * 100)}%` }} /></span>
              <span className="home-left">{!g.planned ? "Nothing planned" : g.left === 0 ? "All done" : `${g.left} left`}</span>
            </div>
          );
        })}
        {lastWeek.week ? <p className="home-note"><span className="home-dot" aria-hidden="true" />Last week needs a quick check</p> : null}
      </Card>

      <Card className="home-card">
        <div className="home-card-head">
          <span className="home-icon"><ListBullets size={24} weight="light" aria-hidden="true" /></span>
          <div className="home-card-text">
            <h2><Link className="home-card-link" to="/schedule">Schedule</Link></h2>
            <div className="home-sub">
              {finish ? (finish.onTrack ? `This week and your year · on track to finish ${dayMonth(finish.date)}` : `This week and your year · finishing about ${dayMonth(finish.date)}`) : "This week and your year"}
            </div>
          </div>
          <CaretRight className="home-chevron" size={20} weight="light" aria-hidden="true" />
        </div>
        <MiniTimeline assignments={live} subjects={subjects.data ?? []} today={today} />
      </Card>

      <Card className="home-setup">
        <ListRow to="/setup" lead={<span className="home-icon home-icon-small"><SlidersHorizontal size={20} weight="light" aria-hidden="true" /></span>}
          title="Set up" description="Children, subjects, books, breaks" />
      </Card>
    </div>
  );
}

/** A tiny picture of the year: one soft bar per subject across the span, and today. Decorative. */
function MiniTimeline({ assignments, subjects, today }: { assignments: readonly Assignment[]; subjects: readonly Subject[]; today: string }) {
  if (assignments.length === 0) return null;
  const slot = subjectSlots(subjects);
  const first = assignments.reduce((x, a) => (a.startDate < x ? a.startDate : x), assignments[0]!.startDate);
  const last = assignments.reduce((x, a) => (a.endDate > x ? a.endDate : x), assignments[0]!.endDate);
  const t = (d: string) => Date.parse(d);
  const span = Math.max(1, t(last) - t(first));
  const pct = (d: string) => Math.min(100, Math.max(0, ((t(d) - t(first)) / span) * 100));
  const bySubject = new Map<string, { s: string; e: string }>();
  for (const a of assignments) {
    const cur = bySubject.get(a.subjectId);
    bySubject.set(a.subjectId, { s: cur && cur.s < a.startDate ? cur.s : a.startDate, e: cur && cur.e > a.endDate ? cur.e : a.endDate });
  }
  const rows = [...bySubject].slice(0, 5);
  return (
    <div className="home-mini" aria-hidden="true">
      {rows.map(([id, r]) => (
        <span key={id} style={{ background: `var(--tl-subject-${slot(id)})`, marginLeft: `${pct(r.s)}%`, width: `${Math.max(4, pct(r.e) - pct(r.s))}%` }} />
      ))}
      {today >= first && today <= last ? <i className="home-today" style={{ left: `${pct(today)}%` }} /> : null}
    </div>
  );
}

/** The family button: opens a small sheet with Family settings and Sign out. */
function FamilyButton() {
  const me = useMe();
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const initial = (me.name.trim()[0] ?? "H").toUpperCase();
  return (
    <>
      <button type="button" className="home-avatar" aria-label="Family and settings" aria-haspopup="dialog" onClick={() => setOpen(true)}>{initial}</button>
      <ResponsiveSheet open={open} onOpenChange={setOpen} title={me.name}>
        <ListRow to="/setup/settings" title="Family settings" description="Name, school days, week start, appearance" />
        <div className="btn-row home-signout">
          <Button variant="secondary" disabled={busy} onClick={() => { setBusy(true); void signOut().then(() => navigate("/login", { replace: true })); }}>Sign out</Button>
        </div>
      </ResponsiveSheet>
    </>
  );
}
