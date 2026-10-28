/** 005_weight_choice (S2b-04): weighted pages/chapters assignments backfill one choice per child. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_weight_choice_migration_test";
const F = "f0000000-0000-0000-0000-000000000001";
const S = "50000000-0000-0000-0000-000000000001";
const C1 = "c0000000-0000-0000-0000-000000000001";
const C2 = "c0000000-0000-0000-0000-000000000002";
const A_PAGES = "a0000000-0000-0000-0000-000000000001";
const A_LESSONS = "a0000000-0000-0000-0000-000000000002";
const A_NULL = "a0000000-0000-0000-0000-000000000003";

describe.skipIf(!hasDb)("005_weight_choice (integration)", () => {
  let url = "";
  const before = migrationsThrough("004");
  const after = migrationsThrough("005");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, before.dir, () => {});
  });
  afterAll(async () => {
    before.cleanup();
    after.cleanup();
    await dropScratch(DB);
  });

  it("backfills one row per child for weighted pages/chapters assignments only", async () => {
    await q(url, `
      INSERT INTO family (id, name) VALUES ('${F}', 'F');
      INSERT INTO subject (id, family_id, name) VALUES ('${S}', '${F}', 'Reading');
      INSERT INTO child (id, family_id, name) VALUES ('${C1}', '${F}', 'Ann'), ('${C2}', '${F}', 'Ben');
      INSERT INTO assignment (id, family_id, subject_id, title, unit_type, total_units, weight_per_unit, start_date, end_date, updated_at) VALUES
        ('${A_PAGES}', '${F}', '${S}', 'Book', 'pages', 100, 1.4, '2026-11-02', '2026-11-27', '2026-10-01T12:00:00Z'),
        ('${A_LESSONS}', '${F}', '${S}', 'Math', 'lessons', 20, 12, '2026-11-02', '2026-11-27', now()),
        ('${A_NULL}', '${F}', '${S}', 'Plain', 'pages', 50, NULL, '2026-11-02', '2026-11-27', now());
      INSERT INTO assignment_child (assignment_id, child_id, family_id) VALUES
        ('${A_PAGES}', '${C1}', '${F}'), ('${A_PAGES}', '${C2}', '${F}'),
        ('${A_LESSONS}', '${C1}', '${F}'), ('${A_NULL}', '${C1}', '${F}');`);
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["005_weight_choice"]);
    const rows = await q<{ child_id: string; assignment_id: string; unit_type: string; w: number; at: Date }>(url,
      "SELECT child_id, assignment_id, unit_type, weight::float8 AS w, chosen_at AS at FROM weight_choice ORDER BY child_id");
    expect(rows.map((r) => [r.child_id, r.assignment_id, r.unit_type, r.w])).toEqual([
      [C1, A_PAGES, "pages", 1.4],
      [C2, A_PAGES, "pages", 1.4],
    ]);
    expect(rows[0]!.at.toISOString()).toBe("2026-10-01T12:00:00.000Z");
  });

  it("deleting the family cascades its choices", async () => {
    await q(url, `DELETE FROM family WHERE id = '${F}'`);
    expect(await q(url, "SELECT 1 FROM weight_choice")).toEqual([]);
  });
});
