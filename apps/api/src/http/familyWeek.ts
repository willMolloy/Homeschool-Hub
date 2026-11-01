/** The start of the family's current week, in its own time zone and week-start setting (S4-01b). */
import type { FastifyRequest } from "fastify";
import type { Queryable } from "../db";
import { currentWeekStart } from "../services/weekdaysChange";
import { familyToday } from "./today";

export async function familyWeekStart(db: Queryable, req: FastifyRequest): Promise<{ today: string; weekStart: "mon" | "sun"; weekdaysFrom: string; schoolDays: number[] }> {
  const { rows } = await db.query<{ week_start: "mon" | "sun"; time_zone: string; school_days: number[] }>("SELECT week_start, time_zone, school_days FROM family WHERE id = $1", [req.familyId]);
  const f = rows[0]!;
  const today = familyToday(req, f.time_zone);
  return { today, weekStart: f.week_start, weekdaysFrom: currentWeekStart(today, f.week_start), schoolDays: f.school_days };
}
