/** 024_assignment_ended (S12-01): both columns NULL for existing rows, only the two outcomes, both or neither. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_assignment_ended_migration_test";
const F = "f0000000-0000-0000-0000-000000000001";
const S = "50000000-0000-0000-0000-000000000001";
const A = "a0000000-0000-0000-0000-000000000001";

describe.skipIf(!hasDb)("024_assignment_ended (integration)", () => {
  let url = "";
  const before = migrationsThrough("023");
  const after = migrationsThrough("024");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, before.dir, () => {});
    await q(url, `INSERT INTO family (id, name) VALUES ('${F}', 'F')`);
    await q(url, `INSERT INTO subject (id, family_id, name) VALUES ('${S}', '${F}', 'Reading')`);
    await q(url, `INSERT INTO assignment (id, family_id, subject_id, title, unit_type, total_units, start_date, end_date)
                  VALUES ('${A}', '${F}', '${S}', 'Treasure Island', 'pages', 100, '2026-10-01', '2026-10-30')`);
  });
  afterAll(async () => {
    before.cleanup();
    after.cleanup();
    await dropScratch(DB);
  });

  it("upgrades from 023: an existing assignment stays open", async () => {
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["024_assignment_ended"]);
    expect(await q(url, "SELECT ended_as, ended_on FROM assignment WHERE id = $1", [A])).toEqual([{ ended_as: null, ended_on: null }]);
  });

  it("stores finished or stopped with a date, and clears both together", async () => {
    await q(url, "UPDATE assignment SET ended_as = 'finished', ended_on = '2026-10-30' WHERE id = $1", [A]);
    await q(url, "UPDATE assignment SET ended_as = 'stopped', ended_on = '2026-10-20' WHERE id = $1", [A]);
    await q(url, "UPDATE assignment SET ended_as = NULL, ended_on = NULL WHERE id = $1", [A]);
  });

  it("rejects any other outcome, and one column without the other", async () => {
    await expect(q(url, "UPDATE assignment SET ended_as = 'done', ended_on = '2026-10-30' WHERE id = $1", [A])).rejects.toMatchObject({ code: "23514" });
    await expect(q(url, "UPDATE assignment SET ended_as = 'finished' WHERE id = $1", [A])).rejects.toMatchObject({ code: "23514" });
    await expect(q(url, "UPDATE assignment SET ended_on = '2026-10-30' WHERE id = $1", [A])).rejects.toMatchObject({ code: "23514" });
  });
});
