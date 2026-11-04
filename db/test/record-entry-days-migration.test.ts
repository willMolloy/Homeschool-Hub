/** 018_record_entry_days (S9b-07): a run of dates may carry the days the parent ticked; older entries read as before. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_record_entry_days_migration_test";
const F = "f0000000-0000-0000-0000-000000000001";
const KID = "c0000000-0000-0000-0000-000000000001";
const insert = (start: string, end: string, days: string) =>
  `INSERT INTO record_entry (family_id, child_id, start_date, end_date, counts_school_day, school_days, days) VALUES ('${F}', '${KID}', '${start}', '${end}', true, 1, ${days})`;

describe.skipIf(!hasDb)("018_record_entry_days (integration)", () => {
  let url = "";
  const before = migrationsThrough("017");
  const after = migrationsThrough("018");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, before.dir, () => {});
    await q(url, `INSERT INTO family (id, name) VALUES ('${F}', 'F')`);
    await q(url, `INSERT INTO child (id, family_id, name) VALUES ('${KID}', '${F}', 'Frank')`);
    await q(url, `INSERT INTO record_entry (family_id, child_id, start_date, end_date, counts_school_day, school_days) VALUES ('${F}', '${KID}', '2026-11-02', '2026-11-06', true, 5)`);
  });
  afterAll(async () => {
    before.cleanup();
    after.cleanup();
    await dropScratch(DB);
  });

  it("upgrades from 017; an existing entry has no ticked days (it reads the school calendar, as before)", async () => {
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["018_record_entry_days"]);
    expect(await q(url, "SELECT days FROM record_entry")).toEqual([{ days: null }]);
  });

  it("a run keeps its ticked dates; a single day and an over-long list are refused", async () => {
    await q(url, insert("2026-11-02", "2026-11-08", "'{2026-11-02,2026-11-07}'::date[]"));
    expect(await q(url, "SELECT days::text[] AS days FROM record_entry WHERE days IS NOT NULL")).toEqual([{ days: ["2026-11-02", "2026-11-07"] }]);
    await expect(q(url, insert("2026-11-02", "2026-11-02", "'{2026-11-02}'::date[]"))).rejects.toThrow(/record_entry_days_run/);
    await expect(q(url, insert("2026-11-02", "2026-11-03", "'{2026-11-02,2026-11-03,2026-11-03}'::date[]"))).rejects.toThrow(/record_entry_days_run/);
  });
});
