import type { FastifyInstance } from "fastify";
import { HttpError } from "../http/errors";
import { familyToday } from "../http/today";
import { isDemoLogin } from "../auth/demo";

interface FamilyRow { id: string; name: string; week_start: "mon" | "sun"; school_days: number[]; time_zone: string; login_email: string | null }
export interface MeResponse {
  familyId: string; name: string; weekStart: "mon" | "sun"; schoolDays: number[]; timeZone: string;
  /** Today (YYYY-MM-DD) in the family's zone, from the API clock: the web's default week, not the device date. */
  today: string;
  /** The seeded demo family: the web hides what the demo can't do (e.g. adding events). */
  demo: boolean;
}

export function toMe(row: FamilyRow, today: string): MeResponse {
  return { familyId: row.id, name: row.name, weekStart: row.week_start, schoolDays: row.school_days, timeZone: row.time_zone, today, demo: isDemoLogin(row.login_email) };
}

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/me", async (req) => {
    const { rows } = await app.db.query<FamilyRow>(
      "SELECT id, name, week_start, school_days, time_zone, login_email FROM family WHERE id = $1", [req.familyId]);
    if (!rows[0]) throw new HttpError(401, "unauthenticated", "Your family no longer exists.");
    return toMe(rows[0], familyToday(req, rows[0].time_zone));
  });
}
