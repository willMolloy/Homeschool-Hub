/** /api/check-ins (S2b-23/24). Thin: parse, then checkInService does the work. */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { withReadSnapshot } from "../db";
import { familyToday } from "../http/today";
import { LocalDate } from "../http/scheduleLimits";
import { parseBody } from "../http/validate";
import { readWeek } from "../services/checkInService";

const WeekQuery = z.strictObject({ weekStart: LocalDate.optional() });

export async function checkInsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/check-ins", async (req) => {
    const { weekStart } = parseBody(WeekQuery, req.query);
    return withReadSnapshot(app.db, (tx) => readWeek(tx, req.familyId, { requested: weekStart, todayIn: (zone) => familyToday(req, zone) }));
  });
}
