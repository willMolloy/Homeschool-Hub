/** /api/events (S2a-08..10): recurring events such as co-op or piano. */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { HttpError } from "../app";
import { withTransaction } from "../db";
import { CapacityFraction, checkDateOrder, IdList, LocalDate, MAX_TITLE, Weekdays } from "../http/scheduleLimits";
import { parseBody, UUID_RE } from "../http/validate";
import { createEvent, getEvent, listEvents, lockEvent, toEventJson, updateEvent } from "../repos/eventRepo";
import { checkRefs } from "../repos/refs";

const ListQuery = z.object({ includeArchived: z.enum(["true", "false"]).optional() });

export const MAX_RULES = 100;

const Name = z.string("name must be text.").trim().min(1, "Name is required.").max(MAX_TITLE, `Name must be ${MAX_TITLE} characters or fewer.`)
  .refine((s) => !s.includes("\u0000"), "Name can't contain a NUL character.");
const Rule = z.enum(["skip", "lighter", "normal"], "Rules are skip, lighter or normal.");
/**
 * subjectId → rule. Checked by hand (not z.record) so that only own keys are read, every key must be a UUID
 * (which also rules out `__proto__`/`constructor`), and the result is a null-prototype object.
 */
const SubjectRules = z.unknown().transform((v, ctx) => {
  if (typeof v !== "object" || v === null || Array.isArray(v)) {
    ctx.addIssue({ code: "custom", message: "subjectRules must be an object of subjectId → rule." });
    return z.NEVER;
  }
  const keys = Object.keys(v);
  if (keys.length > MAX_RULES) {
    ctx.addIssue({ code: "custom", message: `At most ${MAX_RULES} subject rules.` });
    return z.NEVER;
  }
  const out = Object.create(null) as Record<string, "skip" | "lighter" | "normal">;
  for (const k of keys) {
    if (!UUID_RE.test(k)) {
      ctx.addIssue({ code: "custom", message: "subjectRules keys must be subject ids." });
      return z.NEVER;
    }
    const rule = Rule.safeParse((v as Record<string, unknown>)[k]);
    if (!rule.success) {
      ctx.addIssue({ code: "custom", message: "Rules are skip, lighter or normal." });
      return z.NEVER;
    }
    const id = k.toLowerCase();
    if (id in out) {
      ctx.addIssue({ code: "custom", message: "A subject can only have one rule." });
      return z.NEVER;
    }
    out[id] = rule.data;
  }
  return out;
});
// [] = the whole family.
const Children = IdList(20);

const CreateBody = z.object({
  name: Name,
  weekdays: Weekdays,
  startDate: LocalDate.nullable().optional(),
  endDate: LocalDate.nullable().optional(),
  capacityFraction: CapacityFraction.optional(),
  defaultRule: Rule.optional(),
  subjectRules: SubjectRules.optional(),
  childIds: Children.optional(),
});

const PatchBody = z
  .object({
    name: Name.optional(),
    weekdays: Weekdays.optional(),
    startDate: LocalDate.nullable().optional(),
    endDate: LocalDate.nullable().optional(),
    capacityFraction: CapacityFraction.optional(),
    defaultRule: Rule.optional(),
    subjectRules: SubjectRules.optional(),
    childIds: Children.optional(),
    archived: z.boolean("archived must be true or false.").optional(),
  })
  .refine((b) => Object.values(b).some((v) => v !== undefined), "Send at least one field to change.");

const notFound = () => new HttpError(404, "not_found", "No such event.");

/** Open-ended events have no length limit; only the order is checked. */
const checkOrder = (start: string | null | undefined, end: string | null | undefined) => {
  if (start && end) checkDateOrder(start, end, Number.POSITIVE_INFINITY);
};

export async function eventsRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/events", async (req) => {
    const q = ListQuery.safeParse(req.query);
    const includeArchived = q.success && q.data.includeArchived === "true";
    return (await listEvents(app.db, req.familyId, includeArchived)).map(toEventJson);
  });

  app.post("/api/events", async (req, reply) => {
    const b = parseBody(CreateBody, req.body);
    checkOrder(b.startDate, b.endDate);
    const subjectRules = b.subjectRules ?? (Object.create(null) as Record<string, "skip" | "lighter" | "normal">);
    const row = await withTransaction(app.db, async (c) => {
      await checkRefs(c, req.familyId, { subjectIds: Object.keys(subjectRules), childIds: b.childIds ?? [] });
      const id = await createEvent(c, req.familyId, {
        name: b.name, weekdays: b.weekdays, startDate: b.startDate ?? null, endDate: b.endDate ?? null,
        capacityFraction: b.capacityFraction ?? 0.5, defaultRule: b.defaultRule ?? "normal", subjectRules, childIds: b.childIds ?? [],
      });
      return (await getEvent(c, req.familyId, id))!;
    });
    return reply.code(201).send(toEventJson(row));
  });

  app.patch<{ Params: { id: string } }>("/api/events/:id", async (req) => {
    if (!UUID_RE.test(req.params.id)) throw notFound();
    const p = parseBody(PatchBody, req.body);
    const row = await withTransaction(app.db, async (c) => {
      const cur = await lockEvent(c, req.familyId, req.params.id);
      if (!cur) throw notFound();
      // Merged dates: `null` clears, `undefined` keeps.
      checkOrder(p.startDate === undefined ? cur.start_date : p.startDate, p.endDate === undefined ? cur.end_date : p.endDate);
      // Sent rules/children replace the set, so every one of them must be active now.
      await checkRefs(c, req.familyId, { subjectIds: p.subjectRules ? Object.keys(p.subjectRules) : [], childIds: p.childIds ?? [] });
      await updateEvent(c, req.familyId, cur.id, p);
      return (await getEvent(c, req.familyId, cur.id))!;
    });
    return toEventJson(row);
  });
}
