/** /api/assignments (S2a-04..06). */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { withTransaction } from "../db";
import { checkDateOrder, IdList, LocalDate, MAX_ASSIGNMENT_DAYS, MinutesPerUnit, Title, TotalUnits } from "../http/scheduleLimits";
import { parseBody, UUID_RE } from "../http/validate";
import { createAssignment, getAssignment, listAssignments, toAssignmentJson } from "../repos/assignmentRepo";
import { checkRefs } from "../repos/refs";

const ListQuery = z.object({ includeArchived: z.enum(["true", "false"]).optional() });
const Id = z.string("Must be an id.").regex(UUID_RE, "Must be a UUID.").transform((s) => s.toLowerCase());
const UnitTypeField = z.enum(["pages", "chapters", "lessons", "minutes"], "unitType must be pages, chapters, lessons or minutes.");
export const MAX_ASSIGNMENT_CHILDREN = 20;
const Children = IdList(MAX_ASSIGNMENT_CHILDREN).min(1, "Pick at least one child.");

// Unknown keys (e.g. family_id) are dropped: ownership always comes from the session.
const CreateBody = z.object({
  subjectId: Id,
  title: Title,
  unitType: UnitTypeField,
  totalUnits: TotalUnits,
  minutesPerUnit: MinutesPerUnit.nullable().optional(),
  startDate: LocalDate,
  endDate: LocalDate,
  childIds: Children,
});

export async function assignmentsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/assignments", async (req) => {
    const q = ListQuery.safeParse(req.query);
    const includeArchived = q.success && q.data.includeArchived === "true";
    return (await listAssignments(app.db, req.familyId, includeArchived)).map(toAssignmentJson);
  });

  app.post("/api/assignments", async (req, reply) => {
    const b = parseBody(CreateBody, req.body);
    checkDateOrder(b.startDate, b.endDate, MAX_ASSIGNMENT_DAYS);
    const row = await withTransaction(app.db, async (c) => {
      await checkRefs(c, req.familyId, { subjectIds: [b.subjectId], childIds: b.childIds });
      const id = await createAssignment(c, req.familyId, { ...b, minutesPerUnit: b.minutesPerUnit ?? null });
      return (await getAssignment(c, req.familyId, id))!;
    });
    return reply.code(201).send(toAssignmentJson(row));
  });
}
