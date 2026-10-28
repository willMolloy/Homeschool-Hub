/** 004_weight_per_unit (S2b-03): minutes_per_unit converts into weight_per_unit at 2 minutes = 1 point. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_weight_migration_test";
const F = "f0000000-0000-0000-0000-000000000001";
const S = "50000000-0000-0000-0000-000000000001";

const ROWS: [title: string, unit: string, mpu: number | null, expected: number | null][] = [
  ["pages 3", "pages", 3, 1.5],
  ["pages 4", "pages", 4, 2],
  ["pages 5", "pages", 5, 2.5],
  ["chapters 30", "chapters", 30, 15],
  ["lessons 20", "lessons", 20, 10],
  ["lessons 0", "lessons", 0, null],
  ["lessons NULL", "lessons", null, null],
  ["pages 600", "pages", 600, 100],
  ["pages 0.01", "pages", 0.01, 0.01],
  ["minutes", "minutes", null, null],
];

describe.skipIf(!hasDb)("004_weight_per_unit (integration)", () => {
  let url = "";
  const before = migrationsThrough("003");
  const after = migrationsThrough("004");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, before.dir, () => {});
  });
  afterAll(async () => {
    before.cleanup();
    after.cleanup();
    await dropScratch(DB);
  });

  it("an upgrade from 003 applies only 004 and converts each row", async () => {
    await q(url, `INSERT INTO family (id, name) VALUES ('${F}', 'F'); INSERT INTO subject (id, family_id, name) VALUES ('${S}', '${F}', 'Reading');`);
    for (const [title, unit, mpu] of ROWS) {
      await q(url, `INSERT INTO assignment (family_id, subject_id, title, unit_type, total_units, minutes_per_unit, start_date, end_date)
        VALUES ($1, $2, $3, $4, 100, $5, '2026-11-02', '2026-11-27')`, [F, S, title, unit, mpu]);
    }
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["004_weight_per_unit"]);
    const got = await q<{ title: string; w: number | null }>(url, "SELECT title, weight_per_unit::float8 AS w FROM assignment");
    const byTitle = new Map(got.map((r) => [r.title, r.w]));
    for (const [title, , , expected] of ROWS) expect(byTitle.get(title), title).toBe(expected);
  });

  it("the CHECK keeps weights in 0.01..100", async () => {
    await expect(q(url, "UPDATE assignment SET weight_per_unit = 0 WHERE title = 'pages 3'")).rejects.toMatchObject({ code: "23514" });
    await expect(q(url, "UPDATE assignment SET weight_per_unit = 100.01 WHERE title = 'pages 3'")).rejects.toMatchObject({ code: "23514" });
    await q(url, "UPDATE assignment SET weight_per_unit = 0.5 WHERE title = 'minutes'");
  });
});
