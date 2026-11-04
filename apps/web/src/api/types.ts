/** Response shapes of the API. Kept in sync with apps/api by hand (Sprint 1). */
import type { BlockedKind, ChildPlan, HolidayKey, OverrideMode, SubjectDefaultWeight, SubjectRule, SuggestionSource, UnitType, WeekReviewStatus, WeekStart } from "@hh/engine";

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
  /** The seeded demo family: it can look around but not add events (the API refuses too). */
  demo: boolean;
  /** S11-01: which step of the first-run flow the family is on (1–6). */
  setupStep: number;
  /** S11-01: true once the family has finished the flow. Families that existed before it are done and never see it. */
  setupDone: boolean;
  /** S11-01: the steps put off with "I'll set this later" or "I'll get back to you on this"; Home keeps a reminder for each. */
  setupDeferred: SetupDeferral[];
  /** S11-06: the one-time hints on Schedule this family has seen; each shows once. */
  tipsSeen: TipId[];
  /** S11b-02: the family hid Home's getting-started reminders (stored on the family, so another family on this browser is not affected). */
  checklistHidden: boolean;
}

/** S11-06: the three one-time hints on Schedule: the bars' thickness, the open bar's dates, the subject icons. */
export type TipId = "bars" | "edit" | "icons";

/** S11-01: the setup steps a family can put off. */
export type SetupDeferral = "year" | "breaks";

/** S7-03: one of the family's own timeline zoom views; start and end are YYYY-MM-DD, inclusive. */
export interface CustomZoomView {
  id: string;
  name: string;
  start: string;
  end: string;
}

/** S7-03: the built-in zoom views the family hides (never Year) and its own views, in the order shown. */
export interface ZoomViews {
  hidden: ("fall" | "spring" | "month")[];
  custom: CustomZoomView[];
  /** S9-06: Fall and Spring renamed and re-dated; no entry means the default name and dates. */
  overrides?: BuiltInZoomOverrides;
}
export interface BuiltInZoomOverride { name: string; start: string; end: string }
export type BuiltInZoomOverrides = { fall?: BuiltInZoomOverride; spring?: BuiltInZoomOverride };

/** S9-03: what a family's records track. A template style is only a starting point; the fields are what counts. */
export interface LogFields {
  subjectHours: boolean;
  coreSplit: boolean;
  totalHours: boolean;
  schoolDays: boolean;
  homeAway: boolean;
  notes: boolean;
  books: boolean;
}
export type LogTemplate = "hoursBySubject" | "coreNonCore" | "daysAttended" | "daysAndHours" | "detailed" | "custom";
export interface LogSetup { template: LogTemplate; fields: LogFields }

/** S9-07: one log entry, typed by the parent: one child, a day or a run of days. Minutes are whole minutes. */
export interface RecordEntry {
  id: string;
  childId: string;
  startDate: string;
  endDate: string;
  countsSchoolDay: boolean;
  /** How many days the entry counts (0 when the switch is off), from its covered days (S9b-01). */
  schoolDays: number;
  /** S9b-01: the days the entry covers, whatever its switch: one chosen date, or the school-calendar days of a run. */
  /** S9b-07: the days of a run the parent ticked, or null when the school calendar decides (and for one day). */
  days: string[] | null;
  coveredDays: string[];
  subjectMinutes: Record<string, number>;
  totalMinutes: number | null;
  homeMinutes: number | null;
  awayMinutes: number | null;
  notes: string | null;
  books: string[];
}

/** S9-08: GET /api/records/totals, from log entries only. */
export interface RecordTotals {
  from: string | null;
  to: string | null;
  childId: string | null;
  entries: number;
  schoolDays: number;
  totalMinutes: number;
  coreMinutes: number;
  nonCoreMinutes: number;
  homeMinutes: number;
  awayMinutes: number;
  books: string[];
  bySubject: { subjectId: string; minutes: number }[];
}

/** GET/PATCH /api/family */
export type FamilySettings = Omit<Me, "familyId" | "today" | "demo" | "setupStep" | "setupDone" | "setupDeferred" | "tipsSeen" | "checklistHidden"> & {
  /** A week has a check-in or review, so the week start can't change (S2c-01, D25). */
  weekStartLocked: boolean;
  /** S7-03 */
  zoomViews: ZoomViews;
  /** S9-03: what the records track; null until the family picks a template style. */
  logSetup: LogSetup | null;
  /** S11-03: the school year's first and last day as the parent gave them in the setup flow; null until given. */
  schoolYear?: SchoolYear | null;
};
/** S11b-01: the shapes a school year is given (the setup flow's cards, "I'll set this later" aside). */
export type YearShape = "fall-spring" | "three-terms" | "36-weeks" | "sabbath";
export interface SchoolYear { start: string; end: string; shape?: YearShape | null }
/** The PATCH /api/family body: any of the editable fields. */
export type FamilySettingsPatch = Partial<Omit<FamilySettings, "weekStartLocked">> & {
  /** S11-01: the setup step the family is on, and what it put off. `setupDone` only ever goes to true. */
  setupStep?: number;
  setupDone?: true;
  setupDeferred?: SetupDeferral[];
  /** S11-03: the school year (never cleared by a patch). */
  schoolYear?: { start: string; end: string; shape?: YearShape };
  /** S11-06: the hints seen; an empty list shows them all again ("Show tips again"). */
  tipsSeen?: TipId[];
  checklistHidden?: boolean;
};

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
  /** S2b-31: the subject's usual effort for one unit type, or null. */
  defaultWeight: SubjectDefaultWeight | null;
  /** S4-03: the days (0 = Sunday … 6 = Saturday, sorted) new work in this subject runs on, or null = every school day. */
  defaultWeekdays: number[] | null;
  /** S8-11: a key from the fixed icon list, or null for the first-letter badge. */
  icon?: string | null;
  /** S9-03: a core subject (the records split hours into core and non-core). Missing = non-core. */
  core?: boolean;
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
  /** S4-04: the assignment's own days (0 = Sunday … 6 = Saturday, sorted), or null = follow the subject's default. */
  weekdays: number[] | null;
  /** S12-01: how the parent said it ended and the day (null while it is open). Older answers and fixtures may leave both out. */
  endedAs?: AssignmentEnding | null;
  endedOn?: string | null;
}

/** S12-01: "finished" only when the parent said so; "stopped" is dropped work and never counts as finished. */
export type AssignmentEnding = "finished" | "stopped";

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

/** GET/POST /api/calendar-templates (S5-06): breaks counted in days from the year's first day. */
export interface TemplateBreak {
  offsetDays: number;
  lengthDays: number;
  label: string | null;
  kind: BlockedKind;
  /** S7b-13: the weekday the break started on (0 = Sunday); templates saved before it have none. */
  weekday?: number;
  /** S7b-13: set when the break is exactly a US holiday's dates, so it follows that holiday in a new year. */
  holiday?: HolidayKey;
  /** S7b-17: with `holiday`, how many days the break runs before the holiday's first day and after its last (0 or absent: exactly the holiday). */
  holidayBefore?: number;
  holidayAfter?: number;
}
export interface CalendarTemplate {
  id: string;
  name: string;
  breaks: TemplateBreak[];
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

/** POST /api/plan/preview-event (S5-01) */
export interface EventPreviewRow {
  assignmentId: string;
  childId: string;
  title: string;
  childName: string;
  unitType: UnitType;
  before: { perDay: number; end: string };
  after: { perDay: number; end: string };
}
export interface EventPreview {
  changes: EventPreviewRow[];
  /** Changed rows beyond the ones returned. */
  more: number;
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
