/**
 * /api/log-entries (S9-07): what a parent typed into the log in Records. One row per child (an entry for several children
 * is stored as one entry each). Nothing is prefilled by the server and nothing here touches the plan: the only thing read
 * from the schedule is the calendar, to count the school days of a run of dates. Edits and deletes leave the family's undo entry.
 */
import type { FastifyInstance } from "fastify";
import { toDayNumber } from "@hh/engine";
import { z } from "zod";
import { withTransaction } from "../db";
import { short } from "../http/checkInDates";
import { HttpError } from "../http/errors";
import { checkDateOrder, IdList, LocalDate } from "../http/scheduleLimits";
import { parseBody, UUID_RE } from "../http/validate";
import { checkRefs } from "../repos/refs";
import {
  deleteEntry, insertEntry, listEntries, lockEntry, replaceEntry, stateOf, toJson, type RecordEntryRow, type RecordEntryState,
} from "../repos/recordEntryRepo";
import { calendarModel, daysCounted } from "../services/recordEntryService";
import { recordUndo } from "../services/undoService";

export const MAX_ENTRY_DAYS = 366;
export const MAX_NOTES = 2000;
export const MAX_BOOKS = 50;
export const MAX_BOOK_TITLE = 200;
const DAY_MINUTES = 24 * 60;

const Minutes = z.number("Hours and minutes must be numbers.").int("Minutes must be whole numbers.").min(0, "Hours can't be negative.").max(DAY_MINUTES * MAX_ENTRY_DAYS, "That is more time than the days hold.");
const NoNul = (s: string) => !s.includes("\u0000");
const SubjectMinutes = z.record(z.string().regex(UUID_RE, "Subject ids must be UUIDs."), Minutes, "subjectMinutes must be an object of minutes by subject.")
  .refine((m) => Object.keys(m).length <= 50, "At most 50 subjects.");
const Notes = z.string("Notes must be text.").trim().max(MAX_NOTES, `Notes can be up to ${MAX_NOTES} characters.`).refine(NoNul, "Notes can't contain a NUL character.")
  .transform((s) => (s === "" ? null : s));
const Books = z.array(z.string("Book titles must be text.").trim().min(1, "A book needs a title.").max(MAX_BOOK_TITLE, `Titles can be up to ${MAX_BOOK_TITLE} characters.`).refine(NoNul, "Titles can't contain a NUL character."))
  .max(MAX_BOOKS, `At most ${MAX_BOOKS} books in one entry.`);

const Typed = {
  subjectMinutes: SubjectMinutes.optional(),
  totalMinutes: Minutes.nullable().optional(),
  homeMinutes: Minutes.nullable().optional(),
  awayMinutes: Minutes.nullable().optional(),
  notes: Notes.nullable().optional(),
  books: Books.optional(),
};

const CreateBody = z.strictObject({
  childIds: IdList(20).refine((c) => c.length >= 1, "Pick at least one child."),
  startDate: LocalDate,
  endDate: LocalDate.optional(),
  countsSchoolDay: z.boolean("countsSchoolDay must be true or false.").optional(),
  ...Typed,
});
const PatchBody = z
  .strictObject({ startDate: LocalDate.optional(), endDate: LocalDate.optional(), countsSchoolDay: z.boolean("countsSchoolDay must be true or false.").optional(), ...Typed })
  .refine((b) => Object.values(b).some((v) => v !== undefined), "Send at least one field to change.");
const ListQuery = z.strictObject({
  from: LocalDate.optional(),
  to: LocalDate.optional(),
  childId: z.string("childId must be one id.").regex(UUID_RE, "childId must be a UUID.").transform((s) => s.toLowerCase()).optional(),
});

const notFound = () => new HttpError(404, "not_found", "No such log entry.");

/** "Hours can't be more than 24 a day": each typed total fits in the days the entry covers. */
function checkHours(s: Pick<RecordEntryState, "startDate" | "endDate" | "subjectMinutes" | "totalMinutes" | "homeMinutes" | "awayMinutes">): void {
  const days = toDayNumber(s.endDate) - toDayNumber(s.startDate) + 1;
  const limit = DAY_MINUTES * days;
  const sum = Object.values(s.subjectMinutes).reduce((a, b) => a + b, 0);
  const tooMuch = (m: number | null) => m !== null && m > limit;
  if (sum > limit || tooMuch(s.totalMinutes) || tooMuch(s.homeMinutes) || tooMuch(s.awayMinutes) || (s.homeMinutes ?? 0) + (s.awayMinutes ?? 0) > limit) {
    throw new HttpError(400, "invalid_hours", `Hours can't be more than 24 a day (${days === 1 ? "that is 24 hours for this day" : `that is ${24 * days} hours for these ${days} days`}).`);
  }
}

/** Every subject named must be one of the family's (an archived one may still be named: it was a subject when it was typed). */
async function checkSubjects(db: Parameters<typeof checkRefs>[0], familyId: string, ids: string[]): Promise<void> {
  if (ids.length === 0) return;
  const { rows } = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM subject WHERE family_id = $1 AND id = ANY($2::uuid[])", [familyId, ids]);
  if (rows[0]!.n !== new Set(ids).size) throw new HttpError(400, "invalid_reference", "subjectMinutes: every subject must be one of yours.");
}

const label = (s: { startDate: string; endDate: string }, who: string) =>
  `${who}'s log for ${s.startDate === s.endDate ? short(s.startDate) : `${short(s.startDate)} to ${short(s.endDate)}`}`;

export async function recordEntriesRoutes(app: FastifyInstance): Promise<void> {
  app.get("/api/log-entries", async (req) => (await listEntries(app.db, req.familyId, parseBody(ListQuery, req.query))).map(toJson));

  app.post("/api/log-entries", async (req, reply) => {
    const b = parseBody(CreateBody, req.body);
    const endDate = b.endDate ?? b.startDate;
    checkDateOrder(b.startDate, endDate, MAX_ENTRY_DAYS);
    const base = {
      startDate: b.startDate, endDate, countsSchoolDay: b.countsSchoolDay ?? true, subjectMinutes: b.subjectMinutes ?? {},
      totalMinutes: b.totalMinutes ?? null, homeMinutes: b.homeMinutes ?? null, awayMinutes: b.awayMinutes ?? null, notes: b.notes ?? null, books: b.books ?? [],
    };
    checkHours(base);
    const rows = await withTransaction(app.db, async (tx) => {
      await checkRefs(tx, req.familyId, { childIds: b.childIds });
      await checkSubjects(tx, req.familyId, Object.keys(base.subjectMinutes));
      const model = await calendarModel(tx, req.familyId);
      const made: RecordEntryRow[] = [];
      for (const childId of b.childIds) {
        made.push(await insertEntry(tx, req.familyId, { ...base, childId, schoolDays: daysCounted(model, childId, b.startDate, endDate, base.countsSchoolDay) }));
      }
      return made;
    });
    return reply.code(201).send(rows.map(toJson));
  });

  app.patch<{ Params: { id: string } }>("/api/log-entries/:id", async (req) => {
    if (!UUID_RE.test(req.params.id)) throw notFound();
    const p = parseBody(PatchBody, req.body);
    return withTransaction(app.db, async (tx) => {
      const cur = await lockEntry(tx, req.familyId, req.params.id);
      if (!cur) throw notFound();
      const before = stateOf(cur);
      const next: RecordEntryState = {
        ...before,
        startDate: p.startDate ?? before.startDate,
        endDate: p.endDate ?? (p.startDate !== undefined && before.startDate === before.endDate ? p.startDate : before.endDate),
        countsSchoolDay: p.countsSchoolDay ?? before.countsSchoolDay,
        subjectMinutes: p.subjectMinutes ?? before.subjectMinutes,
        totalMinutes: p.totalMinutes === undefined ? before.totalMinutes : p.totalMinutes,
        homeMinutes: p.homeMinutes === undefined ? before.homeMinutes : p.homeMinutes,
        awayMinutes: p.awayMinutes === undefined ? before.awayMinutes : p.awayMinutes,
        notes: p.notes === undefined ? before.notes : p.notes,
        books: p.books ?? before.books,
      };
      checkDateOrder(next.startDate, next.endDate, MAX_ENTRY_DAYS);
      checkHours(next);
      await checkSubjects(tx, req.familyId, Object.keys(p.subjectMinutes ?? {}));
      next.schoolDays = daysCounted(await calendarModel(tx, req.familyId), next.childId, next.startDate, next.endDate, next.countsSchoolDay);
      const after = await replaceEntry(tx, req.familyId, cur.id, next);
      if (JSON.stringify(before) !== JSON.stringify(stateOf(after))) {
        const who = (await tx.query<{ name: string }>("SELECT name FROM child WHERE id = $1", [cur.child_id])).rows[0]?.name ?? "Child";
        await recordUndo(tx, req.familyId, `Changed ${label(before, who)}`, [{ op: "logEntry", id: cur.id, set: before }]);
      }
      return toJson(after);
    });
  });

  app.delete<{ Params: { id: string } }>("/api/log-entries/:id", async (req, reply) => {
    if (!UUID_RE.test(req.params.id)) throw notFound();
    await withTransaction(app.db, async (tx) => {
      const cur = await lockEntry(tx, req.familyId, req.params.id);
      if (!cur) throw notFound();
      await deleteEntry(tx, req.familyId, cur.id);
      const who = (await tx.query<{ name: string }>("SELECT name FROM child WHERE id = $1", [cur.child_id])).rows[0]?.name ?? "Child";
      await recordUndo(tx, req.familyId, `Deleted ${label(stateOf(cur), who)}`, [{ op: "logEntry", id: cur.id, set: stateOf(cur) }]);
    });
    return reply.code(204).send();
  });
}
