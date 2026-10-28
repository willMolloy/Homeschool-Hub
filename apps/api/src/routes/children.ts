import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { Color, Name, parseBody } from "../http/validate";
import { createChild, listChildren, toChildJson } from "../repos/childRepo";

const ListQuery = z.object({ includeArchived: z.enum(["true", "false"]).optional() });
// Unknown keys (e.g. family_id) are dropped: ownership always comes from the session.
const CreateBody = z.object({ name: Name, color: Color.optional() });

export async function childrenRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/children", async (req) => {
    const q = ListQuery.safeParse(req.query);
    const includeArchived = q.success && q.data.includeArchived === "true";
    return (await listChildren(app.db, req.familyId, includeArchived)).map(toChildJson);
  });

  app.post("/api/children", async (req, reply) => {
    const body = parseBody(CreateBody, req.body);
    const row = await createChild(app.db, req.familyId, body);
    return reply.code(201).send(toChildJson(row));
  });
}
