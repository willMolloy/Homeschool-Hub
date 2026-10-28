/**
 * T-02: the timeline view model. Plans in, lanes out: one lane per subject, then one sub-lane per child,
 * each holding its assignments' bar thickness on the shared daily grid, both day by day and
 * weekly-smoothed. Pure and framework-free, so layout (T-03) and rendering (T-04) can trust it.
 *
 * Values are bar thickness (relative effort, units × weight, S2b-02), never minutes (S2b-14).
 */
import { aggregate, type ChildPlan, type LocalDate, type PlanWarning, type WeekStart } from "@hh/engine";
import type { Assignment, BlockedRange, Child, ScheduleEvent, Subject } from "../../api/types";
import { buildDayGrid, gridIndex, sumSeries, zeros, type DayGrid } from "./grid";
import { breaksOnGrid, eventsOnGrid, type TimelineBreak, type TimelineEvent } from "./marks";

/** Subject colour slots in the T-01b palette (`--tl-subject-1` … `-10`). Slots repeat after this; the lane name is the backup cue. */
export const PALETTE_SLOTS = 10;
/** A child's sub-lane is a step of its subject's colour (`--tl-subject-N`, `-light`, `-dark`), in child order. */
export const CHILD_STEPS = ["base", "light", "dark"] as const;
export type ChildStep = (typeof CHILD_STEPS)[number];

export interface TimelineAssignment {
  assignmentId: string;
  childId: string;
  title: string;
  /** Thickness per grid day, as planned. */
  daily: number[];
  /** The week's average on each counted day of that week (the engine's `aggregate`, per assignment). */
  weekly: number[];
  /** First and last grid index with any thickness, or -1 when it has none on the grid. */
  first: number;
  last: number;
  end: LocalDate;
  plannedEnd: LocalDate;
  /** The weight is the built-in default (shown as estimated). */
  estimated: boolean;
  complete: boolean;
  warnings: PlanWarning[];
}

export interface ChildLane {
  /** Stable key: `${subjectId}:${childId}`. */
  key: string;
  subjectId: string;
  childId: string;
  childName: string;
  step: ChildStep;
  /** Stacking order inside the sub-lane: earliest start first, then title. */
  assignments: TimelineAssignment[];
  daily: number[];
  weekly: number[];
}

export interface SubjectLane {
  subjectId: string;
  name: string;
  /** 1-based slot in the subject palette. */
  paletteSlot: number;
  children: ChildLane[];
}

export interface TimelineModel extends DayGrid {
  weekStart: WeekStart;
  today: LocalDate;
  /** Grid index of today, or -1 when today is off the grid. */
  todayIndex: number;
  lanes: SubjectLane[];
  breaks: TimelineBreak[];
  events: TimelineEvent[];
  /** The total-load strip: the sum of every sub-lane, daily and weekly. */
  totals: { daily: number[]; weekly: number[] };
}

export interface TimelineInput {
  from: LocalDate;
  to: LocalDate;
  today: LocalDate;
  weekStart: WeekStart;
  schoolDays: readonly number[];
  plans: readonly ChildPlan[];
  assignments: readonly Assignment[];
  children: readonly Child[];
  subjects: readonly Subject[];
  blocked?: readonly BlockedRange[];
  events?: readonly ScheduleEvent[];
}

/** Active first, then sortOrder, then name: the order lanes appear and palette slots are dealt in. */
function byDisplayOrder<T extends { archived: boolean; sortOrder: number; name: string }>(a: T, b: T): number {
  return Number(a.archived) - Number(b.archived) || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
}

/** Lookup by id with a stable rank; ids the list doesn't know rank last, in first-seen order. */
function ranked<T extends { id: string; archived: boolean; sortOrder: number; name: string }>(items: readonly T[]) {
  const sorted = [...items].sort(byDisplayOrder);
  const rank = new Map(sorted.map((x, i) => [x.id, i]));
  const byId = new Map(sorted.map((x) => [x.id, x]));
  let extra = sorted.length;
  return {
    get: (id: string) => byId.get(id),
    rank: (id: string) => {
      if (!rank.has(id)) rank.set(id, extra++);
      return rank.get(id)!;
    },
  };
}

const slotOfRank = (rank: number) => (rank % PALETTE_SLOTS) + 1;

/** Each subject's palette slot, dealt as the timeline deals them (display order). This Week's pastels use it too. */
export function subjectSlots(subjects: readonly Subject[]): (subjectId: string) => number {
  const r = ranked(subjects);
  return (subjectId) => slotOfRank(r.rank(subjectId));
}

/** Put one series of dated values onto the grid; days off the grid are dropped. */
function onGrid(grid: DayGrid, days: readonly { date: LocalDate; value: number }[]): number[] {
  const out = zeros(grid);
  for (const d of days) {
    const i = gridIndex(grid, d.date);
    if (i >= 0) out[i]! += d.value;
  }
  return out;
}

function extent(series: readonly number[]): [number, number] {
  let first = -1;
  let last = -1;
  series.forEach((v, i) => {
    if (v > 0) {
      if (first < 0) first = i;
      last = i;
    }
  });
  return [first, last];
}

function toAssignment(grid: DayGrid, plan: ChildPlan, title: string, weekStart: WeekStart): TimelineAssignment {
  const daily = onGrid(grid, plan.days.map((d) => ({ date: d.date, value: d.thickness })));
  const weekly = onGrid(grid, aggregate(plan.days, "weekly", weekStart));
  const [first, last] = extent(daily);
  return {
    assignmentId: plan.assignmentId,
    childId: plan.childId,
    title,
    daily,
    weekly,
    first,
    last,
    end: plan.end,
    plannedEnd: plan.plannedEnd,
    estimated: plan.weightSource === "default",
    complete: plan.complete,
    warnings: [...plan.warnings],
  };
}

export function buildTimelineModel(input: TimelineInput): TimelineModel {
  const grid = buildDayGrid(input.from, input.to, input.schoolDays);
  const subjects = ranked(input.subjects);
  const children = ranked(input.children);
  const titles = new Map(input.assignments.map((a) => [a.id, a.title]));
  const length = grid.dates.length;

  // subject → child → plans
  const groups = new Map<string, Map<string, ChildPlan[]>>();
  for (const p of input.plans) {
    const bySubject = groups.get(p.subjectId) ?? new Map<string, ChildPlan[]>();
    groups.set(p.subjectId, bySubject);
    bySubject.set(p.childId, [...(bySubject.get(p.childId) ?? []), p]);
  }

  const lanes: SubjectLane[] = [...groups.entries()]
    .sort(([a], [b]) => subjects.rank(a) - subjects.rank(b))
    .map(([subjectId, byChild]) => ({
      subjectId,
      name: subjects.get(subjectId)?.name ?? "Subject",
      paletteSlot: slotOfRank(subjects.rank(subjectId)),
      children: [...byChild.entries()]
        .sort(([a], [b]) => children.rank(a) - children.rank(b))
        .map(([childId, plans]): ChildLane => {
          const assignments = plans
            .map((p) => toAssignment(grid, p, titles.get(p.assignmentId) ?? "Assignment", input.weekStart))
            .sort((a, b) => (a.first < 0 ? Infinity : a.first) - (b.first < 0 ? Infinity : b.first) || a.title.localeCompare(b.title));
          return {
            key: `${subjectId}:${childId}`,
            subjectId,
            childId,
            childName: children.get(childId)?.name ?? "Child",
            step: CHILD_STEPS[children.rank(childId) % CHILD_STEPS.length]!,
            assignments,
            daily: sumSeries(assignments.map((a) => a.daily), length),
            weekly: sumSeries(assignments.map((a) => a.weekly), length),
          };
        }),
    }));

  const subLanes = lanes.flatMap((l) => l.children);
  const breaks = breaksOnGrid(grid, input.blocked ?? []);
  return {
    ...grid,
    weekStart: input.weekStart,
    today: input.today,
    todayIndex: gridIndex(grid, input.today),
    lanes,
    breaks,
    events: eventsOnGrid(grid, input.events ?? [], breaks),
    totals: {
      daily: sumSeries(subLanes.map((c) => c.daily), length),
      weekly: sumSeries(subLanes.map((c) => c.weekly), length),
    },
  };
}
