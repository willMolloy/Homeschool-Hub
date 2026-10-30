/** Client limits for an assignment: the pure constants the forms and the CSV import share (S3a-05). */
import { MAX_WEIGHT_PER_UNIT } from "@hh/engine";

/** Mirrors apps/api/src/http/scheduleLimits.ts; weight bounds come from the engine (D2). */
export const LIMITS = { title: 120, totalUnits: 100_000, weightPerUnit: MAX_WEIGHT_PER_UNIT, days: 1096 } as const;

/** The API accepts dates only in these years (scheduleLimits.ts MIN_YEAR / MAX_YEAR). */
export const YEARS = { min: 2000, max: 2100 } as const;
