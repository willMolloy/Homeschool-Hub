/** /api/blocked-ranges (S2a-07): vacations and other days off; POST /api/blocked-ranges/bulk (S5-04). */
import type { FastifyInstance } from "fastify";
import { BLOCKED_KINDS, breakUndoName, humanList } from "@hh/engine";
import { z } from "zod";
import { HttpError } from "../http/errors";
import { withTransaction, type Tx } from "../db";
import { checkDateOrder, IdList, LocalDate, MAX_BLOCKED_DAYS, requireBreakName } from "../http/scheduleLimits";
import { parseBody, UUID_RE } from "../http/validate";
import {
  createBlockedRange, deleteBlockedRange, getBlockedRange, listBlockedRanges, lockBlockedRange, toBlockedRangeJson, updateBlockedRange, type BlockedRangeRow,
} from "../repos/blockedRangeRepo";
import { checkRefs } from "../repos/refs";
import { applyBreakAdjustments } from "../services/breakAdjustments";
import { recordUndo, type BlockedRangeState, type UndoStep } from "../services/undoService";

/** Optional label: trimmed, ≤ 60, no NUL; blank → null. */
const Label = z.string("label must be text.").trim().max(60, "Label must be 60 characters or fewer.")
  .refine((s) => !s.includes("\u0000"), "Label can't contain a NUL character.")
  .transform((s) => (s === "" ? null : s));
const Kind = z.enum(BLOCKED_KINDS, `kind must be ${humanList(BLOCKED_KINDS)}.`);
// [] = the whole family.
const Children = IdList(20);

/** S21-02: present when she confirmed the overlap sheet. Empty means every book keeps its end. A push is S21-03. */
const Adjustments = z.array(z.strictObject({
  assignmentId: z.string().regex(UUID_RE, "assignmentId must be a UUID.").transform((s) => s.toLowerCase()),
  endDate: LocalDate,
})).max(200, "At most 200 books.").optional();

const RangeBody = z.strictObject({
  label: Label.nullable().optional(),
  kind: Kind.optional(),
  startDate: LocalDate,
  endDate: LocalDate,
  childIds: Children.optional(),
});
const CreateBody = RangeBody.extend({ adjustments: Adjustments });
/** S5-04: the most days off one bulk request may create. */
const MAX_BULK = 100;
const BulkBody = z.strictObject({
  blockedRanges: z.array(z.unknown(), "Must be a list.").min(1, "Send at least one day off.").max(MAX_BULK, `Send at most ${MAX_BULK} days off.`),
  adjustments: Adjustments,
});
type CreateInput = z.infer<typeof RangeBody>;

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
  .strictObject({
    label: Label.nullable().optional(), kind: Kind.optional(), startDate: LocalDate.optional(), endDate: LocalDate.optional(), childIds: Children.optional(),
    adjustments: Adjustments,
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), "Send at least one field to change.");

const notFound = () => new HttpError(404, "not_found", "No such day off.");

/**
 * S21-04: a sheet confirm is one undo, named for the break. A save that overlapped nothing keeps the old wording.
 * Several breaks in one save are "Added N breaks".
 */
function sheetLabel(action: "Added" | "Updated", label: string | null, start: string, count: number, fromSheet: boolean): string {
  if (!fromSheet) {
    if (action === "Updated") return "Changed a day off";
    return count === 1 ? "Added a day off" : `Added ${count} days off`;
  }
  if (action === "Added" && count > 1) return `Added ${count} breaks`;
  return `${action} ${breakUndoName(label, start)}`;
}

/** S6-06: what to put back for a day off (its fields and children as they were). */
const stateOf = (r: BlockedRangeRow): BlockedRangeState => ({ label: r.label, kind: r.kind, startDate: r.start_date, endDate: r.end_date, childIds: r.child_ids });

export async function blockedRangesRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/blocked-ranges", async (req) => (await listBlockedRanges(app.db, req.familyId)).map(toBlockedRangeJson));

  app.post("/api/blocked-ranges", async (req, reply) => {
    const b = parseBody(CreateBody, req.body);
    checkDateOrder(b.startDate, b.endDate, MAX_BLOCKED_DAYS);
    requireBreakName(b.startDate, b.endDate, b.label);
    const row = await withTransaction(app.db, async (c) => {
      const created = await createOne(c, req.familyId, b);
      const steps: UndoStep[] = [{ op: "blockedRange", id: created.id, set: null }];
      if (b.adjustments?.length) steps.push(...await applyBreakAdjustments(c, req.familyId, b.adjustments, [b]));
      await recordUndo(c, req.familyId, sheetLabel("Added", created.label, created.start_date, 1, b.adjustments !== undefined), steps);
      return created;
    });
    return reply.code(201).send(toBlockedRangeJson(row));
  });

  app.post("/api/blocked-ranges/bulk", async (req, reply) => {
    const { blockedRanges, adjustments } = parseBody(BulkBody, req.body);
    // Every item is validated before anything is written.
    const items: CreateInput[] = [];
    for (const [i, raw] of blockedRanges.entries()) {
      items.push(await atPosition(i + 1, () => {
        const b = parseBody(RangeBody, raw);
        checkDateOrder(b.startDate, b.endDate, MAX_BLOCKED_DAYS);
        requireBreakName(b.startDate, b.endDate, b.label);
        return b;
      }));
    }
    const rows = await withTransaction(app.db, async (c) => {
      const created = [];
      for (const [i, b] of items.entries()) created.push(await atPosition(i + 1, () => createOne(c, req.familyId, b)));
      const steps: UndoStep[] = created.map((r) => ({ op: "blockedRange", id: r.id, set: null }));
      if (adjustments?.length) {
        steps.push(...await applyBreakAdjustments(c, req.familyId, adjustments, created.map((r) => ({ startDate: r.start_date, endDate: r.end_date }))));
      }
      const first = created[0]!;
      await recordUndo(c, req.familyId, sheetLabel("Added", first.label, first.start_date, created.length, adjustments !== undefined), steps);
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
      const startDate = p.startDate ?? cur.start_date;
      const endDate = p.endDate ?? cur.end_date;
      checkDateOrder(startDate, endDate, MAX_BLOCKED_DAYS);
      requireBreakName(startDate, endDate, p.label !== undefined ? p.label : cur.label);
      // Children already linked may stay even if archived since (the forms keep them ticked); new ones must be active.
      await checkRefs(c, req.familyId, { childIds: (p.childIds ?? []).filter((id) => !cur.child_ids.includes(id)) });
      await updateBlockedRange(c, req.familyId, cur.id, p);
      const after = (await getBlockedRange(c, req.familyId, cur.id))!;
      const steps: UndoStep[] = [];
      if (JSON.stringify(stateOf(cur)) !== JSON.stringify(stateOf(after))) steps.push({ op: "blockedRange", id: cur.id, set: stateOf(cur) });
      if (p.adjustments?.length) {
        steps.push(...await applyBreakAdjustments(c, req.familyId, p.adjustments, [{ startDate: after.start_date, endDate: after.end_date }]));
      }
      if (steps.length) {
        await recordUndo(c, req.familyId, sheetLabel("Updated", after.label, after.start_date, 1, p.adjustments !== undefined), steps);
      }
      return after;
    });
    return toBlockedRangeJson(row);
  });

  app.delete<{ Params: { id: string } }>("/api/blocked-ranges/:id", async (req, reply) => {
    if (!UUID_RE.test(req.params.id)) throw notFound();
    await withTransaction(app.db, async (c) => {
      const cur = await lockBlockedRange(c, req.familyId, req.params.id);
      if (!cur) throw notFound();
      await deleteBlockedRange(c, req.familyId, cur.id);
      await recordUndo(c, req.familyId, "Removed a day off", [{ op: "blockedRange", id: cur.id, set: stateOf(cur) }]);
    });
    return reply.code(204).send();
  });
}
