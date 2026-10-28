/** /api/assignments (S2a-04..06). */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { listAssignments, toAssignmentJson } from "../repos/assignmentRepo";

const ListQuery = z.object({ includeArchived: z.enum(["true", "false"]).optional() });

export async function assignmentsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/assignments", async (req) => {
    const q = ListQuery.safeParse(req.query);
    const includeArchived = q.success && q.data.includeArchived === "true";
    return (await listAssignments(app.db, req.familyId, includeArchived)).map(toAssignmentJson);
  });
}
