import { afterAll, describe, expect, it } from "vitest";
import { query } from "../src/db";
import { hasDb, testPool } from "./helpers/db";

describe.skipIf(!hasDb)("pg type parsers (integration)", () => {
  const pool = hasDb ? testPool() : (null as never);
  afterAll(() => pool?.end());

  it("returns DATE as a YYYY-MM-DD string", async () => {
    const [row] = await query<{ d: unknown }>(pool, "select '2026-11-01'::date as d");
    expect(row!.d).toBe("2026-11-01");
  });
  it("returns NUMERIC as a number", async () => {
    const [row] = await query<{ n: unknown }>(pool, "select 22.50::numeric(10,2) as n");
    expect(row!.n).toBe(22.5);
  });
});
