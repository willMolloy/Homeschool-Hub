/** 022_school_year_shape (S11b-01): NULL until chosen; only the four shapes. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_school_year_shape_migration_test";
const F = "f0000000-0000-0000-0000-000000000001";

describe.skipIf(!hasDb)("022_school_year_shape (integration)", () => {
  let url = "";
  const before = migrationsThrough("021");
  const after = migrationsThrough("022");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, before.dir, () => {});
    await q(url, `INSERT INTO family (id, name) VALUES ('${F}', 'F')`);
  });
  afterAll(async () => {
    before.cleanup();
    after.cleanup();
    await dropScratch(DB);
  });

  it("upgrades from 021: no shape for an existing family", async () => {
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["022_school_year_shape"]);
    expect(await q(url, "SELECT school_year_shape FROM family WHERE id = $1", [F])).toEqual([{ school_year_shape: null }]);
  });

  it("stores a shape and rejects any other", async () => {
    await q(url, "UPDATE family SET school_year_shape = 'three-terms' WHERE id = $1", [F]);
    await expect(q(url, "UPDATE family SET school_year_shape = 'later' WHERE id = $1", [F])).rejects.toMatchObject({ code: "23514" });
  });
});
