/** Saved calendar templates (S5-06). Every query is scoped by family_id. Delete really deletes. */
import type { BlockedKind } from "@hh/engine";
import type { Queryable } from "../db";

/** One break, counted in days from the year's first day. */
export interface TemplateBreak {
  offsetDays: number;
  lengthDays: number;
  label: string | null;
  kind: BlockedKind;
}

export interface CalendarTemplateJson {
  id: string;
  name: string;
  breaks: TemplateBreak[];
}

interface Row {
  id: string;
  name: string;
  breaks: TemplateBreak[];
}

const toJson = (r: Row): CalendarTemplateJson => ({ id: r.id, name: r.name, breaks: r.breaks });

/** The family's templates, oldest first. */
export async function listCalendarTemplates(db: Queryable, familyId: string): Promise<CalendarTemplateJson[]> {
  const { rows } = await db.query<Row>(
    "SELECT id, name, breaks FROM calendar_template WHERE family_id = $1 ORDER BY created_at, id", [familyId]);
  return rows.map(toJson);
}

export async function createCalendarTemplate(db: Queryable, familyId: string, name: string, breaks: TemplateBreak[]): Promise<CalendarTemplateJson> {
  const { rows } = await db.query<Row>(
    "INSERT INTO calendar_template (family_id, name, breaks) VALUES ($1, $2, $3::jsonb) RETURNING id, name, breaks",
    [familyId, name, JSON.stringify(breaks)]);
  return toJson(rows[0]!);
}

/** True when a template of this family was deleted. */
export async function deleteCalendarTemplate(db: Queryable, familyId: string, id: string): Promise<boolean> {
  const { rowCount } = await db.query("DELETE FROM calendar_template WHERE id = $1 AND family_id = $2", [id, familyId]);
  return rowCount === 1;
}
