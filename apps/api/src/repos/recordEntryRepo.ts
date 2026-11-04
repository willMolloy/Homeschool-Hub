/** S9-07: record_entry rows (what a parent typed into the log). One row per child per entry. */
import type { Queryable, Tx } from "../db";

export interface RecordEntryRow {
  id: string;
  family_id: string;
  child_id: string;
  start_date: string;
  end_date: string;
  counts_school_day: boolean;
  school_days: number;
  subject_minutes: Record<string, number>;
  total_minutes: number | null;
  home_minutes: number | null;
  away_minutes: number | null;
  notes: string | null;
  books: string[];
}

export interface RecordEntryJson {
  id: string;
  childId: string;
  startDate: string;
  endDate: string;
  countsSchoolDay: boolean;
  /** How many days the entry counts (0 when the switch is off). */
  schoolDays: number;
  subjectMinutes: Record<string, number>;
  totalMinutes: number | null;
  homeMinutes: number | null;
  awayMinutes: number | null;
  notes: string | null;
  books: string[];
}

/** What an entry holds, as the API and the undo step carry it (no ids of its own besides the entry's). */
export interface RecordEntryState {
  childId: string;
  startDate: string;
  endDate: string;
  countsSchoolDay: boolean;
  schoolDays: number;
  subjectMinutes: Record<string, number>;
  totalMinutes: number | null;
  homeMinutes: number | null;
  awayMinutes: number | null;
  notes: string | null;
  books: string[];
}

// dates come back as 'YYYY-MM-DD' strings (the pool parses date as text, like the other repos)
const COLS = `id, family_id, child_id, start_date::text AS start_date, end_date::text AS end_date, counts_school_day, school_days,
  subject_minutes, total_minutes, home_minutes, away_minutes, notes, books`;

export const toJson = (r: RecordEntryRow): RecordEntryJson => ({
  id: r.id, childId: r.child_id, startDate: r.start_date, endDate: r.end_date, countsSchoolDay: r.counts_school_day, schoolDays: r.school_days,
  subjectMinutes: r.subject_minutes, totalMinutes: r.total_minutes, homeMinutes: r.home_minutes, awayMinutes: r.away_minutes, notes: r.notes, books: r.books,
});

export const stateOf = (r: RecordEntryRow): RecordEntryState => ({
  childId: r.child_id, startDate: r.start_date, endDate: r.end_date, countsSchoolDay: r.counts_school_day, schoolDays: r.school_days,
  subjectMinutes: r.subject_minutes, totalMinutes: r.total_minutes, homeMinutes: r.home_minutes, awayMinutes: r.away_minutes, notes: r.notes, books: r.books,
});

export interface ListFilter { from?: string; to?: string; childId?: string }

/** The family's entries, newest first (by first day, then when they were saved). A range keeps entries whose first day is in it. */
export async function listEntries(db: Queryable, familyId: string, f: ListFilter = {}): Promise<RecordEntryRow[]> {
  const { rows } = await db.query<RecordEntryRow>(
    `SELECT ${COLS} FROM record_entry
      WHERE family_id = $1 AND ($2::date IS NULL OR start_date >= $2) AND ($3::date IS NULL OR start_date <= $3) AND ($4::uuid IS NULL OR child_id = $4)
      ORDER BY start_date DESC, created_at DESC, id`,
    [familyId, f.from ?? null, f.to ?? null, f.childId ?? null]);
  return rows;
}

export async function lockEntry(tx: Tx, familyId: string, id: string): Promise<RecordEntryRow | undefined> {
  const { rows } = await tx.query<RecordEntryRow>(`SELECT ${COLS} FROM record_entry WHERE id = $1 AND family_id = $2 FOR UPDATE`, [id, familyId]);
  return rows[0];
}

export async function insertEntry(tx: Tx, familyId: string, s: RecordEntryState, id?: string): Promise<RecordEntryRow> {
  const { rows } = await tx.query<RecordEntryRow>(
    `INSERT INTO record_entry (id, family_id, child_id, start_date, end_date, counts_school_day, school_days, subject_minutes, total_minutes, home_minutes, away_minutes, notes, books)
     VALUES (COALESCE($1::uuid, gen_random_uuid()), $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10, $11, $12, $13::jsonb)
     RETURNING ${COLS}`,
    [id ?? null, familyId, s.childId, s.startDate, s.endDate, s.countsSchoolDay, s.schoolDays, JSON.stringify(s.subjectMinutes), s.totalMinutes, s.homeMinutes, s.awayMinutes, s.notes, JSON.stringify(s.books)]);
  return rows[0]!;
}

export async function replaceEntry(tx: Tx, familyId: string, id: string, s: RecordEntryState): Promise<RecordEntryRow> {
  const { rows } = await tx.query<RecordEntryRow>(
    `UPDATE record_entry SET start_date = $3, end_date = $4, counts_school_day = $5, school_days = $6, subject_minutes = $7::jsonb,
            total_minutes = $8, home_minutes = $9, away_minutes = $10, notes = $11, books = $12::jsonb, updated_at = now()
      WHERE id = $1 AND family_id = $2 RETURNING ${COLS}`,
    [id, familyId, s.startDate, s.endDate, s.countsSchoolDay, s.schoolDays, JSON.stringify(s.subjectMinutes), s.totalMinutes, s.homeMinutes, s.awayMinutes, s.notes, JSON.stringify(s.books)]);
  return rows[0]!;
}

export async function deleteEntry(tx: Tx, familyId: string, id: string): Promise<void> {
  await tx.query("DELETE FROM record_entry WHERE id = $1 AND family_id = $2", [id, familyId]);
}
