import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import pg from "pg";
import { listMigrations, MIGRATIONS_DIR } from "../migrate";

/** Admin URL = the _test database from DATABASE_URL; scratch DBs are created next to it. */
export const ADMIN_URL = process.env.DATABASE_URL;
export const hasDb = !!ADMIN_URL && /_test(\?|$)/.test(ADMIN_URL);

export function urlFor(db: string): string {
  const u = new URL(ADMIN_URL!);
  u.pathname = "/" + db;
  return u.toString();
}

async function admin<T>(fn: (c: pg.Client) => Promise<T>): Promise<T> {
  const c = new pg.Client({ connectionString: ADMIN_URL });
  c.on("error", () => {});
  await c.connect();
  try {
    return await fn(c);
  } finally {
    await c.end().catch(() => {});
  }
}

/** Create an empty database (dropping any leftover) and return its URL. Name must end in _test. */
export async function createScratch(name: string): Promise<string> {
  if (!/_test$/.test(name)) throw new Error("scratch db names must end in _test");
  await admin(async (c) => {
    await c.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`);
    await c.query(`CREATE DATABASE ${name}`);
  });
  return urlFor(name);
}

export async function dropScratch(name: string): Promise<void> {
  await admin((c) => c.query(`DROP DATABASE IF EXISTS ${name} WITH (FORCE)`));
}

export async function q<T = Record<string, unknown>>(url: string, sql: string, params: unknown[] = []): Promise<T[]> {
  const c = new pg.Client({ connectionString: url });
  c.on("error", () => {});
  await c.connect();
  try {
    return (await c.query(sql, params)).rows as T[];
  } finally {
    await c.end().catch(() => {});
  }
}

/**
 * A temp dir holding only the migrations whose file names sort at or before `last` (e.g. "003"),
 * so a test can migrate a DB to an older version, insert legacy rows, then apply the next step.
 */
export function migrationsThrough(last: string): { dir: string; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hh-mig-"));
  for (const f of listMigrations().filter((f) => f.slice(0, 3) <= last)) fs.copyFileSync(path.join(MIGRATIONS_DIR, f), path.join(dir, f));
  return { dir, cleanup: () => fs.rmSync(dir, { recursive: true, force: true }) };
}
