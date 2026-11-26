/** 029_child_schedule (S22-01): each existing child copies the book's end and ending. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_child_schedule_migration_test";
const F = "f0000000-0000-0000-0000-000000000001";
const S = "50000000-0000-0000-0000-000000000001";
const C1 = "c0000000-0000-0000-0000-000000000001";
const C2 = "c0000000-0000-0000-0000-000000000002";
const OPEN = "a0000000-0000-0000-0000-000000000001";
const DONE = "a0000000-0000-0000-0000-000000000002";

describe.skipIf(!hasDb)("029_child_schedule (integration)", () => {
  let url = "";
  const before = migrationsThrough("028");
  const after = migrationsThrough("029");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, before.dir, () => {});
    await q(url, `INSERT INTO family (id, name) VALUES ('${F}', 'F')`);
    await q(url, `INSERT INTO child (id, family_id, name, sort_order) VALUES ('${C1}', '${F}', 'Elias', 0), ('${C2}', '${F}', 'Margaret', 1)`);
    await q(url, `INSERT INTO subject (id, family_id, name) VALUES ('${S}', '${F}', 'Reading')`);
    await q(url, `INSERT INTO assignment (id, family_id, subject_id, title, unit_type, total_units, start_date, end_date)
                  VALUES ('${OPEN}', '${F}', '${S}', 'Treasure Island', 'pages', 100, '2026-10-01', '2026-10-30'),
                         ('${DONE}', '${F}', '${S}', 'Poems', 'pages', 40, '2026-09-01', '2026-09-30')`);
    await q(url, `UPDATE assignment SET ended_as = 'finished', ended_on = '2026-09-18' WHERE id = '${DONE}'`);
    await q(url, `INSERT INTO assignment_child (assignment_id, child_id, family_id) VALUES
                  ('${OPEN}', '${C1}', '${F}'), ('${OPEN}', '${C2}', '${F}'),
                  ('${DONE}', '${C1}', '${F}'), ('${DONE}', '${C2}', '${F}')`);
  });
  afterAll(async () => {
    before.cleanup();
    after.cleanup();
    await dropScratch(DB);
  });

  it("copies an open book and a finished book onto every child", async () => {
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["029_child_schedule"]);
    const rows = await q<{ assignment_id: string; child_id: string; end_date: string; ended_as: string | null; ended_on: string | null }>(
      url,
      `SELECT assignment_id, child_id, end_date::text, ended_as, ended_on::text
         FROM assignment_child WHERE family_id = $1 ORDER BY assignment_id, child_id`,
      [F],
    );
    expect(rows).toEqual([
      { assignment_id: OPEN, child_id: C1, end_date: "2026-10-30", ended_as: null, ended_on: null },
      { assignment_id: OPEN, child_id: C2, end_date: "2026-10-30", ended_as: null, ended_on: null },
      { assignment_id: DONE, child_id: C1, end_date: "2026-09-30", ended_as: "finished", ended_on: "2026-09-18" },
      { assignment_id: DONE, child_id: C2, end_date: "2026-09-30", ended_as: "finished", ended_on: "2026-09-18" },
    ]);
  });

  it("a child inserted with no end copies the book, and an end before the start is refused", async () => {
    const added = "c0000000-0000-0000-0000-000000000003";
    await q(url, `INSERT INTO child (id, family_id, name) VALUES ('${added}', '${F}', 'Wren')`);
    await q(url, `INSERT INTO assignment_child (assignment_id, child_id, family_id) VALUES ('${OPEN}', '${added}', '${F}')`);
    expect(await q(url, "SELECT end_date::text, ended_as FROM assignment_child WHERE child_id = $1", [added])).toEqual([
      { end_date: "2026-10-30", ended_as: null },
    ]);
    await expect(q(url, "UPDATE assignment_child SET end_date = '2026-09-01' WHERE child_id = $1", [added])).rejects.toMatchObject({ code: "23514" });
    await expect(q(url, "UPDATE assignment_child SET ended_as = 'stopped' WHERE child_id = $1", [added])).rejects.toMatchObject({ code: "23514" });
  });
});
