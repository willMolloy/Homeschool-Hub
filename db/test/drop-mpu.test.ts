/**
 * 007_drop_minutes_per_unit (S2b-15): the column and 003's constraint go; weights and subject defaults are untouched.
 * Also: a database upgraded from 003 to the latest passes the same validate.sql a fresh one does.
 */
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate, MIGRATIONS_DIR } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const F = "f0000000-0000-0000-0000-000000000001";
const S = "50000000-0000-0000-0000-000000000001";
const columnsOf = (url: string) =>
  q<{ column_name: string }>(url, "SELECT column_name FROM information_schema.columns WHERE table_name = 'assignment' ORDER BY column_name");

describe.skipIf(!hasDb)("007_drop_minutes_per_unit (integration)", () => {
  const DB = "hh_drop_mpu_test";
  let url = "";
  const at003 = migrationsThrough("003");
  const at006 = migrationsThrough("006");
  const at007 = migrationsThrough("007");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, at003.dir, () => {});
    // Rows as they were before weights: minutes per unit on pages and lessons, none on a minutes row (RF-10).
    await q(url, `
      INSERT INTO family (id, name) VALUES ('${F}', 'F');
      INSERT INTO subject (id, family_id, name) VALUES ('${S}', '${F}', 'Math');
      INSERT INTO assignment (family_id, subject_id, title, unit_type, total_units, minutes_per_unit, start_date, end_date) VALUES
        ('${F}', '${S}', 'Book', 'pages', 100, 4, '2026-11-02', '2026-11-27'),
        ('${F}', '${S}', 'Saxon', 'lessons', 120, 30, '2026-11-02', '2026-11-27'),
        ('${F}', '${S}', 'Piano', 'minutes', 600, NULL, '2026-11-02', '2026-11-27'),
        ('${F}', '${S}', 'Unset', 'chapters', 12, NULL, '2026-11-02', '2026-11-27');`);
    await migrate(url, at006.dir, () => {});
    await q(url, `UPDATE subject SET default_weight_unit = 'lessons', default_weight = 20 WHERE id = '${S}'`);
    await q(url, `UPDATE assignment SET weight_per_unit = 0.75 WHERE title = 'Piano'`);
  });
  afterAll(async () => {
    for (const m of [at003, at006, at007]) m.cleanup();
    await dropScratch(DB);
  });

  const weights = () => q<{ title: string; w: number | null }>(url, "SELECT title, weight_per_unit::float8 AS w FROM assignment ORDER BY title");
  const subjects = () => q(url, "SELECT default_weight_unit AS u, default_weight::float8 AS w FROM subject");

  it("drops the column and the 003 constraint, and records itself", async () => {
    const w = await weights();
    const s = await subjects();
    expect(w).toEqual([{ title: "Book", w: 2 }, { title: "Piano", w: 0.75 }, { title: "Saxon", w: 15 }, { title: "Unset", w: null }]);
    expect((await migrate(url, at007.dir, () => {})).applied).toEqual(["007_drop_minutes_per_unit"]);
    expect((await columnsOf(url)).map((c) => c.column_name)).not.toContain("minutes_per_unit");
    expect(await q(url, "SELECT conname FROM pg_constraint WHERE conname = 'assignment_minutes_unit_no_mpu'")).toEqual([]);
    expect(await q(url, "SELECT version FROM schema_migration WHERE version = '007_drop_minutes_per_unit'")).toHaveLength(1);
    // weights and subject defaults are exactly as before
    expect(await weights()).toEqual(w);
    expect(await subjects()).toEqual(s);
  });

  it("the column can't be written any more; a minutes row with a weight is fine", async () => {
    await expect(q(url, "UPDATE assignment SET minutes_per_unit = 1")).rejects.toMatchObject({ code: "42703" });
    await q(url, "UPDATE assignment SET unit_type = 'minutes', weight_per_unit = 0.5 WHERE title = 'Book'");
    expect((await weights()).find((r) => r.title === "Book")).toEqual({ title: "Book", w: 0.5 });
  });

  it("running the migrations again applies nothing", async () => {
    // Through 007 only, so later migrations don't break this test (S2b-21).
    expect((await migrate(url, at007.dir, () => {})).applied).toEqual([]);
  });
});

describe.skipIf(!hasDb)("003 → latest upgrade passes validate.sql (S2b-15)", () => {
  const DB = "hh_upgrade_validate_test";
  let url = "";
  const at003 = migrationsThrough("003");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, at003.dir, () => {});
    await migrate(url, MIGRATIONS_DIR, () => {});
  });
  afterAll(async () => {
    at003.cleanup();
    await dropScratch(DB);
  });

  it("has the same assignment columns as a fresh database, and every check passes", async () => {
    const fresh = await createScratch("hh_fresh_columns_test");
    try {
      await migrate(fresh, MIGRATIONS_DIR, () => {});
      expect(await columnsOf(url)).toEqual(await columnsOf(fresh));
    } finally {
      await dropScratch("hh_fresh_columns_test");
    }
    const sql = fs.readFileSync(path.join(__dirname, "validate.sql"), "utf8");
    await q(url, sql); // validate.sql RAISEs (and so rejects) on the first failed check
  });
});
