/** /api/assignments (S2a-04..06); POST /api/assignments/bulk (S3a-03); POST /api/assignments/:id/reset (S6-07). */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { withTransaction, type Tx } from "../db";
import { checkUnitChange } from "../http/assignmentWeight";
import { checkDatesKeepLatestCheckIn } from "../http/checkInDates";
import { checkDateOrder, IdList, LocalDate, MAX_ASSIGNMENT_CHILDREN, MAX_ASSIGNMENT_DAYS, Title, TotalUnits, UnitTypeField, WeightPerUnit, Weekdays } from "../http/scheduleLimits";
import { parseBody, parseListQuery, UUID_RE } from "../http/validate";
import { HttpError } from "../http/errors";
import { createAssignment, getAssignment, listAssignments, lockAssignment, toAssignmentJson, updateAssignment } from "../repos/assignmentRepo";
import { checkRefs } from "../repos/refs";
import { subjectDefaultWeekdays } from "../repos/subjectRepo";
import { familyWeekStart } from "../http/familyWeek";
import { effectiveWeekdays, weekdaysChange } from "../services/weekdaysChange";
import { recordWeightChoices } from "../repos/weightChoiceRepo";
import { resetAssignment } from "../services/assignmentReset";
import { assignmentStep, recordUndo, type UndoStep } from "../services/undoService";

const Id = z.string("Must be an id.").regex(UUID_RE, "Must be a UUID.").transform((s) => s.toLowerCase());
const Children = IdList(MAX_ASSIGNMENT_CHILDREN).min(1, "Pick at least one child.");

// Unknown keys (e.g. family_id) are dropped: ownership always comes from the session.
const CreateBody = z.strictObject({
  subjectId: Id,
  title: Title,
  unitType: UnitTypeField,
  totalUnits: TotalUnits,
  weightPerUnit: WeightPerUnit.nullable().optional(),
  // null (or left out) = follow the subject's default weekdays, then every school day (S4-04).
  weekdays: Weekdays.nullable().optional(),
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
    // null clears the days (back to the subject's default, then every school day).
    weekdays: Weekdays.nullable().optional(),
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
  const id = await createAssignment(c, familyId, { ...b, weightPerUnit: b.weightPerUnit ?? null, weekdays: b.weekdays ?? null });
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

/** S6-06: the label of the undo entry for an edit, e.g. "Moved Treasure Island". */
function patchLabel(p: z.infer<typeof PatchBody>, title: string): string {
  if (p.archived !== undefined) return `${p.archived ? "Archived" : "Restored"} ${title}`;
  const sent = Object.entries(p).filter(([, v]) => v !== undefined).map(([k]) => k);
  if (sent.every((k) => k === "startDate" || k === "endDate")) return `Moved ${title}`;
  if (sent.every((k) => k === "weightPerUnit")) return `Changed the weight of ${title}`;
  return `Changed ${title}`;
}

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
      // S4-01b: a change in the effective days of an assignment that has started keeps its plan up to this week.
      let history;
      const subjectId = p.subjectId ?? cur.subject_id;
      if (p.weekdays !== undefined || subjectId !== cur.subject_id) {
        const before = effectiveWeekdays(cur.weekdays, await subjectDefaultWeekdays(c, req.familyId, cur.subject_id));
        const after = effectiveWeekdays(p.weekdays === undefined ? cur.weekdays : p.weekdays, await subjectDefaultWeekdays(c, req.familyId, subjectId));
        const week = await familyWeekStart(c, req);
        history = weekdaysChange({ startDate: p.startDate ?? cur.start_date, today: week.today, weekStart: week.weekStart, before, after, stored: { weekdaysFrom: cur.weekdays_from, previousWeekdays: cur.previous_weekdays } }) ?? undefined;
      }
      await updateAssignment(c, req.familyId, cur.id, { ...p, history });
      // A new weight (or the same number under a new unit type) is a choice for every child left on the assignment.
      let choiceIds: string[] = [];
      if (p.weightPerUnit !== undefined && (p.weightPerUnit !== cur.weight_per_unit || unitType !== cur.unit_type)) {
        choiceIds = await recordWeightChoices(c, { familyId: req.familyId, assignmentId: cur.id, childIds: p.childIds ?? cur.child_ids, unitType, weight: p.weightPerUnit });
      }
      const after = (await getAssignment(c, req.familyId, cur.id))!;
      // S6-06: the edit can be undone (its fields come back, and so does the weight choice it recorded).
      const step = assignmentStep(cur, after);
      if (step) {
        const steps: UndoStep[] = choiceIds.length ? [step, { op: "weightChoices", ids: choiceIds }] : [step];
        await recordUndo(c, req.familyId, patchLabel(p, after.title), steps);
      }
      return after;
    });
    return toAssignmentJson(row);
  });

  // S6-07: back to how it was created, without the week adjustments; undoable.
  app.post<{ Params: { id: string } }>("/api/assignments/:id/reset", async (req) => {
    if (!UUID_RE.test(req.params.id)) throw notFound();
    const { assignment, kept } = await withTransaction(app.db, (c) => resetAssignment(c, req.familyId, req.params.id));
    return { assignment: toAssignmentJson(assignment), kept };
  });
}
