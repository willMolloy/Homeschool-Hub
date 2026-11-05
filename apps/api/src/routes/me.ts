import type { FastifyInstance } from "fastify";
import { HttpError } from "../http/errors";
import { familyToday } from "../http/today";
import { DEMO_LOGIN_EMAIL } from "../auth/demo";

interface FamilyRow { id: string; name: string; week_start: "mon" | "sun"; school_days: number[]; time_zone: string; demo: boolean; parent_name: string | null; setup_step: number; setup_done: boolean; setup_deferred: string[]; tips_seen: string[]; checklist_hidden: boolean }
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
  /** S14-01: the signed-in parent's name (null for a session made without a parent). */
  parentName: string | null;
}

export function toMe(row: FamilyRow, today: string): MeResponse {
  return { familyId: row.id, name: row.name, weekStart: row.week_start, schoolDays: row.school_days, timeZone: row.time_zone, today, demo: row.demo,
    setupStep: row.setup_step, setupDone: row.setup_done, setupDeferred: row.setup_deferred, tipsSeen: row.tips_seen, checklistHidden: row.checklist_hidden, parentName: row.parent_name };
}

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/me", async (req) => {
    const { rows } = await app.db.query<FamilyRow>(
      `SELECT f.id, f.name, f.week_start, f.school_days, f.time_zone, f.setup_step, f.setup_done, f.setup_deferred, f.tips_seen, f.checklist_hidden,
              EXISTS (SELECT 1 FROM parent d WHERE d.family_id = f.id AND lower(d.email) = $2) AS demo,
              (SELECT p.name FROM parent p WHERE p.id = $3 AND p.family_id = f.id) AS parent_name
         FROM family f WHERE f.id = $1`, [req.familyId, DEMO_LOGIN_EMAIL, req.parentId || null]);
    if (!rows[0]) throw new HttpError(401, "unauthenticated", "Your family no longer exists.");
    return toMe(rows[0], familyToday(req, rows[0].time_zone));
  });
}
