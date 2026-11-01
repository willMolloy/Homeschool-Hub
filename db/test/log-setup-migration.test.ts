/** 016_log_setup (S9-03): family.log_setup is NULL until set and must be an object with fields; subject.core defaults to non-core. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_log_setup_migration_test";
const F = "f0000000-0000-0000-0000-000000000001";
const SETUP = { template: "coreNonCore", fields: { subjectHours: true, coreSplit: true } };

describe.skipIf(!hasDb)("016_log_setup (integration)", () => {
  let url = "";
  const before = migrationsThrough("015");
  const after = migrationsThrough("016");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, before.dir, () => {});
    await q(url, `INSERT INTO family (id, name) VALUES ('${F}', 'F')`);
    await q(url, `INSERT INTO subject (family_id, name) VALUES ('${F}', 'Math')`);
  });
  afterAll(async () => {
    before.cleanup();
    after.cleanup();
    await dropScratch(DB);
  });

  it("upgrades from 015: an existing family has no setup and an existing subject is non-core", async () => {
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["016_log_setup"]);
    expect(await q(url, "SELECT log_setup FROM family WHERE id = $1", [F])).toEqual([{ log_setup: null }]);
    expect(await q(url, "SELECT core FROM subject WHERE family_id = $1", [F])).toEqual([{ core: false }]);
  });

  it("stores a setup object and a core flag, and reads them back", async () => {
    await q(url, "UPDATE family SET log_setup = $2::jsonb WHERE id = $1", [F, JSON.stringify(SETUP)]);
    await q(url, "UPDATE subject SET core = true WHERE family_id = $1", [F]);
    expect(await q(url, "SELECT log_setup FROM family WHERE id = $1", [F])).toEqual([{ log_setup: SETUP }]);
    expect(await q(url, "SELECT core FROM subject WHERE family_id = $1", [F])).toEqual([{ core: true }]);
  });

  it.each([["a list", "[]"], ["a string", '"x"'], ["no fields", '{"template":"x"}'], ["fields not an object", '{"fields":[]}']])("rejects %s", async (_l, json) => {
    await expect(q(url, "UPDATE family SET log_setup = $2::jsonb WHERE id = $1", [F, json])).rejects.toMatchObject({ code: "23514" });
  });

  it("subject.core can't be NULL", async () => {
    await expect(q(url, "UPDATE subject SET core = NULL WHERE family_id = $1", [F])).rejects.toMatchObject({ code: "23502" });
  });
});
