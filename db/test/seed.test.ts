import { execFile } from "node:child_process";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { DEMO_FAMILY } from "../demo-family";
import { DEMO_EMAIL, seed } from "../seed";
import { SAMPLE_FAMILY } from "../seed-data";
import { createScratch, dropScratch, hasDb, q } from "./scratch";

const DB = "hh_seed_test";
const EXPECTED = { child: 2, subject: 5, assignment: 14, assignment_child: 16, event: 3, blocked_range: 1 };
/** T-07d: the demo family (db/demo-family.ts). */
const DEMO_EXPECTED = {
  child: 2, subject: 6, assignment: 20, assignment_child: 21, event: 4, event_child: 5, blocked_range: 4,
  week_override: 3, progress_checkin: 2, week_review: 2,
};

describe.skipIf(!hasDb)("seed (integration)", () => {
  let url = "";
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url);
  });
  afterAll(() => dropScratch(DB));

  it("seeds the sample family with the expected row counts", async () => {
    const s = await seed(url, "sample-seed@example.com", SAMPLE_FAMILY);
    expect(s.counts).toMatchObject(EXPECTED);
    expect(s.counts.event_child).toBe(4);          // co-op (both) + violin + piano
    expect(s.counts.event_subject_rule).toBe(8);   // co-op 5 + violin 1 + piano 2
    const [ti] = await q<{ total_units: number; start_date: string; end_date: string }>(url,
      "SELECT total_units, start_date, end_date FROM assignment WHERE title = 'Treasure Island'");
    expect(ti).toEqual({ total_units: "270.00", start_date: expect.any(Date), end_date: expect.any(Date) });
  });

  it("seeds the demo family by default: the richer year with overrides, check-ins and reviewed weeks", async () => {
    const s = await seed(url);
    expect(s.counts).toMatchObject(DEMO_EXPECTED);
    const [ti] = await q<{ total_units: string; start_date: Date; end_date: Date }>(url,
      `SELECT total_units, start_date, end_date FROM assignment a JOIN family f ON f.id = a.family_id
        WHERE f.login_email = $1 AND a.title = 'Treasure Island'`, [DEMO_EMAIL]);
    expect(ti?.total_units).toBe("270.00");
    expect((ti!.end_date.getTime() - ti!.start_date.getTime()) / 86400000).toBe(18); // three school weeks
    const checkIns = await q<{ title: string; position: string; mode: string }>(url,
      `SELECT a.title, pc.position, pc.mode FROM progress_checkin pc JOIN assignment a ON a.id = pc.assignment_id
        WHERE pc.family_id = $1 ORDER BY pc.week_start`, [s.familyId]);
    expect(checkIns.map((c) => c.title)).toEqual(["The Hobbit", "The Secret Garden"]);
    const kinds = await q<{ kind: string }>(url, "SELECT DISTINCT kind FROM blocked_range WHERE family_id = $1 ORDER BY kind", [s.familyId]);
    expect(kinds.map((k) => k.kind)).toEqual(["holiday", "vacation"]);
  });

  it("runs twice without errors or duplicates", async () => {
    const second = await seed(url);
    expect(second.counts).toMatchObject(DEMO_EXPECTED);
    const sample = await seed(url, "sample-seed@example.com", SAMPLE_FAMILY);
    expect(sample.counts).toMatchObject(EXPECTED);
    for (const [t, n] of Object.entries(DEMO_EXPECTED)) {
      const rows = await q<{ n: number }>(url, `SELECT count(*)::int AS n FROM ${t} WHERE family_id = $1`, [second.familyId]);
      expect(rows[0]?.n, t).toBe(n);
    }
    expect(await q(url, "SELECT count(*)::int AS n FROM family")).toEqual([{ n: 2 }]);
    expect(await q(url, "SELECT count(*)::int AS n FROM family WHERE login_email = $1", [DEMO_EMAIL])).toEqual([{ n: 1 }]);
    expect(DEMO_FAMILY.assignments).toHaveLength(DEMO_EXPECTED.assignment);
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
