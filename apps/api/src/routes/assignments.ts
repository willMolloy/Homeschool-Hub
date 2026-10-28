/** /api/assignments (S2a-04..06). */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { withTransaction } from "../db";
import { checkDateOrder, IdList, LocalDate, MAX_ASSIGNMENT_DAYS, MinutesPerUnit, Title, TotalUnits } from "../http/scheduleLimits";
import { parseBody, UUID_RE } from "../http/validate";
import { HttpError } from "../http/errors";
import { createAssignment, getAssignment, listAssignments, lockAssignment, toAssignmentJson, updateAssignment } from "../repos/assignmentRepo";
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

const PatchBody = z
  .object({
    subjectId: Id.optional(),
    title: Title.optional(),
    unitType: UnitTypeField.optional(),
    totalUnits: TotalUnits.optional(),
    // null clears the override (back to the unit default).
    minutesPerUnit: MinutesPerUnit.nullable().optional(),
    startDate: LocalDate.optional(),
    endDate: LocalDate.optional(),
    childIds: Children.optional(),
    archived: z.boolean().optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), "Send at least one field to change.");

const notFound = () => new HttpError(404, "not_found", "No such assignment.");

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

  app.patch<{ Params: { id: string } }>("/api/assignments/:id", async (req) => {
    // Malformed ids are "not found" too (never a 500 from the uuid cast).
    if (!UUID_RE.test(req.params.id)) throw notFound();
    const p = parseBody(PatchBody, req.body);
    const row = await withTransaction(app.db, async (c) => {
      const cur = await lockAssignment(c, req.familyId, req.params.id);
      if (!cur) throw notFound();
      // Dates are checked on the merged row, so moving only one end can't invert the range.
      checkDateOrder(p.startDate ?? cur.start_date, p.endDate ?? cur.end_date, MAX_ASSIGNMENT_DAYS);
      // Only newly named references are checked: an assignment may keep a subject that was archived later.
      // Ids already linked may stay even if archived since (the forms keep them ticked); new ones must be active.
      const newSubject = p.subjectId && p.subjectId !== cur.subject_id ? [p.subjectId] : [];
      await checkRefs(c, req.familyId, { subjectIds: newSubject, childIds: (p.childIds ?? []).filter((id) => !cur.child_ids.includes(id)) });
      await updateAssignment(c, req.familyId, cur.id, p);
      return (await getAssignment(c, req.familyId, cur.id))!;
    });
    return toAssignmentJson(row);
  });
}
