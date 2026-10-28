/**
 * GET/PATCH /api/family (S2a-02): the signed-in family's calendar settings.
 * Ownership always comes from the session; there is no family id in the URL.
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { HttpError } from "../app";
import { TimeZone } from "../http/timeZone";
import { Name, parseBody } from "../http/validate";

export interface FamilySettings { name: string; weekStart: "mon" | "sun"; schoolDays: number[]; timeZone: string }
interface FamilyRow { name: string; week_start: "mon" | "sun"; school_days: number[]; time_zone: string }

const toSettings = (r: FamilyRow): FamilySettings => ({ name: r.name, weekStart: r.week_start, schoolDays: r.school_days, timeZone: r.time_zone });

/** 1–7 distinct weekdays (0 = Sunday … 6 = Saturday), returned sorted. */
export const SchoolDays = z
  .array(z.number().int("School days must be whole numbers 0–6.").min(0, "School days are 0 (Sunday) to 6 (Saturday).").max(6, "School days are 0 (Sunday) to 6 (Saturday)."))
  .min(1, "Pick at least one school day.")
  .max(7)
  .refine((d) => new Set(d).size === d.length, "School days can't repeat.")
  .transform((d) => [...d].sort((a, b) => a - b));

// Strict: a typo'd key is a 400 rather than a silent no-op on a settings form.
const PatchBody = z
  .strictObject({ name: Name.optional(), weekStart: z.enum(["mon", "sun"], "weekStart must be \"mon\" or \"sun\".").optional(), schoolDays: SchoolDays.optional(), timeZone: TimeZone.optional() })
  .refine((b) => Object.values(b).some((v) => v !== undefined), "Send at least one of name, weekStart, schoolDays, timeZone.");

const COLS = "name, week_start, school_days, time_zone";
const gone = () => new HttpError(401, "unauthenticated", "Your family no longer exists.");

export async function familyRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/family", async (req) => {
    const { rows } = await app.db.query<FamilyRow>(`SELECT ${COLS} FROM family WHERE id = $1`, [req.familyId]);
    if (!rows[0]) throw gone();
    return toSettings(rows[0]);
  });

  app.patch("/api/family", async (req) => {
    const b = parseBody(PatchBody, req.body);
    const { rows } = await app.db.query<FamilyRow>(
      `UPDATE family SET
         name = COALESCE($2, name),
         week_start = COALESCE($3, week_start),
         school_days = COALESCE($4::smallint[], school_days),
         time_zone = COALESCE($5, time_zone),
         updated_at = now()
       WHERE id = $1 RETURNING ${COLS}`,
      [req.familyId, b.name ?? null, b.weekStart ?? null, b.schoolDays ?? null, b.timeZone ?? null]);
    if (!rows[0]) throw gone();
    return toSettings(rows[0]);
  });
}
