/**
 * GET /api/plan?from=YYYY-MM-DD&to=YYYY-MM-DD[&asOf=YYYY-MM-DD]   (S1-35)
 * Recomputes every plan from rows on each request (rates are never stored) and trims `days` to [from, to].
 */
import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { capacityDays, ENGINE_VERSION, EngineInputError, planAll, toDayNumber, type ChildPlan, type Weekday } from "@hh/engine";
import { HttpError } from "../http/errors";
import { checkDateOrder, IdList, LocalDate, MAX_ASSIGNMENT_DAYS, Weekdays } from "../http/scheduleLimits";
import { parseBody, UUID_RE } from "../http/validate";
import { requireOwned } from "../repos/refs";
import { familyToday } from "../http/today";
import { FamilyNotFoundError, loadPlanInputs, type PlanInputs } from "../plan/loadPlanInputs";

/** Longest range one request may ask for, counting both ends. A school year is ~300 days. */
export const MAX_PLAN_RANGE_DAYS = 400;

export interface PlanResponse {
  engineVersion: string;
  asOf: string;
  from: string;
  to: string;
  plans: ChildPlan[];
}

/** S7b-10: up to this many drafts in one POST /api/plan/pace (a list of assignments asks for all of its cards at once). */
const MAX_PACE_DRAFTS = 500;
const PaceBody = z.strictObject({
  drafts: z.array(z.strictObject({
    subjectId: z.string().regex(UUID_RE, "subjectId must be a UUID.").transform((x) => x.toLowerCase()).nullable(),
    childIds: IdList(20).refine((ids) => ids.length > 0, "Pick at least one child."),
    startDate: LocalDate,
    endDate: LocalDate,
    weekdays: Weekdays.nullable(),
  })).min(1, "Send at least one draft.").max(MAX_PACE_DRAFTS, `At most ${MAX_PACE_DRAFTS} drafts.`),
});

function dayParam(q: Record<string, unknown>, name: string, required: boolean): string | undefined {
  const v = q[name];
  if (v === undefined || v === "") {
    if (required) throw new HttpError(400, "invalid_request", `"${name}" is required (YYYY-MM-DD).`);
    return undefined;
  }
  if (typeof v !== "string") throw new HttpError(400, "invalid_request", `"${name}" must be given once (YYYY-MM-DD).`);
  try {
    toDayNumber(v);
  } catch (e) {
    if (e instanceof EngineInputError) throw new HttpError(400, "invalid_date", `"${name}" is not a real date: ${JSON.stringify(v)}.`);
    throw e;
  }
  return v;
}

export async function planRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/plan", async (req): Promise<PlanResponse> => {
    const q = (req.query ?? {}) as Record<string, unknown>;
    const from = dayParam(q, "from", true)!;
    const to = dayParam(q, "to", true)!;
    let asOf = dayParam(q, "asOf", false);
    const span = toDayNumber(to) - toDayNumber(from) + 1;
    if (span < 1) throw new HttpError(400, "invalid_range", `"from" must be on or before "to".`);
    if (span > MAX_PLAN_RANGE_DAYS) throw new HttpError(400, "range_too_long", `Ask for at most ${MAX_PLAN_RANGE_DAYS} days at a time.`);

    let inputs: PlanInputs;
    try {
      inputs = await loadPlanInputs(app.db, req.familyId);
    } catch (e) {
      if (e instanceof FamilyNotFoundError) throw new HttpError(401, "unauthenticated", "Your family no longer exists.");
      throw e;
    }
    const { assignments, ctx, timeZone } = inputs;
    asOf ??= familyToday(req, timeZone);

    const plans = planAll(assignments, { ...ctx, asOf }).map((p) => ({
      ...p,
      days: p.days.filter((d) => d.date >= from && d.date <= to),
    }));
    return { engineVersion: ENGINE_VERSION, asOf, from, to, plans };
  });

  /**
   * S7b-10: the full days of work each draft assignment really has for each child (school days on its own days, minus days
   * off, event skips and lighter days), the same count the plan spreads over. The form turns it into "pages a day" and
   * minutes; nothing is saved. `capacityDays` is the smallest across the children (the busiest child sets the pace).
   */
  app.post("/api/plan/pace", async (req) => {
    const { drafts } = parseBody(PaceBody, req.body);
    for (const d of drafts) checkDateOrder(d.startDate, d.endDate, MAX_ASSIGNMENT_DAYS);
    // S17-02: a child or subject that is not this family's is a 404, not an answer built from nothing.
    await requireOwned(app.db, req.familyId, {
      childIds: drafts.flatMap((d) => d.childIds), subjectIds: drafts.flatMap((d) => (d.subjectId ? [d.subjectId] : [])),
    });
    let inputs: PlanInputs;
    try {
      inputs = await loadPlanInputs(app.db, req.familyId);
    } catch (e) {
      if (e instanceof FamilyNotFoundError) throw new HttpError(401, "unauthenticated", "Your family no longer exists.");
      throw e;
    }
    const { calendar, ctx } = inputs;
    const paces = drafts.map((d) => {
      const perChild = d.childIds.map((childId) => ({
        childId,
        capacityDays: capacityDays({
          calendar, events: ctx.events, blocked: ctx.blocked, subjectWeekdays: ctx.subjectWeekdays, subjectId: d.subjectId, childId,
          start: d.startDate, end: d.endDate, weekdays: d.weekdays as Weekday[] | null,
        }),
      }));
      return { capacityDays: Math.min(...perChild.map((c) => c.capacityDays)), perChild };
    });
    return { paces };
  });
}
