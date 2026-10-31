/** /api/calendar-templates (S5-06): a family's saved calendar templates, for "Save this year as a template" (S5-07). */
import type { FastifyInstance } from "fastify";
import { BLOCKED_KINDS, humanList } from "@hh/engine";
import { z } from "zod";
import { HttpError } from "../http/errors";
import { parseBody, UUID_RE } from "../http/validate";
import { createCalendarTemplate, deleteCalendarTemplate, listCalendarTemplates } from "../repos/calendarTemplateRepo";

export const MAX_TEMPLATE_NAME = 60;
export const MAX_TEMPLATE_BREAKS = 100;
/** A break starts at most this many days after the year's first day, and lasts 1 to 60 days. */
export const MAX_TEMPLATE_OFFSET = 400;
export const MAX_TEMPLATE_LENGTH = 60;

const noNul = (s: string) => !s.includes("\u0000");
const Name = z.string("name must be text.").trim().min(1, "Name is required.").max(MAX_TEMPLATE_NAME, `Name must be ${MAX_TEMPLATE_NAME} characters or fewer.`)
  .refine(noNul, "Name can't contain a NUL character.");
/** Like a day off's label: trimmed, up to 60, blank = none. */
const Label = z.string("label must be text.").trim().max(60, "Label must be 60 characters or fewer.").refine(noNul, "Label can't contain a NUL character.")
  .transform((s) => (s === "" ? null : s)).nullable();
const whole = (label: string, min: number, max: number) =>
  z.number(`${label} must be a number.`).int(`${label} must be a whole number.`).min(min, `${label} must be at least ${min}.`).max(max, `${label} must be at most ${max}.`);

const Break = z.strictObject({
  offsetDays: whole("offsetDays", 0, MAX_TEMPLATE_OFFSET),
  lengthDays: whole("lengthDays", 1, MAX_TEMPLATE_LENGTH),
  label: Label,
  kind: z.enum(BLOCKED_KINDS, `kind must be ${humanList(BLOCKED_KINDS)}.`),
});
const CreateBody = z.strictObject({
  name: Name,
  breaks: z.array(Break, "breaks must be a list.").min(1, "Send at least one break.").max(MAX_TEMPLATE_BREAKS, `Send at most ${MAX_TEMPLATE_BREAKS} breaks.`),
});

export async function calendarTemplatesRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/calendar-templates", async (req) => listCalendarTemplates(app.db, req.familyId));

  app.post("/api/calendar-templates", async (req, reply) => {
    const b = parseBody(CreateBody, req.body);
    return reply.code(201).send(await createCalendarTemplate(app.db, req.familyId, b.name, b.breaks));
  });

  app.delete<{ Params: { id: string } }>("/api/calendar-templates/:id", async (req, reply) => {
    const notFound = () => new HttpError(404, "not_found", "No such template.");
    if (!UUID_RE.test(req.params.id)) throw notFound();
    if (!(await deleteCalendarTemplate(app.db, req.familyId, req.params.id))) throw notFound();
    return reply.code(204).send();
  });
}
