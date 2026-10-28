/**
 * Applies db/0*.sql to a fresh database and runs db/test/validate.sql.
 *
 *   DATABASE_URL=postgres://user:pass@localhost:5432/empty_db node db/test/validate.cjs
 *
 * With `--scratch` (what `npm run db:validate` uses), DATABASE_URL names any database on the server: an empty
 * `hh_validate_test` is created next to it, used, and dropped afterwards.
 *
 * Without DATABASE_URL it starts a throwaway embedded Postgres (needs the `embedded-postgres`
 * package resolvable, e.g. NODE_PATH=/path/to/node_modules) and deletes it afterwards.
 * Needs the `pg` package. Exit code 0 = schema applied and every check passed.
 */
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const { Client } = require("pg");

const dbDir = path.resolve(__dirname, "..");
const migrations = fs.readdirSync(dbDir).filter((f) => /^\d{3}_.*\.sql$/.test(f)).sort();

async function run(conn) {
  const client = new Client(conn);
  client.on("notice", (n) => console.log(n.message));
  client.on("error", () => {});
  await client.connect();
  try {
    await apply(client);
  } finally {
    await client.end().catch(() => {});
  }
}

async function apply(client) {
  const { rows } = await client.query("select version()");
  console.log(rows[0].version);
  for (const m of migrations) {
    await client.query(fs.readFileSync(path.join(dbDir, m), "utf8"));
    console.log(`applied ${m}`);
  }
  await client.query(fs.readFileSync(path.join(__dirname, "validate.sql"), "utf8"));
}

const SCRATCH = "hh_validate_test";

async function admin(sql) {
  const c = new Client({ connectionString: process.env.DATABASE_URL });
  c.on("error", () => {});
  await c.connect();
  try {
    await c.query(sql);
  } finally {
    await c.end().catch(() => {});
  }
}

async function runScratch() {
  const url = new URL(process.env.DATABASE_URL);
  url.pathname = "/" + SCRATCH;
  await admin(`DROP DATABASE IF EXISTS ${SCRATCH} WITH (FORCE)`);
  await admin(`CREATE DATABASE ${SCRATCH}`);
  try {
    await run({ connectionString: url.toString() });
  } finally {
    await admin(`DROP DATABASE IF EXISTS ${SCRATCH} WITH (FORCE)`);
  }
}

(async () => {
  if (process.env.DATABASE_URL && process.argv.includes("--scratch")) return runScratch();
  if (process.env.DATABASE_URL) return run({ connectionString: process.env.DATABASE_URL });
  const EmbeddedPostgres = require("embedded-postgres").default;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hh-pg-"));
  const port = 54329;
  const pg = new EmbeddedPostgres({ databaseDir: dir, user: "postgres", password: "postgres", port, persistent: false, onLog: () => {} });
  await pg.initialise();
  await pg.start();
  try {
    await pg.createDatabase("hh_validate");
    await run({ host: "localhost", port, user: "postgres", password: "postgres", database: "hh_validate" });
  } finally {
    await pg.stop();
    fs.rmSync(dir, { recursive: true, force: true });
  }
})().then(
  () => process.exit(0),
  (e) => { console.error("VALIDATION FAILED:", e.message); process.exit(1); },
);
