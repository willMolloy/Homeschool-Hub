/**
 * GET /api/plan?from=YYYY-MM-DD&to=YYYY-MM-DD[&asOf=YYYY-MM-DD]   (S1-35)
 * Recomputes every plan from rows on each request (rates are never stored) and trims `days` to [from, to].
 */
import type { FastifyInstance } from "fastify";
import { ENGINE_VERSION, EngineInputError, planAll, toDayNumber, type ChildPlan } from "@hh/engine";
import { HttpError } from "../app";
import { loadPlanInputs } from "../plan/loadPlanInputs";

/** Longest range one request may ask for, counting both ends. A school year is ~300 days. */
export const MAX_PLAN_RANGE_DAYS = 400;

export interface PlanResponse {
  engineVersion: string;
  asOf: string;
  from: string;
  to: string;
  plans: ChildPlan[];
}

/** Today's date in `timeZone`, as YYYY-MM-DD. The server's own clock zone is never used. */
export function localToday(timeZone: string, now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

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

    if (!asOf) {
      const { rows } = await app.db.query<{ time_zone: string }>("SELECT time_zone FROM family WHERE id = $1", [req.familyId]);
      if (!rows[0]) throw new HttpError(401, "unauthenticated", "Your family no longer exists.");
      asOf = localToday(rows[0].time_zone);
    }

    const { assignments, ctx } = await loadPlanInputs(app.db, req.familyId);
    const plans = planAll(assignments, { ...ctx, asOf }).map((p) => ({
      ...p,
      days: p.days.filter((d) => d.date >= from && d.date <= to),
    }));
    return { engineVersion: ENGINE_VERSION, asOf, from, to, plans };
  });
}
