import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { listSubjects, toSubjectJson } from "../repos/subjectRepo";

const ListQuery = z.object({ includeArchived: z.enum(["true", "false"]).optional() });

export async function subjectsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/subjects", async (req) => {
    const q = ListQuery.safeParse(req.query);
    const includeArchived = q.success && q.data.includeArchived === "true";
    return (await listSubjects(app.db, req.familyId, includeArchived)).map(toSubjectJson);
  });
}
