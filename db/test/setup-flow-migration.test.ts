/** 019_setup_flow (S11-01): existing families are marked done; a new family starts at step 1; the step and deferrals are checked. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_setup_flow_migration_test";
const OLD = "f0000000-0000-0000-0000-000000000001";
const NEW = "f0000000-0000-0000-0000-000000000002";

describe.skipIf(!hasDb)("019_setup_flow (integration)", () => {
  let url = "";
  const before = migrationsThrough("018");
  const after = migrationsThrough("019");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, before.dir, () => {});
    await q(url, `INSERT INTO family (id, name) VALUES ('${OLD}', 'Old')`);
  });
  afterAll(async () => {
    before.cleanup();
    after.cleanup();
    await dropScratch(DB);
  });

  it("upgrades from 018: a family that already exists is done, at step 1, with nothing put off", async () => {
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["019_setup_flow"]);
    expect(await q(url, "SELECT setup_step, setup_done, setup_deferred FROM family WHERE id = $1", [OLD])).toEqual([{ setup_step: 1, setup_done: true, setup_deferred: [] }]);
  });

  it("a family created afterwards starts at step 1 and is not done", async () => {
    await q(url, `INSERT INTO family (id, name) VALUES ('${NEW}', 'New')`);
    expect(await q(url, "SELECT setup_step, setup_done, setup_deferred FROM family WHERE id = $1", [NEW])).toEqual([{ setup_step: 1, setup_done: false, setup_deferred: [] }]);
  });

  it("stores a step and what was put off, and reads them back", async () => {
    await q(url, "UPDATE family SET setup_step = 4, setup_deferred = '{year,breaks}' WHERE id = $1", [NEW]);
    expect(await q(url, "SELECT setup_step, setup_deferred FROM family WHERE id = $1", [NEW])).toEqual([{ setup_step: 4, setup_deferred: ["year", "breaks"] }]);
  });

  it.each([["step 0", "setup_step = 0"], ["step 7", "setup_step = 7"], ["an unknown deferral", "setup_deferred = '{children}'"]])("rejects %s", async (_l, set) => {
    await expect(q(url, `UPDATE family SET ${set} WHERE id = $1`, [NEW])).rejects.toMatchObject({ code: "23514" });
  });
});
