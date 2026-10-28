/**
 * `npm run db:seed` — load the demo family into a *_dev database.
 * Idempotent: the demo family (login demo@example.com / demo-password) is deleted and recreated.
 * The demo's data is db/demo-family.ts (T-07d: a varied school year with check-ins). Tests seed the engine's
 * sample family instead (SAMPLE_FAMILY in seed-data.ts), so API output can be compared with the engine tests' numbers.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { DEMO_LOGIN_EMAIL } from "../apps/api/src/auth/demo";
import { hashPassword } from "../apps/api/src/auth/password";
import { DEMO_FAMILY } from "./demo-family";
import type { SeedFamily } from "./seed-data";
import { databaseName, databaseUrlFromEnv } from "./migrate";

/** The API treats this login as the read-only demo (apps/api/src/auth/demo.ts). */
export const DEMO_EMAIL = DEMO_LOGIN_EMAIL;
export const DEMO_PASSWORD = "demo-password";

export interface SeedSummary {
  familyId: string;
  counts: Record<string, number>;
  /** fixture id → uuid, keyed by kind */
  ids: { child: Record<string, string>; subject: Record<string, string>; assignment: Record<string, string>; event: Record<string, string> };
}

/**
 * Seed the demo family into `databaseUrl`. No name guard here (the CLI applies it).
 * `email` lets parallel test files each own a separate copy of a family; `family` picks which one.
 */
export async function seed(databaseUrl: string, email: string = DEMO_EMAIL, family: SeedFamily = DEMO_FAMILY): Promise<SeedSummary> {
  const { calendar, subjectWeights, assignments, events, blocked } = family;
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const client = new pg.Client({ connectionString: databaseUrl });
  client.on("error", () => {});
  await client.connect();
  const one = async (sql: string, params: unknown[]): Promise<string> => (await client.query(sql, params)).rows[0].id;
  try {
    await client.query("BEGIN");
    await client.query("DELETE FROM family WHERE lower(login_email) = lower($1)", [email]);
    const familyId = await one(
      `INSERT INTO family (name, week_start, school_days, time_zone, login_email, password_hash)
       VALUES ('Demo family', $1, $2, 'America/Chicago', $3, $4) RETURNING id`,
      [calendar.weekStart, calendar.schoolDays, email, passwordHash],
    );
    const ids: SeedSummary["ids"] = { child: {}, subject: {}, assignment: {}, event: {} };
    for (const [i, c] of family.children.entries()) {
      ids.child[c.key] = await one(
        "INSERT INTO child (id, family_id, name, color, sort_order) VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING id",
        [familyId, c.name, c.color, i]);
    }
    for (const [i, s] of family.subjects.entries()) {
      const dw = subjectWeights.find((w) => w.subjectId === s.key); // S2b-33: Math has a lessons default
      ids.subject[s.key] = await one(
        `INSERT INTO subject (id, family_id, name, color, sort_order, default_weight_unit, default_weight)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6) RETURNING id`,
        [familyId, s.name, s.color, i, dw?.unitType ?? null, dw?.weightPerUnit ?? null]);
    }
    for (const a of assignments) {
      const id = await one(
        `INSERT INTO assignment (id, family_id, subject_id, title, unit_type, total_units, start_date, end_date, weight_per_unit)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [familyId, ids.subject[a.subjectId], a.title ?? a.id, a.unitType, a.totalUnits, a.start, a.end, a.weightPerUnit ?? null]);
      ids.assignment[a.id] = id;
      for (const c of a.childIds) {
        await client.query("INSERT INTO assignment_child (assignment_id, child_id, family_id) VALUES ($1, $2, $3)", [id, ids.child[c], familyId]);
      }
    }
    for (const e of events) {
      const id = await one(
        `INSERT INTO event (id, family_id, name, weekdays, start_date, end_date, capacity_fraction, default_rule)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7) RETURNING id`,
        [familyId, e.name ?? e.id, e.weekdays, e.start ?? null, e.end ?? null, e.capacityFraction, e.defaultRule ?? "normal"]);
      ids.event[e.id] = id;
      for (const c of e.childIds) {
        await client.query("INSERT INTO event_child (event_id, child_id, family_id) VALUES ($1, $2, $3)", [id, ids.child[c], familyId]);
      }
      for (const [subjectKey, rule] of Object.entries(e.subjectRules)) {
        await client.query("INSERT INTO event_subject_rule (event_id, subject_id, family_id, rule) VALUES ($1, $2, $3, $4)",
          [id, ids.subject[subjectKey], familyId, rule]);
      }
    }
    for (const b of blocked) {
      const id = await one(
        "INSERT INTO blocked_range (id, family_id, label, kind, start_date, end_date) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5) RETURNING id",
        [familyId, b.label, b.kind ?? "vacation", b.start, b.end]);
      for (const c of b.childIds ?? []) {
        await client.query("INSERT INTO blocked_range_child (blocked_range_id, child_id, family_id) VALUES ($1, $2, $3)", [id, ids.child[c], familyId]);
      }
    }
    for (const o of family.overrides ?? []) {
      await client.query(
        `INSERT INTO week_override (family_id, assignment_id, child_id, week_start, planned_units, mode)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [familyId, ids.assignment[o.assignmentId], o.childId ? ids.child[o.childId] : null, o.weekStart, o.plannedUnits, o.mode]);
    }
    for (const c of family.checkIns ?? []) {
      await client.query(
        `INSERT INTO progress_checkin (family_id, assignment_id, child_id, week_start, position, mode)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [familyId, ids.assignment[c.assignmentId], ids.child[c.childId], c.weekStart, c.position, c.mode]);
    }
    for (const r of family.reviews ?? []) {
      await client.query("INSERT INTO week_review (family_id, week_start, status) VALUES ($1, $2, $3)", [familyId, r.weekStart, r.status]);
    }
    await client.query("COMMIT");

    const counts: Record<string, number> = {};
    for (const t of ["child", "subject", "assignment", "assignment_child", "event", "event_child", "event_subject_rule", "blocked_range",
      "week_override", "progress_checkin", "week_review"]) {
      counts[t] = Number((await client.query(`SELECT count(*)::int AS n FROM ${t} WHERE family_id = $1`, [familyId])).rows[0].n);
    }
    return { familyId, counts, ids };
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    await client.end().catch(() => {});
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  (async () => {
    const url = databaseUrlFromEnv();
    const name = databaseName(url);
    if (!/_dev$/.test(name)) throw new Error(`refusing to seed database "${name}": only databases ending in _dev can be seeded`);
    const s = await seed(url);
    console.log(`Seeded ${name}: family ${s.familyId}`);
    for (const [t, n] of Object.entries(s.counts)) console.log(`  ${t.padEnd(20)} ${n}`);
    console.log(`Demo login: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  })().catch((e) => {
    console.error(String((e as Error).message ?? e));
    process.exit(1);
  });
}
