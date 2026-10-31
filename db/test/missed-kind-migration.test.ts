/** 009_missed_kind (S4-00): blocked_range.kind accepts 'missed' and still rejects unknown kinds. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_missed_kind_migration_test";
const F = "f0000000-0000-0000-0000-000000000001";

const insert = (url: string, kind: string) =>
  q(url, `INSERT INTO blocked_range (family_id, kind, start_date, end_date) VALUES ('${F}', '${kind}', '2026-10-28', '2026-10-28')`);

describe.skipIf(!hasDb)("009_missed_kind (integration)", () => {
  let url = "";
  const before = migrationsThrough("008");
  const after = migrationsThrough("009");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, before.dir, () => {});
    await q(url, `INSERT INTO family (id, name) VALUES ('${F}', 'F')`);
    await insert(url, "sick");
  });
  afterAll(async () => {
    before.cleanup();
    after.cleanup();
    await dropScratch(DB);
  });

  it("rejects 'missed' before the migration", async () => {
    await expect(insert(url, "missed")).rejects.toMatchObject({ code: "23514" });
  });

  it("upgrades from 008 and keeps existing rows", async () => {
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["009_missed_kind"]);
    expect(await q(url, "SELECT kind FROM blocked_range")).toEqual([{ kind: "sick" }]);
  });

  it.each(["vacation", "holiday", "sick", "other", "missed"])("accepts %s", async (kind) => {
    await insert(url, kind);
  });

  it("still rejects an unknown kind", async () => {
    await expect(insert(url, "later")).rejects.toMatchObject({ code: "23514" });
  });
});
