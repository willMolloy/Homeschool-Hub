/** /api/assignments (S2a-04..06); POST /api/assignments/bulk (S3a-03). */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { withTransaction, type Tx } from "../db";
import { checkUnitChange } from "../http/assignmentWeight";
import { checkDatesKeepLatestCheckIn } from "../http/checkInDates";
import { checkDateOrder, IdList, LocalDate, MAX_ASSIGNMENT_CHILDREN, MAX_ASSIGNMENT_DAYS, Title, TotalUnits, UnitTypeField, WeightPerUnit } from "../http/scheduleLimits";
import { parseBody, parseListQuery, UUID_RE } from "../http/validate";
import { HttpError } from "../http/errors";
import { createAssignment, getAssignment, listAssignments, lockAssignment, toAssignmentJson, updateAssignment } from "../repos/assignmentRepo";
import { checkRefs } from "../repos/refs";
import { recordWeightChoices } from "../repos/weightChoiceRepo";

const Id = z.string("Must be an id.").regex(UUID_RE, "Must be a UUID.").transform((s) => s.toLowerCase());
const Children = IdList(MAX_ASSIGNMENT_CHILDREN).min(1, "Pick at least one child.");

// Unknown keys (e.g. family_id) are dropped: ownership always comes from the session.
const CreateBody = z.strictObject({
  subjectId: Id,
  title: Title,
  unitType: UnitTypeField,
  totalUnits: TotalUnits,
  weightPerUnit: WeightPerUnit.nullable().optional(),
  startDate: LocalDate,
  endDate: LocalDate,
  childIds: Children,
});

/** S3a-03: the most assignments one bulk request may create. */
const MAX_BULK = 50;
const BulkBody = z.strictObject({
  assignments: z.array(z.unknown(), "Must be a list.").min(1, "Send at least one assignment.").max(MAX_BULK, `Send at most ${MAX_BULK} assignments.`),
});

const PatchBody = z
  .strictObject({
    subjectId: Id.optional(),
    title: Title.optional(),
    unitType: UnitTypeField.optional(),
    totalUnits: TotalUnits.optional(),
    // null clears the weight (back to the subject default, then the built-in).
    weightPerUnit: WeightPerUnit.nullable().optional(),
    startDate: LocalDate.optional(),
    endDate: LocalDate.optional(),
    childIds: Children.optional(),
    archived: z.boolean().optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), "Send at least one field to change.");

type CreateInput = z.infer<typeof CreateBody>;

/** Checks references, inserts one assignment and records its weight choice. The caller owns the transaction. */
async function createOne(c: Tx, familyId: string, b: CreateInput) {
  await checkRefs(c, familyId, { subjectIds: [b.subjectId], childIds: b.childIds });
  const id = await createAssignment(c, familyId, { ...b, weightPerUnit: b.weightPerUnit ?? null });
  // Taking the default isn't a choice (S2b-07, D5).
  if (b.weightPerUnit != null) {
    await recordWeightChoices(c, { familyId, assignmentId: id, childIds: b.childIds, unitType: b.unitType, weight: b.weightPerUnit });
  }
  return (await getAssignment(c, familyId, id))!;
}

/** Re-throws a 400 with "Assignment N: " in front (N is 1-based) so the parent can find the bad item. */
async function atPosition<T>(n: number, fn: () => T | Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) throw new HttpError(err.statusCode, err.code, `Assignment ${n}: ${err.message}`);
    throw err;
  }
}

const notFound = () => new HttpError(404, "not_found", "No such assignment.");

export async function assignmentsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/assignments", async (req) => {
    const { includeArchived } = parseListQuery(req.query);
    return (await listAssignments(app.db, req.familyId, includeArchived)).map(toAssignmentJson);
  });

  app.post("/api/assignments", async (req, reply) => {
    const b = parseBody(CreateBody, req.body);
    checkDateOrder(b.startDate, b.endDate, MAX_ASSIGNMENT_DAYS);
    const row = await withTransaction(app.db, (c) => createOne(c, req.familyId, b));
    return reply.code(201).send(toAssignmentJson(row));
  });

  app.post("/api/assignments/bulk", async (req, reply) => {
    const { assignments } = parseBody(BulkBody, req.body);
    // Every item is validated before anything is written.
    const items: CreateInput[] = [];
    for (const [i, raw] of assignments.entries()) {
      items.push(await atPosition(i + 1, () => {
        const b = parseBody(CreateBody, raw);
        checkDateOrder(b.startDate, b.endDate, MAX_ASSIGNMENT_DAYS);
        return b;
      }));
    }
    const rows = await withTransaction(app.db, async (c) => {
      const created = [];
      for (const [i, b] of items.entries()) created.push(await atPosition(i + 1, () => createOne(c, req.familyId, b)));
      return created;
    });
    return reply.code(201).send(rows.map(toAssignmentJson));
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
      if (p.startDate !== undefined || p.endDate !== undefined) {
        await checkDatesKeepLatestCheckIn(c, req.familyId, cur.id, p.startDate ?? cur.start_date, p.endDate ?? cur.end_date);
      }
      const unitType = p.unitType ?? cur.unit_type;
      checkUnitChange({ unitType: cur.unit_type, weightPerUnit: cur.weight_per_unit }, p.unitType, p);
      // Only newly named references are checked: an assignment may keep a subject that was archived later.
      // Ids already linked may stay even if archived since (the forms keep them ticked); new ones must be active.
      const newSubject = p.subjectId && p.subjectId !== cur.subject_id ? [p.subjectId] : [];
      await checkRefs(c, req.familyId, { subjectIds: newSubject, childIds: (p.childIds ?? []).filter((id) => !cur.child_ids.includes(id)) });
      await updateAssignment(c, req.familyId, cur.id, p);
      // A new weight (or the same number under a new unit type) is a choice for every child left on the assignment.
      if (p.weightPerUnit !== undefined && (p.weightPerUnit !== cur.weight_per_unit || unitType !== cur.unit_type)) {
        await recordWeightChoices(c, { familyId: req.familyId, assignmentId: cur.id, childIds: p.childIds ?? cur.child_ids, unitType, weight: p.weightPerUnit });
      }
      return (await getAssignment(c, req.familyId, cur.id))!;
    });
    return toAssignmentJson(row);
  });
}
