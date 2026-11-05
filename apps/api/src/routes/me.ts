import type { FastifyInstance } from "fastify";
import { HttpError } from "../http/errors";
import { familyToday } from "../http/today";
import { DEMO_LOGIN_EMAIL } from "../auth/demo";
import { TIPS } from "./family";
import { accountsOf, type AccountChoice } from "../services/membership";

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
  /** S15-01: this person's role in the account on screen: "viewer" is view-only (the web shows Schedule and Records only). */
  role: "parent" | "viewer";
  /** S15-01: every account this one login belongs to (the family menu's "Switch to"); the person's own memberships only. */
  accounts: (AccountChoice & { current: boolean })[];
}

export function toMe(row: FamilyRow, today: string, role: "parent" | "viewer" = "parent", accounts: MeResponse["accounts"] = []): MeResponse {
  // A viewer's answer carries no setup state: no first-run flow, no reminders, no hints, and never "demo" (nothing for them to hide).
  if (role === "viewer") {
    return { familyId: row.id, name: row.name, weekStart: row.week_start, schoolDays: row.school_days, timeZone: row.time_zone, today, demo: false,
      setupStep: 6, setupDone: true, setupDeferred: [], tipsSeen: [...TIPS], checklistHidden: true, parentName: row.parent_name, role, accounts };
  }
  return { familyId: row.id, name: row.name, weekStart: row.week_start, schoolDays: row.school_days, timeZone: row.time_zone, today, demo: row.demo,
    setupStep: row.setup_step, setupDone: row.setup_done, setupDeferred: row.setup_deferred, tipsSeen: row.tips_seen, checklistHidden: row.checklist_hidden, parentName: row.parent_name, role, accounts };
}

export async function meRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/me", async (req) => {
    const { rows } = await app.db.query<FamilyRow>(
      `SELECT f.id, f.name, f.week_start, f.school_days, f.time_zone, f.setup_step, f.setup_done, f.setup_deferred, f.tips_seen, f.checklist_hidden,
              EXISTS (SELECT 1 FROM parent d WHERE d.family_id = f.id AND lower(d.email) = $2) AS demo,
              (SELECT p.name FROM parent p JOIN family_member m ON m.parent_id = p.id AND m.family_id = f.id WHERE p.id = $3) AS parent_name
         FROM family f WHERE f.id = $1`, [req.familyId, DEMO_LOGIN_EMAIL, req.parentId || null]);
    if (!rows[0]) throw new HttpError(401, "unauthenticated", "Your family no longer exists.");
    const accounts = req.parentId ? (await accountsOf(app.db, req.parentId)).map((a) => ({ ...a, current: a.familyId === req.familyId })) : [];
    return toMe(rows[0], familyToday(req, rows[0].time_zone), req.role, accounts);
  });
}
