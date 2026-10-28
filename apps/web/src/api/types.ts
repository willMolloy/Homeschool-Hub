/** Response shapes of the API. Kept in sync with apps/api by hand (Sprint 1). */
import type { ChildPlan, UnitType } from "@hh/engine";

export type { UnitType };

/** `{ error, message? }` from every non-2xx response. */
export interface ApiErrorBody {
  error: string;
  message?: string;
}

/** GET /api/me */
export interface Me {
  familyId: string;
  name: string;
  weekStart: "mon" | "sun";
  schoolDays: number[];
  /** IANA zone, e.g. "America/Chicago" (S2a-02). */
  timeZone: string;
}

/** GET/PATCH /api/family */
export type FamilySettings = Omit<Me, "familyId">;

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
}

/** GET /api/health */
export interface Health {
  ok: boolean;
  engineVersion: string;
  db: "ok" | "down";
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
  /** null = the unit-type default (estimated). */
  minutesPerUnit: number | null;
  startDate: string;
  endDate: string;
  childIds: string[];
  archived: boolean;
}

/** GET/POST/PATCH/DELETE /api/blocked-ranges (S2a-07) */
export type BlockedKind = "vacation" | "holiday" | "sick" | "other";
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
export type EventRule = "skip" | "lighter" | "normal";
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
