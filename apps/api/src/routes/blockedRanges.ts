/** /api/blocked-ranges (S2a-07): vacations and other days off. */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { HttpError } from "../app";
import { withTransaction } from "../db";
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
const Kind = z.enum(["vacation", "holiday", "sick", "other"], "kind must be vacation, holiday, sick or other.");
// [] = the whole family.
const Children = IdList(20);

const CreateBody = z.object({
  label: Label.nullable().optional(),
  kind: Kind.optional(),
  startDate: LocalDate,
  endDate: LocalDate,
  childIds: Children.optional(),
});
const PatchBody = z
  .object({ label: Label.nullable().optional(), kind: Kind.optional(), startDate: LocalDate.optional(), endDate: LocalDate.optional(), childIds: Children.optional() })
  .refine((b) => Object.values(b).some((v) => v !== undefined), "Send at least one field to change.");

const notFound = () => new HttpError(404, "not_found", "No such day off.");

export async function blockedRangesRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/blocked-ranges", async (req) => (await listBlockedRanges(app.db, req.familyId)).map(toBlockedRangeJson));

  app.post("/api/blocked-ranges", async (req, reply) => {
    const b = parseBody(CreateBody, req.body);
    checkDateOrder(b.startDate, b.endDate, MAX_BLOCKED_DAYS);
    const row = await withTransaction(app.db, async (c) => {
      await checkRefs(c, req.familyId, { childIds: b.childIds ?? [] });
      const id = await createBlockedRange(c, req.familyId, {
        label: b.label ?? null, kind: b.kind ?? "vacation", startDate: b.startDate, endDate: b.endDate, childIds: b.childIds ?? [],
      });
      return (await getBlockedRange(c, req.familyId, id))!;
    });
    return reply.code(201).send(toBlockedRangeJson(row));
  });

  app.patch<{ Params: { id: string } }>("/api/blocked-ranges/:id", async (req) => {
    if (!UUID_RE.test(req.params.id)) throw notFound();
    const p = parseBody(PatchBody, req.body);
    const row = await withTransaction(app.db, async (c) => {
      const cur = await lockBlockedRange(c, req.familyId, req.params.id);
      if (!cur) throw notFound();
      checkDateOrder(p.startDate ?? cur.start_date, p.endDate ?? cur.end_date, MAX_BLOCKED_DAYS);
      await checkRefs(c, req.familyId, { childIds: p.childIds ?? [] });
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
