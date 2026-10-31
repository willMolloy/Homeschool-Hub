/** 010_weekdays (S4-02): assignment.weekdays and subject.default_weekdays, NULL for existing rows, and their CHECKs. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_weekdays_migration_test";
const F = "f0000000-0000-0000-0000-000000000001";
const S = "50000000-0000-0000-0000-000000000001";
const A = "a0000000-0000-0000-0000-000000000001";

describe.skipIf(!hasDb)("010_weekdays (integration)", () => {
  let url = "";
  const before = migrationsThrough("009");
  const after = migrationsThrough("010");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, before.dir, () => {});
    await q(url, `
      INSERT INTO family (id, name) VALUES ('${F}', 'F');
      INSERT INTO subject (id, family_id, name) VALUES ('${S}', '${F}', 'Math');
      INSERT INTO assignment (id, family_id, subject_id, title, unit_type, total_units, start_date, end_date)
        VALUES ('${A}', '${F}', '${S}', 'Book', 'pages', 100, '2026-09-07', '2026-09-18');`);
  });
  afterAll(async () => {
    before.cleanup();
    after.cleanup();
    await dropScratch(DB);
  });

  it("upgrades a database with data; existing rows read NULL", async () => {
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["010_weekdays"]);
    expect(await q(url, "SELECT weekdays FROM assignment")).toEqual([{ weekdays: null }]);
    expect(await q(url, "SELECT default_weekdays FROM subject")).toEqual([{ default_weekdays: null }]);
  });

  it.each([
    ["one day", "{5}"],
    ["several, in any order", "{4,2}"],
    ["all seven", "{0,1,2,3,4,5,6}"],
    ["Sunday and Saturday", "{0,6}"],
  ])("accepts %s", async (_label, value) => {
    await q(url, `UPDATE assignment SET weekdays = '${value}' WHERE id = '${A}'`);
    await q(url, `UPDATE subject SET default_weekdays = '${value}' WHERE id = '${S}'`);
    expect(await q(url, "SELECT weekdays::text AS w FROM assignment")).toEqual([{ w: value }]);
  });

  it("clears back to NULL", async () => {
    await q(url, `UPDATE assignment SET weekdays = NULL WHERE id = '${A}'`);
    await q(url, `UPDATE subject SET default_weekdays = NULL WHERE id = '${S}'`);
    expect(await q(url, "SELECT weekdays FROM assignment")).toEqual([{ weekdays: null }]);
  });

  it.each([
    ["7", "{1,7}"],
    ["-1", "{-1,2}"],
    ["an empty array", "{}"],
    ["a NULL element", "{1,NULL}"],
    ["a duplicate", "{2,2}"],
    ["a duplicate among several", "{1,2,3,1}"],
    ["eight values", "{0,1,2,3,4,5,6,6}"],
  ])("rejects %s", async (_label, value) => {
    await expect(q(url, `UPDATE assignment SET weekdays = '${value}' WHERE id = '${A}'`)).rejects.toMatchObject({ code: "23514" });
    await expect(q(url, `UPDATE subject SET default_weekdays = '${value}' WHERE id = '${S}'`)).rejects.toMatchObject({ code: "23514" });
  });

  it("applies to an empty database too", async () => {
    const empty = await createScratch("hh_weekdays_empty_test");
    try {
      expect((await migrate(empty, after.dir, () => {})).applied.at(-1)).toBe("010_weekdays");
    } finally {
      await dropScratch("hh_weekdays_empty_test");
    }
  });
});
