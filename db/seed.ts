/**
 * `npm run db:seed` — load the prototype's sample family into a *_dev database.
 * Idempotent: the demo family (login demo@example.com / demo-password) is deleted and recreated.
 * Data comes from packages/engine/test/fixtures/sample-family.ts, so API output can be compared
 * with the engine tests' numbers.
 */
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { hashPassword } from "../apps/api/src/auth/password";
import { assignments, blocked, calendar, events } from "../packages/engine/test/fixtures/sample-family";
import { databaseName, databaseUrlFromEnv } from "./migrate";

export const DEMO_EMAIL = "demo@example.com";
export const DEMO_PASSWORD = "demo-password";

const CHILDREN = [
  { key: "frank", name: "Frank", color: "#2f6fb0" },
  { key: "margaret", name: "Margaret", color: "#b0482f" },
];
const SUBJECTS = [
  { key: "lit", name: "Literature", color: "#7a5cc2" },
  { key: "math", name: "Math", color: "#2f8f6f" },
  { key: "hist", name: "History", color: "#b08a2f" },
  { key: "sci", name: "Science", color: "#2f8fb0" },
  { key: "music", name: "Music", color: "#c25c8a" },
];
const TITLES: Record<string, string> = {
  aesop: "Aesop's Fables", ti: "Treasure Island", crusoe: "Robinson Crusoe",
  garden: "The Secret Garden", poems: "A Child's Garden of Verses", heidi: "Heidi",
  math5: "Math 5", math3: "Math 3", fracs: "Fractions unit",
  hist: "History spine", sci: "Science", fair: "Science fair project",
  piano: "Piano practice", violin: "Violin practice",
};
const BLOCK_LABELS: Record<string, string> = { xmas: "Christmas break" };

export interface SeedSummary {
  familyId: string;
  counts: Record<string, number>;
  /** fixture id → uuid, keyed by kind */
  ids: { child: Record<string, string>; subject: Record<string, string>; assignment: Record<string, string>; event: Record<string, string> };
}

/**
 * Seed the demo family into `databaseUrl`. No name guard here (the CLI applies it).
 * `email` lets parallel test files each own a separate copy of the sample family.
 */
export async function seed(databaseUrl: string, email: string = DEMO_EMAIL): Promise<SeedSummary> {
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
    for (const [i, c] of CHILDREN.entries()) {
      ids.child[c.key] = await one(
        "INSERT INTO child (id, family_id, name, color, sort_order) VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING id",
        [familyId, c.name, c.color, i]);
    }
    for (const [i, s] of SUBJECTS.entries()) {
      ids.subject[s.key] = await one(
        "INSERT INTO subject (id, family_id, name, color, sort_order) VALUES (gen_random_uuid(), $1, $2, $3, $4) RETURNING id",
        [familyId, s.name, s.color, i]);
    }
    for (const a of assignments) {
      const id = await one(
        `INSERT INTO assignment (id, family_id, subject_id, title, unit_type, total_units, start_date, end_date, minutes_per_unit)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8) RETURNING id`,
        [familyId, ids.subject[a.subjectId], TITLES[a.id] ?? a.id, a.unitType, a.totalUnits, a.start, a.end, a.minutesPerUnit ?? null]);
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
        [familyId, BLOCK_LABELS[b.id] ?? b.id, b.kind ?? "vacation", b.start, b.end]);
      for (const c of b.childIds ?? []) {
        await client.query("INSERT INTO blocked_range_child (blocked_range_id, child_id, family_id) VALUES ($1, $2, $3)", [id, ids.child[c], familyId]);
      }
    }
    await client.query("COMMIT");

    const counts: Record<string, number> = {};
    for (const t of ["child", "subject", "assignment", "assignment_child", "event", "event_child", "event_subject_rule", "blocked_range"]) {
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
