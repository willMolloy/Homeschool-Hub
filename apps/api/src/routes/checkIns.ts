/** /api/check-ins (S2b-23/24). Thin: parse, then checkInService does the work. */
import { OVERRIDE_MODES, WEEK_REVIEW_STATUSES, humanList } from "@hh/engine";
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { withReadSnapshot, withTransaction } from "../db";
import { familyToday } from "../http/today";
import { LocalDate, MAX_IDS, Position } from "../http/scheduleLimits";
import { parseBody, UUID_RE } from "../http/validate";
import { listWeeks, readWeek, saveWeek } from "../services/checkInService";

const WeekQuery = z.strictObject({ weekStart: LocalDate.optional() });
const WeekParams = z.strictObject({ weekStart: LocalDate });
const Id = (label: string) => z.string(`${label} must be an id.`).regex(UUID_RE, `${label} must be a UUID.`).transform((s) => s.toLowerCase());
/** At most this many items in one week (a family has at most MAX_IDS children × a handful of assignments). */
export const MAX_CHECKIN_ITEMS = MAX_IDS * 10;
const SaveBody = z.strictObject({
  status: z.enum(WEEK_REVIEW_STATUSES, `status must be ${humanList(WEEK_REVIEW_STATUSES)}.`),
  items: z.array(z.strictObject({
    assignmentId: Id("assignmentId"),
    childId: Id("childId"),
    position: Position,
    mode: z.enum(OVERRIDE_MODES, `mode must be ${humanList(OVERRIDE_MODES)} or null.`).nullable().default(null),
  })).max(MAX_CHECKIN_ITEMS, `items: at most ${MAX_CHECKIN_ITEMS}.`),
});

export async function checkInsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/check-ins", async (req) => {
    const { weekStart } = parseBody(WeekQuery, req.query);
    return withReadSnapshot(app.db, (tx) => readWeek(tx, req.familyId, { requested: weekStart, todayIn: (zone) => familyToday(req, zone) }));
  });

  /** Finished weeks that can be reopened (S2b-27). */
  app.get("/api/check-ins/weeks", async (req) => {
    parseBody(z.strictObject({}), req.query);
    const weeks = await withReadSnapshot(app.db, (tx) => listWeeks(tx, req.familyId, { todayIn: (zone) => familyToday(req, zone) }));
    return { weeks };
  });

  app.put("/api/check-ins/:weekStart", async (req) => {
    const { weekStart } = parseBody(WeekParams, req.params);
    const body = parseBody(SaveBody, req.body);
    return withTransaction(app.db, (tx) => saveWeek(tx, req.familyId, { weekStart, ...body, todayIn: (zone) => familyToday(req, zone) }));
  });
}
