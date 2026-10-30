/** 011_weekdays_from (S4-01b): assignment.weekdays_from and previous_weekdays, NULL for existing rows, and their CHECKs. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_weekdays_from_migration_test";
const F = "f0000000-0000-0000-0000-000000000001";
const S = "50000000-0000-0000-0000-000000000001";
const A = "a0000000-0000-0000-0000-000000000001";

const set = (url: string, sql: string) => q(url, `UPDATE assignment SET ${sql} WHERE id = '${A}'`);

describe.skipIf(!hasDb)("011_weekdays_from (integration)", () => {
  let url = "";
  const before = migrationsThrough("010");
  const after = migrationsThrough("011");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, before.dir, () => {});
    await q(url, `
      INSERT INTO family (id, name) VALUES ('${F}', 'F');
      INSERT INTO subject (id, family_id, name) VALUES ('${S}', '${F}', 'Math');
      INSERT INTO assignment (id, family_id, subject_id, title, unit_type, total_units, start_date, end_date, weekdays)
        VALUES ('${A}', '${F}', '${S}', 'Book', 'pages', 100, '2026-09-07', '2026-09-18', '{5}');`);
  });
  afterAll(async () => {
    before.cleanup();
    after.cleanup();
    await dropScratch(DB);
  });

  it("upgrades from 010; existing rows read NULL and keep their weekdays", async () => {
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["011_weekdays_from"]);
    expect(await q(url, "SELECT weekdays_from, previous_weekdays, weekdays FROM assignment")).toEqual([{ weekdays_from: null, previous_weekdays: null, weekdays: [5] }]);
  });

  it("stores a date with previous days, or with NULL previous days (= every school day)", async () => {
    await set(url, "weekdays_from = '2026-10-26', previous_weekdays = '{1,2,3,4,5}'");
    expect(await q(url, "SELECT weekdays_from::text AS d, previous_weekdays::text AS p FROM assignment")).toEqual([{ d: "2026-10-26", p: "{1,2,3,4,5}" }]);
    await set(url, "previous_weekdays = NULL");
    await set(url, "weekdays_from = NULL");
  });

  it.each([
    ["7", "{7}"],
    ["an empty array", "{}"],
    ["a NULL element", "{1,NULL}"],
    ["a duplicate", "{2,2}"],
  ])("rejects previous weekdays with %s", async (_label, value) => {
    await expect(set(url, `weekdays_from = '2026-10-26', previous_weekdays = '${value}'`)).rejects.toMatchObject({ code: "23514" });
  });

  it("rejects previous weekdays without a date", async () => {
    await expect(set(url, "previous_weekdays = '{5}'")).rejects.toMatchObject({ code: "23514" });
  });
});
