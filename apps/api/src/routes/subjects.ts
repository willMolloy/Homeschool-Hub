import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { HttpError } from "../app";
import { isUniqueViolation } from "../http/pgErrors";
import { Color, Name, parseBody } from "../http/validate";
import { SUBJECT_NAME_INDEX, createSubject, listSubjects, toSubjectJson } from "../repos/subjectRepo";

const ListQuery = z.object({ includeArchived: z.enum(["true", "false"]).optional() });
// Unknown keys (e.g. family_id) are dropped: ownership always comes from the session.
const CreateBody = z.object({ name: Name, color: Color.optional() });

/** Map the unique-name index violation to 409; rethrow anything else. */
function duplicateNameOr(err: unknown): never {
  if (isUniqueViolation(err, SUBJECT_NAME_INDEX)) {
    throw new HttpError(409, "duplicate_name", "You already have a subject with that name.");
  }
  throw err;
}

export async function subjectsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/subjects", async (req) => {
    const q = ListQuery.safeParse(req.query);
    const includeArchived = q.success && q.data.includeArchived === "true";
    return (await listSubjects(app.db, req.familyId, includeArchived)).map(toSubjectJson);
  });

  app.post("/api/subjects", async (req, reply) => {
    const body = parseBody(CreateBody, req.body);
    const row = await createSubject(app.db, req.familyId, body).catch(duplicateNameOr);
    return reply.code(201).send(toSubjectJson(row));
  });
}
