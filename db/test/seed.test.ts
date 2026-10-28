import { execFile } from "node:child_process";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { DEMO_EMAIL, seed } from "../seed";
import { createScratch, dropScratch, hasDb, q } from "./scratch";

const DB = "hh_seed_test";
const EXPECTED = { child: 2, subject: 5, assignment: 14, assignment_child: 16, event: 3, blocked_range: 1 };

describe.skipIf(!hasDb)("seed (integration)", () => {
  let url = "";
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url);
  });
  afterAll(() => dropScratch(DB));

  it("seeds the sample family with the expected row counts", async () => {
    const s = await seed(url);
    expect(s.counts).toMatchObject(EXPECTED);
    expect(s.counts.event_child).toBe(4);          // co-op (both) + violin + piano
    expect(s.counts.event_subject_rule).toBe(8);   // co-op 5 + violin 1 + piano 2
    const [ti] = await q<{ total_units: number; start_date: string; end_date: string }>(url,
      "SELECT total_units, start_date, end_date FROM assignment WHERE title = 'Treasure Island'");
    expect(ti).toEqual({ total_units: "270.00", start_date: expect.any(Date), end_date: expect.any(Date) });
  });

  it("runs twice without errors or duplicates", async () => {
    const second = await seed(url);
    expect(second.counts).toMatchObject(EXPECTED);
    for (const [t, n] of Object.entries(EXPECTED)) {
      const rows = await q<{ n: number }>(url, `SELECT count(*)::int AS n FROM ${t}`);
      expect(rows[0]?.n, t).toBe(n);
    }
    expect(await q(url, "SELECT count(*)::int AS n FROM family WHERE login_email = $1", [DEMO_EMAIL])).toEqual([{ n: 1 }]);
  });

  it("the CLI refuses databases not ending in _dev", async () => {
    const tsx = path.resolve(__dirname, "../../node_modules/.bin/tsx");
    const r = await new Promise<{ code: number; err: string }>((resolve) =>
      execFile(tsx, [path.resolve(__dirname, "../seed.ts")], { env: { ...process.env, DATABASE_URL: url } },
        (e, _o, err) => resolve({ code: e ? Number(e.code) : 0, err })));
    expect(r.code).toBe(1);
    expect(r.err).toMatch(/refusing to seed/);
  }, 20000);
});
