/** Response shapes of the API. Kept in sync with apps/api by hand (Sprint 1). */
import type { BlockedKind, ChildPlan, OverrideMode, SubjectDefaultWeight, SubjectRule, SuggestionSource, UnitType, WeekReviewStatus, WeekStart } from "@hh/engine";

export type { BlockedKind, OverrideMode, SubjectDefaultWeight, SuggestionSource, UnitType, WeekReviewStatus, WeekStart };

/** `{ error, message? }` from every non-2xx response. */
export interface ApiErrorBody {
  error: string;
  message?: string;
}

/** GET /api/me */
export interface Me {
  familyId: string;
  name: string;
  weekStart: WeekStart;
  schoolDays: number[];
  /** IANA zone, e.g. "America/Chicago" (S2a-02). */
  timeZone: string;
  /** Today (YYYY-MM-DD) in the family's zone, from the server clock (RF-07). */
  today: string;
}

/** GET/PATCH /api/family */
export type FamilySettings = Omit<Me, "familyId" | "today"> & {
  /** A week has a check-in or review, so the week start can't change (S2c-01, D25). */
  weekStartLocked: boolean;
};
/** The PATCH /api/family body: any of the editable fields. */
export type FamilySettingsPatch = Partial<Omit<FamilySettings, "weekStartLocked">>;

/** POST /api/auth/login */
export interface LoginResponse {
  familyId: string;
  familyName: string;
}

/** GET/POST/PATCH /api/children */
export interface Child {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
  archived: boolean;
}

/** GET/POST/PATCH /api/subjects */
export interface Subject {
  id: string;
  name: string;
  color: string | null;
  sortOrder: number;
  archived: boolean;
  /** S2b-31: the subject's default bar width for one unit type, or null. */
  defaultWeight: SubjectDefaultWeight | null;
}

/** GET /api/health */
export interface Health {
  ok: boolean;
  engineVersion: string;
  db: "ok" | "down";
}

/** GET /api/weights/suggestion (S2b-09) */
export interface WeightSuggestion {
  unitType: UnitType;
  weightPerUnit: number;
  source: SuggestionSource;
  builtInDefault: number;
  subjectDefault: SubjectDefaultWeight | null;
  /** Whether this unit type learns from history (pages, chapters). */
  learned: boolean;
  children: { childId: string; name: string; usual: number | null; choices: number }[];
}

/** GET /api/plan. ChildPlan comes from the engine so it can't drift. */
export interface PlanResponse {
  engineVersion: string;
  asOf: string;
  from: string;
  to: string;
  plans: ChildPlan[];
}

/** GET/POST/PATCH /api/assignments (S2a-04..06) */
export interface Assignment {
  id: string;
  subjectId: string;
  title: string;
  unitType: UnitType;
  totalUnits: number;
  /** Relative effort per unit (S2b-06). null = the subject's default for this unit, else the built-in. */
  weightPerUnit: number | null;
  startDate: string;
  endDate: string;
  childIds: string[];
  archived: boolean;
}

/** GET/POST/PATCH/DELETE /api/blocked-ranges (S2a-07) */
export interface BlockedRange {
  id: string;
  label: string | null;
  kind: BlockedKind;
  startDate: string;
  endDate: string;
  /** [] = the whole family. */
  childIds: string[];
}

/** GET/POST/PATCH /api/events (S2a-08..10) */
export type EventRule = SubjectRule;
export interface ScheduleEvent {
  id: string;
  name: string;
  /** 0 = Sunday … 6 = Saturday, sorted. */
  weekdays: number[];
  startDate: string | null;
  endDate: string | null;
  /** Share of the day left on "lighter", 0–1. */
  capacityFraction: number;
  defaultRule: EventRule;
  /** subjectId → rule; subjects not listed use defaultRule. */
  subjectRules: Record<string, EventRule>;
  /** [] = the whole family. */
  childIds: string[];
  archived: boolean;
}

/** GET /api/timezones (S2a-17): the zones the server accepts, in canonical spelling. */
export interface TimeZones {
  zones: string[];
}

/** GET /api/check-ins (S2b-23): one assignment × child in a finished week. Positions are cumulative units. */
export interface CheckInItem {
  assignmentId: string;
  childId: string;
  childName: string;
  title: string;
  unitType: UnitType;
  plannedFrom: number;
  plannedTo: number;
  totalUnits: number;
  /** The stored position; null = as planned. */
  actual: number | null;
  mode: OverrideMode | null;
}

/** GET /api/check-ins (S2b-23) */
export interface WeekCheckIn {
  weekStart: string;
  weekEnd: string;
  status: WeekReviewStatus | null;
  items: CheckInItem[];
  /**
   * Active pairs with nothing planned that week and work left (S2c-06): plannedFrom = plannedTo = where the
   * week started. "Add progress" offers these; once saved, a pair shows in `items`.
   */
  addable: CheckInItem[];
}

/** PUT /api/check-ins/:weekStart body (S2b-24). Items left out count as done as planned. */
export interface SaveWeekBody {
  status: WeekReviewStatus;
  items: { assignmentId: string; childId: string; position: number; mode: OverrideMode | null }[];
}

/** PUT /api/check-ins/:weekStart (S2b-24) */
export interface SaveWeekResponse extends WeekCheckIn {
  planChanged: boolean;
}

/** GET /api/check-ins/weeks (S2b-27): a finished week that can be reopened, newest first. */
export interface PastWeek {
  weekStart: string;
  weekEnd: string;
  status: WeekReviewStatus | null;
  /** Some row has a stored check-in that week. */
  hasCheckIns: boolean;
}
