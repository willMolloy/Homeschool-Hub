/** 012_calendar_template (S5-06): the table, its checks and the cascade from the family. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { migrate } from "../migrate";
import { createScratch, dropScratch, hasDb, migrationsThrough, q } from "./scratch";

const DB = "hh_calendar_template_migration_test";
const F = "f0000000-0000-0000-0000-000000000001";
const F2 = "f0000000-0000-0000-0000-000000000002";
const BREAK = { offsetDays: 21, lengthDays: 7, label: "Break", kind: "vacation" };

const insert = (url: string, family: string, name: string, breaks: unknown) =>
  q(url, "INSERT INTO calendar_template (family_id, name, breaks) VALUES ($1, $2, $3::jsonb) RETURNING id", [family, name, JSON.stringify(breaks)]);

describe.skipIf(!hasDb)("012_calendar_template (integration)", () => {
  let url = "";
  const before = migrationsThrough("011");
  const after = migrationsThrough("012");
  beforeAll(async () => {
    url = await createScratch(DB);
    await migrate(url, before.dir, () => {});
    await q(url, `INSERT INTO family (id, name) VALUES ('${F}', 'F'), ('${F2}', 'Other')`);
  });
  afterAll(async () => {
    before.cleanup();
    after.cleanup();
    await dropScratch(DB);
  });

  it("upgrades from 011 with the table empty", async () => {
    expect((await migrate(url, after.dir, () => {})).applied).toEqual(["012_calendar_template"]);
    expect(await q(url, "SELECT count(*)::int AS n FROM calendar_template")).toEqual([{ n: 0 }]);
  });

  it("stores a name and a list of breaks, and reads the JSON back", async () => {
    await insert(url, F, "Our year", [BREAK, { ...BREAK, offsetDays: 100, label: "Thanksgiving", kind: "holiday" }]);
    const rows = await q<{ name: string; breaks: unknown[]; created_at: Date }>(url, "SELECT name, breaks, created_at FROM calendar_template WHERE family_id = $1", [F]);
    expect(rows).toHaveLength(1);
    expect(rows[0]!.name).toBe("Our year");
    expect(rows[0]!.breaks).toHaveLength(2);
    expect(rows[0]!.breaks[0]).toEqual(BREAK);
    expect(rows[0]!.created_at).toBeInstanceOf(Date);
  });

  it("accepts 1 and 100 breaks and a 60-character name", async () => {
    await insert(url, F, "x".repeat(60), Array.from({ length: 100 }, () => BREAK));
    await insert(url, F, "One", [BREAK]);
  });

  it.each([
    ["an empty name", (u: string) => insert(u, F, "", [BREAK]), "23514"],
    ["a 61-character name", (u: string) => insert(u, F, "x".repeat(61), [BREAK]), "23514"],
    ["no breaks", (u: string) => insert(u, F, "Empty", []), "23514"],
    ["101 breaks", (u: string) => insert(u, F, "Many", Array.from({ length: 101 }, () => BREAK)), "23514"],
    ["breaks that are not a list", (u: string) => insert(u, F, "Object", BREAK), "23514"],
    ["a family that doesn't exist", (u: string) => insert(u, "f0000000-0000-0000-0000-0000000000ff", "Nobody", [BREAK]), "23503"],
  ])("rejects %s", async (_label, run, code) => {
    await expect(run(url)).rejects.toMatchObject({ code });
  });

  it("goes with its family", async () => {
    await insert(url, F2, "Theirs", [BREAK]);
    await q(url, `DELETE FROM family WHERE id = '${F2}'`);
    expect(await q(url, "SELECT count(*)::int AS n FROM calendar_template WHERE family_id = $1", [F2])).toEqual([{ n: 0 }]);
    expect((await q<{ n: number }>(url, "SELECT count(*)::int AS n FROM calendar_template WHERE family_id = $1", [F]))[0]!.n).toBeGreaterThan(0);
  });
});
