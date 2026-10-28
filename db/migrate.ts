/**
 * Migration runner: `npm run db:migrate` (apply pending) and `npm run db:reset` (wipe + apply all).
 *
 * Conventions for db/NNN_name.sql files:
 *   - Applied in file-name order. Version = file name without ".sql" (e.g. "002_auth").
 *   - Each file wraps itself in BEGIN; ... COMMIT; and, inside that transaction,
 *     inserts its own row: INSERT INTO schema_migration (version) VALUES ('NNN_name');
 *     (001_init also creates schema_migration itself.)
 *   - Forward-only. Never edit a file that has been applied anywhere; fix mistakes with a new file.
 * The runner checks that each file recorded its row and fails loudly if it did not.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

export const MIGRATIONS_DIR = path.dirname(fileURLToPath(import.meta.url));
const FILE_RE = /^\d{3}_.+\.sql$/;

export function listMigrations(dir: string = MIGRATIONS_DIR): string[] {
  return fs.readdirSync(dir).filter((f) => FILE_RE.test(f)).sort();
}

export function databaseName(url: string): string {
  return decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
}

async function appliedVersions(client: pg.Client): Promise<Set<string>> {
  const { rows } = await client.query<{ exists: boolean }>("select to_regclass('public.schema_migration') is not null as exists");
  if (!rows[0]?.exists) return new Set();
  const res = await client.query<{ version: string }>("select version from schema_migration");
  return new Set(res.rows.map((r) => r.version));
}

export interface MigrateResult {
  applied: string[];
}

/** Apply every pending migration in `dir`. Throws (after rolling back the failing file) on error. */
export async function migrate(databaseUrl: string, dir: string = MIGRATIONS_DIR, log: (s: string) => void = () => {}): Promise<MigrateResult> {
  const client = new pg.Client({ connectionString: databaseUrl });
  client.on("error", () => {});
  await client.connect();
  try {
    await client.query("SET client_min_messages = warning");
    const done = await appliedVersions(client);
    const applied: string[] = [];
    for (const file of listMigrations(dir)) {
      const version = file.replace(/\.sql$/, "");
      if (done.has(version)) continue;
      const sql = fs.readFileSync(path.join(dir, file), "utf8");
      try {
        await client.query(sql);
      } catch (e) {
        await client.query("ROLLBACK").catch(() => {});
        throw new Error(`migration ${file} failed: ${(e as Error).message}`);
      }
      const check = await appliedVersions(client);
      if (!check.has(version)) {
        throw new Error(`migration ${file} ran but did not insert its schema_migration row ('${version}'). Add: INSERT INTO schema_migration (version) VALUES ('${version}');`);
      }
      applied.push(version);
      log(`applied ${version}`);
    }
    if (applied.length === 0) log("nothing to do");
    return { applied };
  } finally {
    await client.end().catch(() => {});
  }
}

/** Drop and recreate the public schema, then migrate. Only for databases named *_dev or *_test. */
export async function reset(databaseUrl: string, dir: string = MIGRATIONS_DIR, log: (s: string) => void = () => {}): Promise<MigrateResult> {
  const name = databaseName(databaseUrl);
  if (!/_(dev|test)$/.test(name)) {
    throw new Error(`refusing to reset database "${name}": only databases ending in _dev or _test can be reset`);
  }
  const client = new pg.Client({ connectionString: databaseUrl });
  client.on("error", () => {});
  await client.connect();
  try {
    await client.query("SET client_min_messages = warning; DROP SCHEMA public CASCADE; CREATE SCHEMA public;");
  } finally {
    await client.end().catch(() => {});
  }
  log(`reset ${name}`);
  return migrate(databaseUrl, dir, log);
}

/** Read DATABASE_URL from the environment or the repo-root .env (without a dotenv dependency). */
export function databaseUrlFromEnv(): string {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;
  const envFile = path.join(MIGRATIONS_DIR, "..", ".env");
  if (fs.existsSync(envFile)) {
    const m = fs.readFileSync(envFile, "utf8").match(/^DATABASE_URL=(.+)$/m);
    if (m?.[1]) return m[1].trim();
  }
  throw new Error("DATABASE_URL is not set (export it or put it in the repo-root .env)");
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const run = process.argv.includes("--reset") ? reset : migrate;
  run(databaseUrlFromEnv(), MIGRATIONS_DIR, console.log).catch((e) => {
    console.error(String((e as Error).message ?? e));
    process.exit(1);
  });
}
