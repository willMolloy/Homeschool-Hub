// S8b-06: a second family (the demo data under another login, so it is not the demo family and can add events) for the
// smoke scenarios that need to write: s2a-16-events, s2a-hardening, axe-2a. Dev databases only. Run from the repo root:
//   DATABASE_URL=postgres://hh:hh@localhost:5432/hh_dev npx tsx scripts/smoke/seed-second-family.ts
// It also adds a brand-new family (fresh@example.com, not set up, so it opens the first-run flow) and an empty family (empty@example.com, no children, subjects or work) for the empty-state screens of kids-list
// and subjects-list. Then run those scenarios with SMOKE_EMAIL=smoke@example.com (the password is the demo password).
import { databaseName, databaseUrlFromEnv } from "../../db/migrate";
import pg from "pg";
import { hashPassword } from "../../apps/api/src/auth/password";
import { seed } from "../../db/seed";

const url = databaseUrlFromEnv();
if (!/_dev$/.test(databaseName(url))) throw new Error("only *_dev databases");
const email = process.env.SMOKE_EMAIL ?? "smoke@example.com";
const s = await seed(url, email);
console.log(`Second family ${s.familyId}: ${email} / demo-password`);

const pool = new pg.Pool({ connectionString: url });
const hash = await hashPassword("demo-password");
// S14-01: a family's login is its first parent (the parent table), so each family is a family row and a parent row.
const addFamily = async (name: string, email: string, extra: string) => {
  await pool.query("DELETE FROM family WHERE id IN (SELECT family_id FROM parent WHERE lower(email) = lower($1))", [email]);
  const { rows } = await pool.query(`INSERT INTO family (name, week_start, school_days, time_zone${extra ? ", setup_done, tips_seen" : ""}) VALUES ($1, 'mon', '{1,2,3,4,5}', 'America/Chicago'${extra ? ", true, '{bars,edit,icons}'" : ""}) RETURNING id`, [name]);
  await pool.query("INSERT INTO parent (family_id, name, email, password_hash) VALUES ($1, $2, $3, $4)", [rows[0].id, name.split(" ")[0], email, hash]);
};
await addFamily("Empty family", "empty@example.com", "done");
// S11-01: a brand-new family that has not been through the first-run flow (setup_done false, step 1): signing in as it opens /welcome.
await addFamily("Fresh family", "fresh@example.com", "");
await pool.end();
console.log("Empty family: empty@example.com / demo-password");
console.log("Fresh family (opens the setup flow): fresh@example.com / demo-password");
