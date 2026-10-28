/**
 * Recurring events with per-subject rules and the children they apply to (S2a-08..10).
 * Every query is scoped by family_id. Archive instead of delete. No children = the whole family.
 */
import type { SubjectRule } from "@hh/engine";
import type { Queryable } from "../db";

export interface EventRow {
  id: string;
  name: string;
  weekdays: number[];
  start_date: string | null;
  end_date: string | null;
  capacity_fraction: number;
  default_rule: SubjectRule;
  archived_at: Date | null;
  subject_rules: Record<string, SubjectRule>;
  child_ids: string[];
}

export interface EventJson {
  id: string;
  name: string;
  weekdays: number[];
  /** null = open-ended. */
  startDate: string | null;
  endDate: string | null;
  capacityFraction: number;
  defaultRule: SubjectRule;
  /** subjectId → rule; subjects not listed use defaultRule. */
  subjectRules: Record<string, SubjectRule>;
  /** [] = the whole family. */
  childIds: string[];
  archived: boolean;
}

export function toEventJson(r: EventRow): EventJson {
  return {
    id: r.id, name: r.name, weekdays: [...r.weekdays].sort((a, b) => a - b), startDate: r.start_date, endDate: r.end_date,
    capacityFraction: r.capacity_fraction, defaultRule: r.default_rule,
    // Copy into a null-prototype object so no key can reach Object.prototype.
    subjectRules: Object.assign(Object.create(null) as Record<string, SubjectRule>, r.subject_rules),
    childIds: r.child_ids, archived: r.archived_at !== null,
  };
}

const SELECT = `
  SELECT e.id, e.name, e.weekdays, e.start_date, e.end_date, e.capacity_fraction, e.default_rule, e.archived_at,
         COALESCE((SELECT json_object_agg(r.subject_id, r.rule ORDER BY r.subject_id)
                     FROM event_subject_rule r WHERE r.event_id = e.id), '{}'::json) AS subject_rules,
         COALESCE((SELECT array_agg(ec.child_id ORDER BY c.sort_order, c.id)
                     FROM event_child ec JOIN child c ON c.id = ec.child_id
                    WHERE ec.event_id = e.id), '{}') AS child_ids
    FROM event e`;

/** The family's events by name, id. Archived ones only when asked. */
export async function listEvents(db: Queryable, familyId: string, includeArchived = false): Promise<EventRow[]> {
  const { rows } = await db.query<EventRow>(
    `${SELECT} WHERE e.family_id = $1 AND ($2::boolean OR e.archived_at IS NULL) ORDER BY lower(e.name), e.id`, [familyId, includeArchived]);
  return rows;
}

export async function getEvent(db: Queryable, familyId: string, id: string): Promise<EventRow | null> {
  const { rows } = await db.query<EventRow>(`${SELECT} WHERE e.family_id = $1 AND e.id = $2`, [familyId, id]);
  return rows[0] ?? null;
}
