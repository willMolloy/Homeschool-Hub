import { createPool } from "../../src/db";

/** Integration tests run only when DATABASE_URL points at a migrated *_test database. */
export const DATABASE_URL = process.env.DATABASE_URL;
export const hasDb = !!DATABASE_URL && /_test(\?|$)/.test(DATABASE_URL);

export function testPool() {
  if (!hasDb) throw new Error("testPool() needs DATABASE_URL ending in _test");
  return createPool({ DATABASE_URL: DATABASE_URL! });
}
