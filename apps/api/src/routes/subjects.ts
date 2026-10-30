import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { withTransaction, type Tx } from "../db";
import { HttpError } from "../http/errors";
import { isUniqueViolation } from "../http/pgErrors";
import { DefaultWeight, Weekdays } from "../http/scheduleLimits";
import { Color, Name, SortOrder, UUID_RE, parseBody, parseListQuery } from "../http/validate";
import { familyToday } from "../http/today";
import { recordSubjectWeekdaysChange } from "../repos/assignmentRepo";
import { SUBJECT_NAME_INDEX, createSubject, listSubjects, lockSubjectWeekdays, toSubjectJson, updateSubject } from "../repos/subjectRepo";
import { currentWeekStart, sameWeekdays } from "../services/weekdaysChange";

// Unknown keys (e.g. family_id) are dropped: ownership always comes from the session.
const CreateBody = z.strictObject({ name: Name, color: Color.optional(), defaultWeight: DefaultWeight.nullable().optional(), defaultWeekdays: Weekdays.nullable().optional() });
const PatchBody = z
  .strictObject({
    name: Name.optional(),
    color: Color.nullable().optional(),
    sortOrder: SortOrder.optional(),
    archived: z.boolean().optional(),
    defaultWeight: DefaultWeight.nullable().optional(),
    defaultWeekdays: Weekdays.nullable().optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), "Send at least one of name, color, sortOrder, archived, defaultWeight, defaultWeekdays.");

const notFound = () => new HttpError(404, "not_found", "No such subject.");

/** Map the unique-name index violation to 409; rethrow anything else. */
function duplicateNameOr(err: unknown): never {
  if (isUniqueViolation(err, SUBJECT_NAME_INDEX)) {
    throw new HttpError(409, "duplicate_name", "You already have a subject with that name.");
  }
  throw err;
}

/** S4-01b: after a default-weekdays change, started assignments that follow the default keep their plan up to this week. */
async function recordWeekdaysHistory(tx: Tx, req: FastifyRequest, subjectId: string, before: number[] | null, after: number[] | null): Promise<void> {
  if (sameWeekdays(before, after)) return;
  const { rows } = await tx.query<{ week_start: "mon" | "sun"; time_zone: string }>("SELECT week_start, time_zone FROM family WHERE id = $1", [req.familyId]);
  const f = rows[0]!;
  const weekdaysFrom = currentWeekStart(familyToday(req, f.time_zone), f.week_start);
  await recordSubjectWeekdaysChange(tx, req.familyId, subjectId, { weekdaysFrom, previousWeekdays: before });
}

export async function subjectsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/subjects", async (req) => {
    const { includeArchived } = parseListQuery(req.query);
    return (await listSubjects(app.db, req.familyId, includeArchived)).map(toSubjectJson);
  });

  app.post("/api/subjects", async (req, reply) => {
    const body = parseBody(CreateBody, req.body);
    const row = await withTransaction(app.db, (tx) => createSubject(tx, req.familyId, body)).catch(duplicateNameOr);
    return reply.code(201).send(toSubjectJson(row));
  });

  app.patch<{ Params: { id: string } }>("/api/subjects/:id", async (req) => {
    // Malformed ids are "not found" too (never a 500 from the uuid cast).
    if (!UUID_RE.test(req.params.id)) throw notFound();
    const patch = parseBody(PatchBody, req.body);
    // A rename onto an active name, or unarchiving into a clash, hits the unique index → 409.
    const row = patch.defaultWeekdays === undefined
      ? await updateSubject(app.db, req.familyId, req.params.id, patch).catch(duplicateNameOr)
      : await withTransaction(app.db, async (tx) => {
        const before = await lockSubjectWeekdays(tx, req.familyId, req.params.id);
        if (before === undefined) return null;
        const updated = await updateSubject(tx, req.familyId, req.params.id, patch);
        await recordWeekdaysHistory(tx, req, req.params.id, before, patch.defaultWeekdays ?? null);
        return updated;
      }).catch(duplicateNameOr);
    if (!row) throw notFound();
    return toSubjectJson(row);
  });
}
