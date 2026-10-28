import pg from "pg";
import type { Config } from "./config";

// DATE (oid 1082) stays a "YYYY-MM-DD" string. The default parser makes a JS Date at local midnight,
// which shifts days across time zones and breaks the engine's local-date logic.
pg.types.setTypeParser(1082, (v: string) => v);
// NUMERIC (oid 1700) comes back as a number (our numerics are small: units, minutes, fractions).
pg.types.setTypeParser(1700, (v: string) => Number(v));

export type Db = pg.Pool;
/** Anything that can run a query: the pool or a checked-out client inside a transaction. */
export type Queryable = Pick<pg.Pool, "query"> | pg.PoolClient;

declare const txBrand: unique symbol;
declare const readTxBrand: unique symbol;
/**
 * A client inside an open BEGIN…COMMIT, handed out only by `withTransaction`. Repo functions that run
 * several statements (lock + update, insert + link rows, advisory lock + insert) take a `Tx`, so passing
 * the pool or a bare client is a compile error instead of a "call inside a transaction" comment.
 */
export type Tx = pg.PoolClient & { readonly [txBrand]: true };
/** A client inside a READ ONLY REPEATABLE READ snapshot, handed out only by `withReadSnapshot`. */
export type ReadTx = pg.PoolClient & { readonly [readTxBrand]: true };

/** Where pool errors go (the app's logger; anything with a pino-style `error(obj, msg)`). */
export interface PoolErrorLog {
  error(obj: object, msg: string): void;
}

export function createPool(config: Pick<Config, "DATABASE_URL">, log?: PoolErrorLog): pg.Pool {
  const pool = new pg.Pool({ connectionString: config.DATABASE_URL, max: 10, connectionTimeoutMillis: 3000 });
  // An idle client error (DB restarted) must not crash the process; the next query reconnects.
  pool.on("error", (err) => {
    try {
      log?.error({ err }, "idle database client error");
    } catch {
      // a broken logger must not turn this into a crash either
    }
  });
  return pool;
}

/** Run a parameterized query and return its rows. */
export async function query<T = Record<string, unknown>>(db: Queryable, sql: string, params: unknown[] = []): Promise<T[]> {
  const res = await db.query(sql, params);
  return res.rows as T[];
}

/** Run `fn` inside BEGIN/COMMIT on one client; ROLLBACK on any error. */
export async function withTransaction<T>(pool: pg.Pool, fn: (tx: Tx) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client as Tx);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/**
 * Run `fn` on ONE client inside `BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ`: every read sees the same
 * snapshot and writes are rejected. COMMIT on success, ROLLBACK on error; the client is always released.
 */
export async function withReadSnapshot<T>(pool: pg.Pool, fn: (tx: ReadTx) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ");
    const out = await fn(client as ReadTx);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
