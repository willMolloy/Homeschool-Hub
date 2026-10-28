import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { listChildren, toChildJson } from "../repos/childRepo";

const ListQuery = z.object({ includeArchived: z.enum(["true", "false"]).optional() });

export async function childrenRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/children", async (req) => {
    const q = ListQuery.safeParse(req.query);
    const includeArchived = q.success && q.data.includeArchived === "true";
    return (await listChildren(app.db, req.familyId, includeArchived)).map(toChildJson);
  });
}
