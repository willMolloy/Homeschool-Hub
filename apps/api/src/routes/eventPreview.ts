/**
 * POST /api/plan/preview-event (S5-01): how a draft event (new, or an edit of `eventId`) would change each affected
 * assignment's daily amount and end date. Plans twice from one load of the inputs; nothing is written.
 */
import type { FastifyInstance } from "fastify";
import { diffDays, EPS, planAll, type ChildPlan, type RecurringEvent, type SubjectRule, type UnitType, type Weekday } from "@hh/engine";
import { z } from "zod";
import { HttpError } from "../http/errors";
import { familyToday } from "../http/today";
import { parseBody, UUID_RE } from "../http/validate";
import { query } from "../db";
import { FamilyNotFoundError, loadPlanInputs } from "../plan/loadPlanInputs";
import { getEvent } from "../repos/eventRepo";
import { checkRefs } from "../repos/refs";
import { CreateBody, checkOrder, notFound } from "./events";

/** Most rows one preview returns. */
export const MAX_PREVIEW_ROWS = 20;

const Body = z.strictObject({ event: z.unknown(), eventId: z.string("eventId must be an id.").optional() });

export interface PreviewSide {
  /** Typical units on a full-capacity school day from today on, to one decimal. */
  perDay: number;
  end: string;
}
export interface PreviewRow {
  assignmentId: string;
  childId: string;
  title: string;
  childName: string;
  unitType: UnitType;
  before: PreviewSide;
  after: PreviewSide;
}
export interface EventPreviewResponse {
  changes: PreviewRow[];
  /** Changed rows beyond the 20 returned. */
  more: number;
}

const oneDecimal = (n: number): number => Math.round(n * 10) / 10;
/** S7-06: some of the plan's units fall on or after `asOf` (a finished assignment, or one that ended earlier, has none). */
const hasWorkFrom = (p: ChildPlan, asOf: string): boolean => p.days.some((d) => d.date >= asOf && d.units > EPS);
const side = (p: ChildPlan): PreviewSide => ({ perDay: oneDecimal(p.rate), end: p.end });

/** How big a change is, relative to what it was: the share of the daily amount, or of the time left to the old end. */
function relativeChange(b: ChildPlan, a: ChildPlan, asOf: string): number {
  const rate = Math.abs(a.rate - b.rate) / Math.max(b.rate, 0.1);
  const end = Math.abs(diffDays(b.end, a.end)) / Math.max(1, diffDays(asOf, b.end));
  return Math.max(rate, end);
}

export async function eventPreviewRoutes(app: FastifyInstance): Promise<void> {
  app.post("/api/plan/preview-event", async (req): Promise<EventPreviewResponse> => {
    const body = parseBody(Body, req.body);
    const b = parseBody(CreateBody, body.event);
    checkOrder(b.startDate, b.endDate);
    const subjectRules = b.subjectRules ?? (Object.create(null) as Record<string, SubjectRule>);
    const childIds = b.childIds ?? [];

    let editing: string | null = null;
    let linked: string[] = [];
    if (body.eventId !== undefined) {
      if (!UUID_RE.test(body.eventId)) throw notFound();
      const cur = await getEvent(app.db, req.familyId, body.eventId);
      if (!cur) throw notFound();
      editing = cur.id;
      linked = cur.child_ids;
    }
    // As the edit route does: children already linked may stay even if archived since; new ones must be active.
    await checkRefs(app.db, req.familyId, { subjectIds: Object.keys(subjectRules), childIds: childIds.filter((id) => !linked.includes(id)) });

    let inputs;
    try {
      inputs = await loadPlanInputs(app.db, req.familyId);
    } catch (e) {
      if (e instanceof FamilyNotFoundError) throw new HttpError(401, "unauthenticated", "Your family no longer exists.");
      throw e;
    }
    const { assignments, ctx, timeZone } = inputs;
    const asOf = familyToday(req, timeZone);

    // Archived children drop out of planning (as in loadPlanInputs); an event left with none of its children is skipped.
    const names = await query<{ id: string; name: string; archived: boolean }>(app.db,
      "SELECT id, name, archived_at IS NOT NULL AS archived FROM child WHERE family_id = $1", [req.familyId]);
    const active = new Set(names.filter((c) => !c.archived).map((c) => c.id));
    const kept = childIds.filter((id) => active.has(id));
    const others = ctx.events.filter((e) => e.id !== editing);
    const draft: RecurringEvent[] = childIds.length > 0 && kept.length === 0 ? [] : [{
      id: editing ?? "preview", name: b.name, childIds: kept,
      weekdays: [...b.weekdays].sort((x, y) => x - y) as Weekday[],
      start: b.startDate ?? null, end: b.endDate ?? null, capacityFraction: b.capacityFraction ?? 0.5,
      subjectRules, defaultRule: b.defaultRule ?? "normal",
    }];

    const before = planAll(assignments, { ...ctx, asOf });
    const after = planAll(assignments, { ...ctx, events: [...others, ...draft], asOf });
    const was = new Map(before.map((p) => [`${p.assignmentId}/${p.childId}`, p]));
    const title = new Map(assignments.map((a) => [a.id, a.title]));
    const childName = new Map(names.map((c) => [c.id, c.name]));

    const rows: { row: PreviewRow; size: number }[] = [];
    for (const a of after) {
      const o = was.get(`${a.assignmentId}/${a.childId}`);
      if (!o) continue;
      if (!hasWorkFrom(o, asOf) && !hasWorkFrom(a, asOf)) continue; // S7-06: nothing left to do from today on
      const bs = side(o);
      const as = side(a);
      if (Math.abs(as.perDay - bs.perDay) < 0.05 && as.end === bs.end) continue;
      rows.push({
        size: relativeChange(o, a, asOf),
        row: {
          assignmentId: a.assignmentId, childId: a.childId, title: title.get(a.assignmentId) ?? "", childName: childName.get(a.childId) ?? "",
          unitType: a.unitType, before: bs, after: as,
        },
      });
    }
    rows.sort((x, y) => y.size - x.size || x.row.title.localeCompare(y.row.title) || x.row.childName.localeCompare(y.row.childName)
      || x.row.assignmentId.localeCompare(y.row.assignmentId) || x.row.childId.localeCompare(y.row.childId));
    return { changes: rows.slice(0, MAX_PREVIEW_ROWS).map((r) => r.row), more: Math.max(0, rows.length - MAX_PREVIEW_ROWS) };
  });
}
