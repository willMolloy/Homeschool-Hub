/** 006_subject_default_weight (S2b-30): existing subjects get no default; the pair and range constraints hold. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_subject_weight_migration_test";
const F = "f0000000-0000-0000-0000-000000000001";
const S = "50000000-0000-0000-0000-000000000001";

describe.skipIf(!hasDb)("006_subject_default_weight (integration)", () => {
  let url = "";
  const before = migrationsThrough("005");
  const after = migrationsThrough("006");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, before.dir, () => {});
  });
  afterAll(async () => {
    before.cleanup();
    after.cleanup();
    await dropScratch(DB);
  });

  it("leaves existing subjects without a default", async () => {
    await q(url, `
      INSERT INTO family (id, name) VALUES ('${F}', 'F');
      INSERT INTO subject (id, family_id, name) VALUES ('${S}', '${F}', 'Math');`);
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["006_subject_default_weight"]);
    expect(await q(url, "SELECT default_weight_unit, default_weight FROM subject")).toEqual([{ default_weight_unit: null, default_weight: null }]);
  });

  it("stores a (unit, weight) pair and clears both together", async () => {
    await q(url, `UPDATE subject SET default_weight_unit = 'lessons', default_weight = 20 WHERE id = '${S}'`);
    expect(await q(url, "SELECT default_weight_unit AS u, default_weight::float8 AS w FROM subject")).toEqual([{ u: "lessons", w: 20 }]);
    await q(url, `UPDATE subject SET default_weight_unit = NULL, default_weight = NULL WHERE id = '${S}'`);
  });

  it.each([
    ["a weight without a unit", "default_weight = 3"],
    ["a unit without a weight", "default_weight_unit = 'pages'"],
    ["weight 0", "default_weight_unit = 'pages', default_weight = 0"],
    ["weight 100.01", "default_weight_unit = 'pages', default_weight = 100.01"],
    ["an unknown unit", "default_weight_unit = 'hours', default_weight = 1"],
  ])("rejects %s", async (_label, set) => {
    await expect(q(url, `UPDATE subject SET ${set} WHERE id = '${S}'`)).rejects.toMatchObject({ code: "23514" });
  });
});
