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
await pool.query("DELETE FROM family WHERE login_email = $1", ["empty@example.com"]);
await pool.query(
  "INSERT INTO family (name, week_start, school_days, time_zone, login_email, password_hash, setup_done) VALUES ('Empty family', 'mon', '{1,2,3,4,5}', 'America/Chicago', $1, $2, true)",
  ["empty@example.com", await hashPassword("demo-password")],
);
// S11-01: a brand-new family that has not been through the first-run flow (setup_done false, step 1): signing in as it opens /welcome.
await pool.query("DELETE FROM family WHERE login_email = $1", ["fresh@example.com"]);
await pool.query(
  "INSERT INTO family (name, week_start, school_days, time_zone, login_email, password_hash) VALUES ('Fresh family', 'mon', '{1,2,3,4,5}', 'America/Chicago', $1, $2)",
  ["fresh@example.com", await hashPassword("demo-password")],
);
await pool.end();
console.log("Empty family: empty@example.com / demo-password");
console.log("Fresh family (opens the setup flow): fresh@example.com / demo-password");
