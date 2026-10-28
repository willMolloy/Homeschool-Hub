/**
 * GET/PATCH /api/family (S2a-02): the signed-in family's calendar settings.
 * Ownership always comes from the session; there is no family id in the URL.
 *
 * S2c-01 (D25): stored check-ins and week reviews are keyed to the week start, so once any exist the week
 * start can't change (409 week_start_locked). They are never re-keyed.
 */
import type { FastifyInstance } from "fastify";
import { humanList, WEEK_STARTS } from "@hh/engine";
import { z } from "zod";
import { withTransaction, type Queryable } from "../db";
import { HttpError } from "../http/errors";
import { TimeZone } from "../http/timeZone";
import { Name, parseBody } from "../http/validate";

export interface FamilySettings {
  name: string; weekStart: "mon" | "sun"; schoolDays: number[]; timeZone: string;
  /** Some week has a check-in or review, so the week start can't change (S2c-01). */
  weekStartLocked: boolean;
}
interface FamilyRow { name: string; week_start: "mon" | "sun"; school_days: number[]; time_zone: string }

const toSettings = (r: FamilyRow, weekStartLocked: boolean): FamilySettings =>
  ({ name: r.name, weekStart: r.week_start, schoolDays: r.school_days, timeZone: r.time_zone, weekStartLocked });

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

// Strict: a typo'd key is a 400 rather than a silent no-op on a settings form.
const PatchBody = z
  .strictObject({ name: Name.optional(), weekStart: z.enum(WEEK_STARTS, `weekStart must be ${humanList(WEEK_STARTS.map((s) => `"${s}"`))}.`).optional(), schoolDays: SchoolDays.optional(), timeZone: TimeZone.optional() })
  .refine((b) => Object.values(b).some((v) => v !== undefined), "Send at least one of name, weekStart, schoolDays, timeZone.");

const COLS = "name, week_start, school_days, time_zone";
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
           updated_at = now()
         WHERE id = $1 RETURNING ${COLS}`,
        [req.familyId, b.name ?? null, b.weekStart ?? null, b.schoolDays ?? null, b.timeZone ?? null]);
      return toSettings(rows[0]!, locked);
    });
  });
}
