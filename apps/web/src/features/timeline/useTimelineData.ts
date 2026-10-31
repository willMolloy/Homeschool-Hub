/** T-04: everything the timeline needs from the API, turned into a TimelineModel for the family's school year. */
import { useCallback, useMemo } from "react";
import type { Assignment, BlockedRange, Child, FamilySettings, PlanResponse, ScheduleEvent, Subject, ZoomViews } from "../../api/types";
import { useApi } from "../../api/useApi";
import { useMe } from "../../auth/AuthProvider";
import { buildTimelineModel, type TimelineModel } from "./model";
import { fetchRange, shownRange } from "./range";

export interface TimelineData {
  model: TimelineModel | undefined;
  loading: boolean;
  failed: boolean;
  reload: () => void;
  /** T-07: the raw assignments (start and end dates for the edit bar). */
  assignments: Assignment[];
  /** T-07: after a successful PATCH, swap in the saved assignment and refetch the plan. */
  applyAssignment: (saved: Assignment) => void;
  /** T-07c: the family's children (the filter's chips). */
  children: Child[];
  /** T-10: the family's subjects (the add form's choices). */
  subjects: Subject[];
  /** S4-07: swap in a subject whose default days were just saved from the add form. */
  applySubject: (saved: Subject) => void;
  /** T-10: after a successful POST, add the new assignment and refetch the plan so its bar appears. */
  addAssignment: (created: Assignment) => void;
  /** S7-04: the family's hidden built-in zoom views and its own; the defaults until (or unless) they load. */
  zoomViews: ZoomViews;
}

const NO_ZOOM_VIEWS: ZoomViews = { hidden: [], custom: [] };

export function useTimelineData(): TimelineData {
  const me = useMe();
  const range = useMemo(() => fetchRange(me.today, me.weekStart), [me.today, me.weekStart]);
  const plan = useApi<PlanResponse>(`/api/plan?from=${range.from}&to=${range.to}`);
  const children = useApi<Child[]>("/api/children");
  const subjects = useApi<Subject[]>("/api/subjects");
  const assignments = useApi<Assignment[]>("/api/assignments");
  const blocked = useApi<BlockedRange[]>("/api/blocked-ranges");
  const events = useApi<ScheduleEvent[]>("/api/events");
  // S7-04: not part of `failed`: without the family's zoom views the timeline still draws, with the built-in views.
  const family = useApi<FamilySettings>("/api/family");
  const setSubjects = subjects.setData;
  const applySubject = useCallback((saved: Subject) => setSubjects((list) => list && (list.some((s) => s.id === saved.id) ? list.map((s) => (s.id === saved.id ? saved : s)) : [...list, saved])), [setSubjects]);
  const all = [plan, children, subjects, assignments, blocked, events];

  const model = useMemo(() => {
    if (!plan.data || !children.data || !subjects.data || !assignments.data || !blocked.data || !events.data) return undefined;
    const shown = shownRange(range, plan.data.plans, me.today, me.weekStart);
    return buildTimelineModel({
      ...shown, today: me.today, weekStart: me.weekStart, schoolDays: me.schoolDays, plans: plan.data.plans,
      assignments: assignments.data, children: children.data, subjects: subjects.data, blocked: blocked.data,
      events: events.data.filter((e) => !e.archived),
    });
  }, [range, plan.data, children.data, subjects.data, assignments.data, blocked.data, events.data, me.today, me.weekStart, me.schoolDays]);

  return {
    model,
    loading: [...all, family].some((s) => s.loading && !s.data),
    zoomViews: family.data?.zoomViews ?? NO_ZOOM_VIEWS,
    failed: all.some((s) => s.error),
    reload: () => {
      for (const s of all) if (s.error) s.reload();
    },
    assignments: assignments.data ?? [],
    children: children.data ?? [],
    subjects: subjects.data ?? [],
    applySubject,
    addAssignment: (created) => {
      assignments.setData((list) => [...(list ?? []).filter((a) => a.id !== created.id), created]);
      plan.reload();
    },
    applyAssignment: (saved) => {
      assignments.setData((list) => list?.map((a) => (a.id === saved.id ? saved : a)));
      plan.reload();
    },
  };
}
