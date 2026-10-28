import type { BlockedKind, OverrideMode, SubjectRule, UnitType, WeekStart } from "./enums";
import type { WeightSource } from "./weights";
export type { BlockedKind, OverrideMode, SubjectRule, UnitType, WeekStart };

/** A local calendar date, "YYYY-MM-DD". Never a timestamp. */
export type LocalDate = string;

/** 0 = Sunday ... 6 = Saturday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** Family-level calendar settings. `weekStart` is the one definition of a week. */
export interface FamilyCalendar {
  weekStart: WeekStart;
  /** Weekdays that are school days. Default Mon-Fri. */
  schoolDays: Weekday[];
}

export interface Assignment {
  id: string;
  childIds: string[];
  subjectId: string;
  title?: string;
  unitType: UnitType;
  /** Total work in native units (pages, chapters, lessons, minutes). */
  totalUnits: number;
  start: LocalDate;
  /** Inclusive planned end date. */
  end: LocalDate;
  /** Relative effort per unit. null = subject default, then built-in (S2b-01). */
  weightPerUnit?: number | null;
}

/**
 * A weekly recurring event (co-op, piano, violin). v1 supports weekly-on-weekdays;
 * a full RRULE can map onto this later.
 */
export interface RecurringEvent {
  id: string;
  name?: string;
  /** Children the event takes time from. Empty = the whole family. */
  childIds: string[];
  weekdays: Weekday[];
  /** Optional first/last date the event happens (inclusive). */
  start?: LocalDate | null;
  end?: LocalDate | null;
  /** Share of the school day the event takes, 0..1. Used by "lighter". */
  capacityFraction: number;
  /** Per-subject rule. Subjects not listed use `defaultRule` (default "normal"). */
  subjectRules: Record<string, SubjectRule>;
  defaultRule?: SubjectRule;
}

/** Vacation, holiday, or sick days. Zero capacity across every lane for the children it covers. */
export interface BlockedPeriod {
  id: string;
  start: LocalDate;
  end: LocalDate;
  /** null/undefined/empty = whole family. */
  childIds?: string[] | null;
  /** Informational only; the engine treats every kind the same. Stored values are a BlockedKind. */
  kind?: BlockedKind | (string & {});
}

/** "This week, do N units instead" for one assignment (optionally for one child). */
export interface WeekOverride {
  assignmentId: string;
  /** null/undefined = every child on the assignment. */
  childId?: string | null;
  /** Must be the first day of a week per FamilyCalendar.weekStart; other dates are normalized with a warning. */
  weekStart: LocalDate;
  plannedUnits: number;
  mode: OverrideMode;
}

/** A subject's default weight for one unit type (S2b-32, D20, D23). */
export interface SubjectWeight {
  subjectId: string;
  unitType: UnitType;
  weightPerUnit: number;
}

export interface PlanContext {
  calendar: FamilyCalendar;
  events?: RecurringEvent[];
  blocked?: BlockedPeriod[];
  overrides?: WeekOverride[];
  /**
   * Usually today. Days before it are labelled assumed; it does not change the plan (S2b-18).
   * Default: the assignment's start.
   */
  asOf?: LocalDate | null;
  /** Subject defaults: used for assignments with no weight of their own and the same unit type. */
  subjectWeights?: SubjectWeight[];
}

/** assumed = before asOf, presumed done as planned (S2b-18). */
export type DayKind = "assumed" | "planned" | "override";

export interface DayLoad {
  date: LocalDate;
  /** 0..1 share of a normal day available to this assignment for this child. */
  capacity: number;
  /** A school weekday that isn't blocked for this child (base capacity 1, before events). */
  schoolDay: boolean;
  units: number;
  /** Relative effort; units × weight (1 point ≈ 2 minutes, D1). */
  thickness: number;
  kind: DayKind;
}

export type PlanWarning =
  | "invalid-range"
  | "no-capacity"
  /** @deprecated — no longer emitted since S2b-18 (the plan always runs from the start). */
  | "past-end"
  | "override-misaligned"
  | "override-duplicate-week"
  | "override-outside-range"
  | "override-no-capacity"
  | "override-clamped"
  | "push-horizon-exceeded"
  | "keep-no-free-capacity";

/**
 * One child's plan for one assignment.
 * Thickness is relative effort. For time spent, sum `log_entry.minutes_spent`; plans never estimate it.
 */
export interface ChildPlan {
  engineVersion: string;
  assignmentId: string;
  childId: string;
  subjectId: string;
  unitType: UnitType;
  /** The weight per unit every day's thickness uses. */
  weightPerUnit: number;
  /** Where weightPerUnit came from ("default" = the built-in, shown as estimated). */
  weightSource: WeightSource;
  totalUnits: number;
  doneUnits: number;
  remainingUnits: number;
  /** Units per full-capacity day before overrides (the "old pace"). */
  baseRate: number;
  /** Units per full-capacity day on non-override days after rebalancing. */
  rate: number;
  plannedEnd: LocalDate;
  /** Effective end: plannedEnd for keepEndDate, the day the work runs out for pushEndDate. */
  end: LocalDate;
  mode: OverrideMode | null;
  /** Work that could not be placed anywhere (no capacity, or the push horizon ran out). */
  unplacedUnits: number;
  noCapacity: boolean;
  complete: boolean;
  days: DayLoad[];
  warnings: PlanWarning[];
}

export type Detail = "daily" | "weekly";
export type DetailChoice = "auto" | Detail;

export interface DisplayDay {
  date: LocalDate;
  /** Bar thickness drawn for this day (relative effort, units × weight). */
  value: number;
}

export interface WeekSummary {
  weekStart: LocalDate;
  /** Sum of the week's thickness. */
  totalThickness: number;
  /** Days that count in the denominator: capacity > 0 or something logged. */
  capacityDays: number;
  /** totalThickness / capacityDays (0 when capacityDays is 0). */
  average: number;
}
