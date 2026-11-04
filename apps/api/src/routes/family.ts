/**
 * GET/PATCH /api/family (S2a-02): the signed-in family's calendar settings.
 * Ownership always comes from the session; there is no family id in the URL.
 *
 * S2c-01 (D25): stored check-ins and week reviews are keyed to the week start, so once any exist the week
 * start can't change (409 week_start_locked). They are never re-keyed.
 * S7-03: `zoomViews` is the timeline's hidden built-in zoom views and the family's own (014_zoom_views).
 * S9-03: `logSetup` is what the family's records track (016_log_setup); null until the family picks a template style.
 * S11-01: `setupStep`, `setupDone` and `setupDeferred` are where the family is in the first-run flow (019_setup_flow).
 * S11-06: `tipsSeen` is the one-time hints on Schedule the family has seen (021_tips_seen); an empty list shows them all again.
 * S11-03: `schoolYear` is the first and last day the parent gave in that flow (020_school_year); null until given.
 */
import type { FastifyInstance } from "fastify";
import { humanList, isValidLocalDate, toDayNumber, WEEK_STARTS } from "@hh/engine";
import { z } from "zod";
import { withTransaction, type Queryable } from "../db";
import { HttpError } from "../http/errors";
import { TimeZone } from "../http/timeZone";
import { Name, parseBody } from "../http/validate";
import { LogSetup, type LogSetupJson } from "../http/logSetup";
import { MAX_ZOOM_DAYS, ZoomViews, type ZoomViewsJson } from "../http/zoomViews";
import { LocalDate } from "../http/scheduleLimits";

export interface FamilySettings {
  name: string; weekStart: "mon" | "sun"; schoolDays: number[]; timeZone: string;
  /** Some week has a check-in or review, so the week start can't change (S2c-01). */
  weekStartLocked: boolean;
  zoomViews: ZoomViewsJson;
  logSetup: LogSetupJson | null;
  setupStep: number;
  setupDone: boolean;
  setupDeferred: SetupDeferral[];
  schoolYear: { start: string; end: string; shape: YearShape | null } | null;
  tipsSeen: Tip[];
}
interface FamilyRow {
  name: string; week_start: "mon" | "sun"; school_days: number[]; time_zone: string; zoom_views: ZoomViewsJson; log_setup: LogSetupJson | null;
  setup_step: number; setup_done: boolean; setup_deferred: SetupDeferral[];
  school_year_start: string | null; school_year_end: string | null; school_year_shape: YearShape | null; tips_seen: Tip[];
}

/** S11-01: the setup steps a family can put off (the school year, the breaks). */
export const SETUP_DEFERRALS = ["year", "breaks"] as const;
export type SetupDeferral = (typeof SETUP_DEFERRALS)[number];
export const SETUP_STEPS = 6;

/** S11-06: the one-time hints on Schedule (a bar's thickness, the open bar's dates, the subject icons). */
export const TIPS = ["bars", "edit", "icons"] as const;
export type Tip = (typeof TIPS)[number];

const toSettings = (r: FamilyRow, weekStartLocked: boolean): FamilySettings =>
  ({ name: r.name, weekStart: r.week_start, schoolDays: r.school_days, timeZone: r.time_zone, weekStartLocked, zoomViews: r.zoom_views, logSetup: r.log_setup,
    setupStep: r.setup_step, setupDone: r.setup_done, setupDeferred: r.setup_deferred,
    schoolYear: r.school_year_start && r.school_year_end ? { start: r.school_year_start, end: r.school_year_end, shape: r.school_year_shape } : null,
    tipsSeen: r.tips_seen });

export const WEEK_START_LOCKED_MESSAGE = "weekStart: the week start can't change after weeks have been checked in.";

/** Whether any check-in or week review is stored for the family (they are keyed to its week start). */
export async function weekStartLocked(db: Queryable, familyId: string): Promise<boolean> {
  const { rows } = await db.query<{ locked: boolean }>(
    `SELECT EXISTS (SELECT 1 FROM progress_checkin WHERE family_id = $1)
         OR EXISTS (SELECT 1 FROM week_review WHERE family_id = $1) AS locked`, [familyId]);
  return rows[0]?.locked ?? false;
}

/** 1–7 distinct weekdays (0 = Sunday … 6 = Saturday), returned sorted. */
export const SchoolDays = z
  .array(z.number().int("School days must be whole numbers 0–6.").min(0, "School days are 0 (Sunday) to 6 (Saturday).").max(6, "School days are 0 (Sunday) to 6 (Saturday)."))
  .min(1, "Pick at least one school day.")
  .max(7)
  .refine((d) => new Set(d).size === d.length, "School days can't repeat.")
  .transform((d) => [...d].sort((a, b) => a - b));

/** S11b-01: the shapes a school year can be given (the setup flow's cards, "later" aside). */
export const YEAR_SHAPES = ["fall-spring", "three-terms", "36-weeks", "sabbath"] as const;
export type YearShape = (typeof YEAR_SHAPES)[number];

/** S11-03: the school year's first and last day (at most 400 days, like a calendar template's year). */
const SchoolYear = z.strictObject({ start: LocalDate, end: LocalDate, shape: z.enum(YEAR_SHAPES, "shape must be one of the year shapes.").optional() }).superRefine((y, ctx) => {
  if (!isValidLocalDate(y.start) || !isValidLocalDate(y.end)) return;
  const days = toDayNumber(y.end) - toDayNumber(y.start) + 1;
  if (days < 1) ctx.addIssue({ code: "custom", path: ["end"], message: "The last day must be on or after the first day." });
  else if (days > MAX_ZOOM_DAYS) ctx.addIssue({ code: "custom", path: ["end"], message: `A school year can cover at most ${MAX_ZOOM_DAYS} days; this one covers ${days}.` });
});

// Strict: a typo'd key is a 400 rather than a silent no-op on a settings form.
const PatchBody = z
  .strictObject({ name: Name.optional(), weekStart: z.enum(WEEK_STARTS, `weekStart must be ${humanList(WEEK_STARTS.map((s) => `"${s}"`))}.`).optional(), schoolDays: SchoolDays.optional(), timeZone: TimeZone.optional(), zoomViews: ZoomViews.optional(), logSetup: LogSetup.optional(),
    setupStep: z.number("setupStep must be a number from 1 to 6.").int("setupStep must be a whole number from 1 to 6.").min(1, "setupStep must be from 1 to 6.").max(SETUP_STEPS, "setupStep must be from 1 to 6.").optional(),
    // Finishing is one way: a family that finished the flow never goes back into it.
    setupDone: z.literal(true, "setupDone can only be set to true.").optional(),
    schoolYear: SchoolYear.optional(),
    tipsSeen: z.array(z.enum(TIPS, "Only the tips on Schedule can be marked as seen.")).refine((d) => new Set(d).size === d.length, "A tip can only be marked once.").optional(),
    setupDeferred: z.array(z.enum(SETUP_DEFERRALS, "Only the year and the breaks can be put off.")).refine((d) => new Set(d).size === d.length, "A step can only be put off once.").optional() })
  .refine((b) => Object.values(b).some((v) => v !== undefined), "Send at least one of name, weekStart, schoolDays, timeZone, zoomViews, logSetup, setupStep, setupDone, setupDeferred, schoolYear, tipsSeen.");

const COLS = "name, week_start, school_days, time_zone, zoom_views, log_setup, setup_step, setup_done, setup_deferred, school_year_start, school_year_end, school_year_shape, tips_seen";
const gone = () => new HttpError(401, "unauthenticated", "Your family no longer exists.");

export async function familyRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/family", async (req) => {
    const { rows } = await app.db.query<FamilyRow>(`SELECT ${COLS} FROM family WHERE id = $1`, [req.familyId]);
    if (!rows[0]) throw gone();
    return toSettings(rows[0], await weekStartLocked(app.db, req.familyId));
  });

  app.patch("/api/family", async (req) => {
    const b = parseBody(PatchBody, req.body);
    return withTransaction(app.db, async (tx) => {
      // Lock the family first: a check-in save takes a share lock on it, so none can land between the check and the update.
      const { rows: cur } = await tx.query<FamilyRow>(`SELECT ${COLS} FROM family WHERE id = $1 FOR UPDATE`, [req.familyId]);
      if (!cur[0]) throw gone();
      const locked = await weekStartLocked(tx, req.familyId);
      if (b.weekStart !== undefined && b.weekStart !== cur[0].week_start && locked)
        throw new HttpError(409, "week_start_locked", WEEK_START_LOCKED_MESSAGE);
      const { rows } = await tx.query<FamilyRow>(
        `UPDATE family SET
           name = COALESCE($2, name),
           week_start = COALESCE($3, week_start),
           school_days = COALESCE($4::smallint[], school_days),
           time_zone = COALESCE($5, time_zone),
           zoom_views = COALESCE($6::jsonb, zoom_views),
           log_setup = COALESCE($7::jsonb, log_setup),
           setup_step = COALESCE($8::smallint, setup_step),
           setup_done = setup_done OR COALESCE($9::boolean, false),
           setup_deferred = COALESCE($10::text[], setup_deferred),
           school_year_start = COALESCE($11::date, school_year_start),
           school_year_end = COALESCE($12::date, school_year_end),
           school_year_shape = COALESCE($14::text, school_year_shape),
           tips_seen = COALESCE($13::text[], tips_seen),
           updated_at = now()
         WHERE id = $1 RETURNING ${COLS}`,
        [req.familyId, b.name ?? null, b.weekStart ?? null, b.schoolDays ?? null, b.timeZone ?? null, b.zoomViews ? JSON.stringify(b.zoomViews) : null, b.logSetup ? JSON.stringify(b.logSetup) : null,
         b.setupStep ?? null, b.setupDone ?? null, b.setupDeferred ?? null, b.schoolYear?.start ?? null, b.schoolYear?.end ?? null, b.tipsSeen ?? null, b.schoolYear?.shape ?? null]);
      return toSettings(rows[0]!, locked);
    });
  });
}
