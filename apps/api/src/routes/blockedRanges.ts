/** /api/blocked-ranges (S2a-07): vacations and other days off; POST /api/blocked-ranges/bulk (S5-04). */
import type { FastifyInstance } from "fastify";
import { BLOCKED_KINDS, humanList } from "@hh/engine";
import { z } from "zod";
import { HttpError } from "../http/errors";
import { withTransaction, type Tx } from "../db";
import { checkDateOrder, IdList, LocalDate, MAX_BLOCKED_DAYS } from "../http/scheduleLimits";
import { parseBody, UUID_RE } from "../http/validate";
import {
  createBlockedRange, deleteBlockedRange, getBlockedRange, listBlockedRanges, lockBlockedRange, toBlockedRangeJson, updateBlockedRange,
} from "../repos/blockedRangeRepo";
import { checkRefs } from "../repos/refs";

/** Optional label: trimmed, ≤ 60, no NUL; blank → null. */
const Label = z.string("label must be text.").trim().max(60, "Label must be 60 characters or fewer.")
  .refine((s) => !s.includes("\u0000"), "Label can't contain a NUL character.")
  .transform((s) => (s === "" ? null : s));
const Kind = z.enum(BLOCKED_KINDS, `kind must be ${humanList(BLOCKED_KINDS)}.`);
// [] = the whole family.
const Children = IdList(20);

const CreateBody = z.strictObject({
  label: Label.nullable().optional(),
  kind: Kind.optional(),
  startDate: LocalDate,
  endDate: LocalDate,
  childIds: Children.optional(),
});
/** S5-04: the most days off one bulk request may create. */
const MAX_BULK = 100;
const BulkBody = z.strictObject({
  blockedRanges: z.array(z.unknown(), "Must be a list.").min(1, "Send at least one day off.").max(MAX_BULK, `Send at most ${MAX_BULK} days off.`),
});
type CreateInput = z.infer<typeof CreateBody>;

/** Checks references, inserts one day off and reads it back. The caller owns the transaction. */
async function createOne(c: Tx, familyId: string, b: CreateInput) {
  await checkRefs(c, familyId, { childIds: b.childIds ?? [] });
  const id = await createBlockedRange(c, familyId, {
    label: b.label ?? null, kind: b.kind ?? "vacation", startDate: b.startDate, endDate: b.endDate, childIds: b.childIds ?? [],
  });
  return (await getBlockedRange(c, familyId, id))!;
}

/** Re-throws a 400 with "Day off N: " in front (N is 1-based) so the parent can find the bad item. */
async function atPosition<T>(n: number, fn: () => T | Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (err instanceof HttpError) throw new HttpError(err.statusCode, err.code, `Day off ${n}: ${err.message}`);
    throw err;
  }
}

const PatchBody = z
  .strictObject({ label: Label.nullable().optional(), kind: Kind.optional(), startDate: LocalDate.optional(), endDate: LocalDate.optional(), childIds: Children.optional() })
  .refine((b) => Object.values(b).some((v) => v !== undefined), "Send at least one field to change.");

const notFound = () => new HttpError(404, "not_found", "No such day off.");

export async function blockedRangesRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/blocked-ranges", async (req) => (await listBlockedRanges(app.db, req.familyId)).map(toBlockedRangeJson));

  app.post("/api/blocked-ranges", async (req, reply) => {
    const b = parseBody(CreateBody, req.body);
    checkDateOrder(b.startDate, b.endDate, MAX_BLOCKED_DAYS);
    const row = await withTransaction(app.db, (c) => createOne(c, req.familyId, b));
    return reply.code(201).send(toBlockedRangeJson(row));
  });

  app.post("/api/blocked-ranges/bulk", async (req, reply) => {
    const { blockedRanges } = parseBody(BulkBody, req.body);
    // Every item is validated before anything is written.
    const items: CreateInput[] = [];
    for (const [i, raw] of blockedRanges.entries()) {
      items.push(await atPosition(i + 1, () => {
        const b = parseBody(CreateBody, raw);
        checkDateOrder(b.startDate, b.endDate, MAX_BLOCKED_DAYS);
        return b;
      }));
    }
    const rows = await withTransaction(app.db, async (c) => {
      const created = [];
      for (const [i, b] of items.entries()) created.push(await atPosition(i + 1, () => createOne(c, req.familyId, b)));
      return created;
    });
    return reply.code(201).send(rows.map(toBlockedRangeJson));
  });

  app.patch<{ Params: { id: string } }>("/api/blocked-ranges/:id", async (req) => {
    if (!UUID_RE.test(req.params.id)) throw notFound();
    const p = parseBody(PatchBody, req.body);
    const row = await withTransaction(app.db, async (c) => {
      const cur = await lockBlockedRange(c, req.familyId, req.params.id);
      if (!cur) throw notFound();
      checkDateOrder(p.startDate ?? cur.start_date, p.endDate ?? cur.end_date, MAX_BLOCKED_DAYS);
      // Children already linked may stay even if archived since (the forms keep them ticked); new ones must be active.
      await checkRefs(c, req.familyId, { childIds: (p.childIds ?? []).filter((id) => !cur.child_ids.includes(id)) });
      await updateBlockedRange(c, req.familyId, cur.id, p);
      return (await getBlockedRange(c, req.familyId, cur.id))!;
    });
    return toBlockedRangeJson(row);
  });

  app.delete<{ Params: { id: string } }>("/api/blocked-ranges/:id", async (req, reply) => {
    if (!UUID_RE.test(req.params.id)) throw notFound();
    if (!(await deleteBlockedRange(app.db, req.familyId, req.params.id))) throw notFound();
    return reply.code(204).send();
  });
}
