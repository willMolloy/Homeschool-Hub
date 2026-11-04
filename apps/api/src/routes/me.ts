import type { FastifyInstance } from "fastify";
import { HttpError } from "../http/errors";
import { familyToday } from "../http/today";
import { isDemoLogin } from "../auth/demo";

interface FamilyRow { id: string; name: string; week_start: "mon" | "sun"; school_days: number[]; time_zone: string; login_email: string | null; setup_step: number; setup_done: boolean; setup_deferred: string[]; tips_seen: string[]; checklist_hidden: boolean }
export interface MeResponse {
  familyId: string; name: string; weekStart: "mon" | "sun"; schoolDays: number[]; timeZone: string;
  /** Today (YYYY-MM-DD) in the family's zone, from the API clock: the web's default week, not the device date. */
  today: string;
  /** The seeded demo family: the web hides what the demo can't do (e.g. adding events). */
  demo: boolean;
  /** S11-01: where the family is in the first-run flow. A family that is done never sees it. */
  setupStep: number;
  setupDone: boolean;
  /** The steps put off ('year', 'breaks'): Home keeps a reminder for each. */
  setupDeferred: string[];
  /** S11-06: the one-time hints on Schedule this family has seen ('bars', 'edit', 'icons'). */
  tipsSeen: string[];
  /** S11b-02: the family hid Home's getting-started reminders. */
  checklistHidden: boolean;
}

export function toMe(row: FamilyRow, today: string): MeResponse {
  return { familyId: row.id, name: row.name, weekStart: row.week_start, schoolDays: row.school_days, timeZone: row.time_zone, today, demo: isDemoLogin(row.login_email),
    setupStep: row.setup_step, setupDone: row.setup_done, setupDeferred: row.setup_deferred, tipsSeen: row.tips_seen, checklistHidden: row.checklist_hidden };
}

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/me", async (req) => {
    const { rows } = await app.db.query<FamilyRow>(
      "SELECT id, name, week_start, school_days, time_zone, login_email, setup_step, setup_done, setup_deferred, tips_seen, checklist_hidden FROM family WHERE id = $1", [req.familyId]);
    if (!rows[0]) throw new HttpError(401, "unauthenticated", "Your family no longer exists.");
    return toMe(rows[0], familyToday(req, rows[0].time_zone));
  });
}
