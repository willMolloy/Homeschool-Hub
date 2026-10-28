import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { HttpError } from "../http/errors";
import { Color, Name, SortOrder, UUID_RE, parseBody, parseListQuery } from "../http/validate";
import { createChild, listChildren, toChildJson, updateChild } from "../repos/childRepo";

// Unknown keys (e.g. family_id) are dropped: ownership always comes from the session.
const CreateBody = z.strictObject({ name: Name, color: Color.optional() });
const PatchBody = z
  .strictObject({ name: Name.optional(), color: Color.nullable().optional(), sortOrder: SortOrder.optional(), archived: z.boolean().optional() })
  .refine((b) => Object.values(b).some((v) => v !== undefined), "Send at least one of name, color, sortOrder, archived.");

const notFound = () => new HttpError(404, "not_found", "No such child.");

export async function childrenRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/children", async (req) => {
    const { includeArchived } = parseListQuery(req.query);
    return (await listChildren(app.db, req.familyId, includeArchived)).map(toChildJson);
  });

  app.post("/api/children", async (req, reply) => {
    const body = parseBody(CreateBody, req.body);
    const row = await createChild(app.db, req.familyId, body);
    return reply.code(201).send(toChildJson(row));
  });

  app.patch<{ Params: { id: string } }>("/api/children/:id", async (req) => {
    // Malformed ids are "not found" too (never a 500 from the uuid cast).
    if (!UUID_RE.test(req.params.id)) throw notFound();
    const patch = parseBody(PatchBody, req.body);
    const row = await updateChild(app.db, req.familyId, req.params.id, patch);
    if (!row) throw notFound();
    return toChildJson(row);
  });
}
