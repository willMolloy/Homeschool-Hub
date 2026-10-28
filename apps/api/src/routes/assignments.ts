/** /api/assignments (S2a-04..06). */
import type { FastifyInstance } from "fastify";
import { humanList, UNIT_TYPES } from "@hh/engine";
import { z } from "zod";
import { withTransaction } from "../db";
import { checkUnitChange, checkWeightFields, weightWrite } from "../http/assignmentWeight";
import { checkDateOrder, IdList, LocalDate, MAX_ASSIGNMENT_DAYS, MinutesPerUnit, Title, TotalUnits, WeightPerUnit } from "../http/scheduleLimits";
import { parseBody, parseListQuery, UUID_RE } from "../http/validate";
import { HttpError } from "../http/errors";
import { createAssignment, getAssignment, listAssignments, lockAssignment, toAssignmentJson, updateAssignment } from "../repos/assignmentRepo";
import { checkRefs } from "../repos/refs";

const Id = z.string("Must be an id.").regex(UUID_RE, "Must be a UUID.").transform((s) => s.toLowerCase());
const UnitTypeField = z.enum(UNIT_TYPES, `unitType must be ${humanList(UNIT_TYPES)}.`);
export const MAX_ASSIGNMENT_CHILDREN = 20;
const Children = IdList(MAX_ASSIGNMENT_CHILDREN).min(1, "Pick at least one child.");

// Unknown keys (e.g. family_id) are dropped: ownership always comes from the session.
const CreateBody = z.strictObject({
  subjectId: Id,
  title: Title,
  unitType: UnitTypeField,
  totalUnits: TotalUnits,
  weightPerUnit: WeightPerUnit.nullable().optional(),
  minutesPerUnit: MinutesPerUnit.nullable().optional(), // TODO(S2b-13): legacy alias, translated to a weight
  startDate: LocalDate,
  endDate: LocalDate,
  childIds: Children,
});

const PatchBody = z
  .strictObject({
    subjectId: Id.optional(),
    title: Title.optional(),
    unitType: UnitTypeField.optional(),
    totalUnits: TotalUnits.optional(),
    // null clears the weight (back to the subject default, then the built-in).
    weightPerUnit: WeightPerUnit.nullable().optional(),
    minutesPerUnit: MinutesPerUnit.nullable().optional(), // TODO(S2b-13): legacy alias, translated to a weight
    startDate: LocalDate.optional(),
    endDate: LocalDate.optional(),
    childIds: Children.optional(),
    archived: z.boolean().optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), "Send at least one field to change.");

const notFound = () => new HttpError(404, "not_found", "No such assignment.");

export async function assignmentsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/assignments", async (req) => {
    const { includeArchived } = parseListQuery(req.query);
    return (await listAssignments(app.db, req.familyId, includeArchived)).map(toAssignmentJson);
  });

  app.post("/api/assignments", async (req, reply) => {
    const b = parseBody(CreateBody, req.body);
    checkDateOrder(b.startDate, b.endDate, MAX_ASSIGNMENT_DAYS);
    checkWeightFields(b.unitType, b);
    const w = weightWrite(b.unitType, b);
    const row = await withTransaction(app.db, async (c) => {
      await checkRefs(c, req.familyId, { subjectIds: [b.subjectId], childIds: b.childIds });
      const id = await createAssignment(c, req.familyId, { ...b, weightPerUnit: w.weightPerUnit ?? null, minutesPerUnit: w.minutesPerUnit ?? null });
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
      const unitType = p.unitType ?? cur.unit_type;
      checkWeightFields(unitType, p);
      checkUnitChange({ unitType: cur.unit_type, weightPerUnit: cur.weight_per_unit }, p.unitType, p);
      // Only newly named references are checked: an assignment may keep a subject that was archived later.
      // Ids already linked may stay even if archived since (the forms keep them ticked); new ones must be active.
      const newSubject = p.subjectId && p.subjectId !== cur.subject_id ? [p.subjectId] : [];
      await checkRefs(c, req.familyId, { subjectIds: newSubject, childIds: (p.childIds ?? []).filter((id) => !cur.child_ids.includes(id)) });
      const w = weightWrite(unitType, p, unitType === "minutes" && cur.unit_type !== "minutes");
      await updateAssignment(c, req.familyId, cur.id, { ...p, ...w });
      return (await getAssignment(c, req.familyId, cur.id))!;
    });
    return toAssignmentJson(row);
  });
}
