/** 008_progress_checkin (S2b-21): check-ins and week reviews, their constraints, and the cascades. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_checkin_migration_test";
const F = "f0000000-0000-0000-0000-000000000001";
const F2 = "f0000000-0000-0000-0000-000000000002";
const S = "50000000-0000-0000-0000-000000000001";
const A = "a0000000-0000-0000-0000-000000000001";
const C = "c0000000-0000-0000-0000-000000000001";
const C2 = "c0000000-0000-0000-0000-000000000002";
const OTHER_KID = "c0000000-0000-0000-0000-000000000009";

const insert = (url: string, week: string, position: number | string, mode = "NULL", child = C) =>
  q(url, `INSERT INTO progress_checkin (family_id, assignment_id, child_id, week_start, position, mode)
          VALUES ('${F}', '${A}', '${child}', '${week}', ${position}, ${mode})`);

describe.skipIf(!hasDb)("008_progress_checkin (integration)", () => {
  let url = "";
  const before = migrationsThrough("007");
  const after = migrationsThrough("008");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, before.dir, () => {});
    await q(url, `
      INSERT INTO family (id, name) VALUES ('${F}', 'F'), ('${F2}', 'Other');
      INSERT INTO subject (id, family_id, name) VALUES ('${S}', '${F}', 'Literature');
      INSERT INTO child (id, family_id, name) VALUES ('${C}', '${F}', 'Frank'), ('${C2}', '${F}', 'Margaret'), ('${OTHER_KID}', '${F2}', 'Nope');
      INSERT INTO assignment (id, family_id, subject_id, title, unit_type, total_units, start_date, end_date)
        VALUES ('${A}', '${F}', '${S}', 'Book', 'pages', 184, '2026-09-07', '2026-09-22');`);
  });
  afterAll(async () => {
    before.cleanup();
    after.cleanup();
    await dropScratch(DB);
  });

  it("upgrades from 007 with both tables empty", async () => {
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["008_progress_checkin"]);
    expect(await q(url, "SELECT count(*)::int AS n FROM progress_checkin")).toEqual([{ n: 0 }]);
    expect(await q(url, "SELECT count(*)::int AS n FROM week_review")).toEqual([{ n: 0 }]);
  });

  it("stores a position with a mode, or NULL for on plan", async () => {
    await insert(url, "2026-09-07", 65, "'keepEndDate'");
    await insert(url, "2026-09-14", 80.5);
    await insert(url, "2026-09-07", 70, "'pushEndDate'", C2);
    expect(await q(url, "SELECT week_start::text AS w, position::float8 AS p, mode FROM progress_checkin WHERE child_id = $1 ORDER BY week_start", [C]))
      .toEqual([{ w: "2026-09-07", p: 65, mode: "keepEndDate" }, { w: "2026-09-14", p: 80.5, mode: null }]);
  });

  it.each([
    ["a negative position", () => insert(url, "2026-09-21", -1), "23514"],
    ["a bad mode", () => insert(url, "2026-09-21", 1, "'later'"), "23514"],
    ["a duplicate (assignment, child, week)", () => insert(url, "2026-09-07", 10), "23505"],
    ["another family's child", () => insert(url, "2026-09-21", 1, "NULL", OTHER_KID), "23503"],
  ])("rejects %s", async (_label, run, code) => {
    await expect(run()).rejects.toMatchObject({ code });
  });

  it("week_review: one status per family week, reviewed or skipped", async () => {
    await q(url, `INSERT INTO week_review (family_id, week_start, status) VALUES ('${F}', '2026-09-07', 'reviewed'), ('${F}', '2026-09-14', 'skipped')`);
    await expect(q(url, `INSERT INTO week_review (family_id, week_start, status) VALUES ('${F}', '2026-09-07', 'skipped')`)).rejects.toMatchObject({ code: "23505" });
    await expect(q(url, `INSERT INTO week_review (family_id, week_start, status) VALUES ('${F}', '2026-09-21', 'maybe')`)).rejects.toMatchObject({ code: "23514" });
  });

  it("deleting a child removes only their check-ins", async () => {
    await q(url, `DELETE FROM child WHERE id = '${C2}'`);
    expect(await q(url, "SELECT DISTINCT child_id FROM progress_checkin")).toEqual([{ child_id: C }]);
  });

  it("deleting the assignment removes its check-ins; deleting the family removes its reviews", async () => {
    await q(url, `DELETE FROM assignment WHERE id = '${A}'`);
    expect(await q(url, "SELECT count(*)::int AS n FROM progress_checkin")).toEqual([{ n: 0 }]);
    await q(url, `DELETE FROM family WHERE id = '${F}'`);
    expect(await q(url, "SELECT count(*)::int AS n FROM week_review")).toEqual([{ n: 0 }]);
  });
});
