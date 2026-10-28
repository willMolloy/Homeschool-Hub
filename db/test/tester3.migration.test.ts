/** Tester round 3 (S2b-16) case 9: a database at 003 with legacy minutes per unit upgrades to 007 with weights ÷ 2 (D3). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate, MIGRATIONS_DIR } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const F = "f0000000-0000-0000-0000-0000000000a1";
const S = "50000000-0000-0000-0000-0000000000a1";
const C = "c0000000-0000-0000-0000-0000000000a1";

describe.skipIf(!hasDb)("tester3: 003 → 007 weight conversion (integration)", () => {
  const DB = "hh_tester3_migration_test";
  let url = "";
  const at003 = migrationsThrough("003");
  // [title, unit, minutes_per_unit, expected weight]
  const ROWS: [string, string, number | null, number | null][] = [
    ["three", "pages", 3, 1.5],
    ["four", "pages", 4, 2],
    ["six-hundred", "chapters", 600, 100],
    ["zero", "pages", 0, null],
    ["null", "pages", null, null],
    ["tiny", "pages", 0.01, 0.01],
    ["lesson", "lessons", 30, 15],
    ["odd", "pages", 2.5, 1.25],
    ["minutes", "minutes", null, null],
  ];
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, at003.dir, () => {});
    await q(url, `INSERT INTO family (id, name) VALUES ('${F}', 'F');
      INSERT INTO subject (id, family_id, name) VALUES ('${S}', '${F}', 'Math');
      INSERT INTO child (id, family_id, name) VALUES ('${C}', '${F}', 'Kid');`);
    for (const [title, unit, mpu] of ROWS) {
      const rows = await q<{ id: string }>(url,
        "INSERT INTO assignment (family_id, subject_id, title, unit_type, total_units, minutes_per_unit, start_date, end_date) VALUES ($1,$2,$3,$4,10,$5,'2026-11-02','2026-11-27') RETURNING id",
        [F, S, title, unit, mpu]);
      await q(url, "INSERT INTO assignment_child (family_id, assignment_id, child_id) VALUES ($1,$2,$3)", [F, rows[0]!.id, C]);
    }
    await migrate(url, MIGRATIONS_DIR, () => {});
  });
  afterAll(async () => {
    at003.cleanup();
    await dropScratch(DB);
  });

  it("each legacy value converts as expected and the old column is gone", async () => {
    const got = await q<{ title: string; w: number | null }>(url, "SELECT title, weight_per_unit::float8 AS w FROM assignment");
    const byTitle = new Map(got.map((r) => [r.title, r.w]));
    for (const [title, , , w] of ROWS) expect([title, byTitle.get(title)]).toEqual([title, w]);
    const cols = await q<{ column_name: string }>(url, "SELECT column_name FROM information_schema.columns WHERE table_name = 'assignment'");
    expect(cols.map((c) => c.column_name)).not.toContain("minutes_per_unit");
  });

  it("only weighted pages/chapters rows became history", async () => {
    const h = await q<{ title: string; unit_type: string; w: number }>(url,
      "SELECT a.title, wc.unit_type, wc.weight::float8 AS w FROM weight_choice wc JOIN assignment a ON a.id = wc.assignment_id ORDER BY a.title");
    expect(h).toEqual([
      { title: "four", unit_type: "pages", w: 2 },
      { title: "odd", unit_type: "pages", w: 1.25 },
      { title: "six-hundred", unit_type: "chapters", w: 100 },
      { title: "three", unit_type: "pages", w: 1.5 },
      { title: "tiny", unit_type: "pages", w: 0.01 },
    ]);
  });
});
