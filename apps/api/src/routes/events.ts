/** /api/events (S2a-08..10): recurring events such as co-op or piano. */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { listEvents, toEventJson } from "../repos/eventRepo";

const ListQuery = z.object({ includeArchived: z.enum(["true", "false"]).optional() });

export async function eventsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/events", async (req) => {
    const q = ListQuery.safeParse(req.query);
    const includeArchived = q.success && q.data.includeArchived === "true";
    return (await listEvents(app.db, req.familyId, includeArchived)).map(toEventJson);
  });
}
