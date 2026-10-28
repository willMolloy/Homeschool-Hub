/**
 * Weight rules on assignment writes: S2b-06 (weightPerUnit is allowed everywhere; a unit change needs a new weight)
 * and S2b-13 (the API no longer writes the legacy minutes_per_unit, except clearing it for 003's CHECK until 007).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkUnitChange } from "../src/http/assignmentWeight";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("weights on minutes assignments and the legacy column (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam: Awaited<ReturnType<typeof signedInFamily>>;
  let req: ReturnType<typeof inject>;
  let roster: { childIds: string[]; subjectIds: string[] };
  beforeAll(async () => {
    fam = await signedInFamily(pool, "Minutes unit");
    req = inject(app, fam.cookies);
    roster = await rosterFor(app, fam.cookies, ["Ann"], ["Music"]);
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });

  const body = (over: Record<string, unknown>) => ({
    subjectId: roster.subjectIds[0], title: "Piano", unitType: "minutes", totalUnits: 600, startDate: "2026-11-02", endDate: "2026-11-27", childIds: roster.childIds, ...over,
  });
  const count = async () => (await pool.query("SELECT count(*)::int AS n FROM assignment WHERE family_id = $1", [fam.familyId])).rows[0].n as number;
  const stored = async (id: string) => (await pool.query("SELECT unit_type, minutes_per_unit::float8 AS mpu FROM assignment WHERE id = $1", [id])).rows[0];
  const weight = async (id: string) => (await pool.query("SELECT weight_per_unit::float8 AS w FROM assignment WHERE id = $1", [id])).rows[0].w as number | null;

  /** A row as written before S2b-13, when the API kept the legacy column in step. */
  const legacy = async (id: string, mpu: number) => pool.query("UPDATE assignment SET minutes_per_unit = $2 WHERE id = $1", [id, mpu]);

  it("POST minutes with no weight → 201; the response has no minutesPerUnit", async () => {
    const before = await count();
    const ok = await req("POST", "/api/assignments", body({}));
    expect(ok.statusCode).toBe(201);
    expect(ok.json()).not.toHaveProperty("minutesPerUnit");
    expect(await count()).toBe(before + 1);
  });

  it("writes never fill the legacy column", async () => {
    const id = (await req("POST", "/api/assignments", body({ unitType: "pages", totalUnits: 100, weightPerUnit: 1.4 }))).json().id;
    expect(await stored(id)).toEqual({ unit_type: "pages", mpu: null });
    expect((await req("PATCH", `/api/assignments/${id}`, { weightPerUnit: 3 })).statusCode).toBe(200);
    expect(await stored(id)).toEqual({ unit_type: "pages", mpu: null });
    expect(await weight(id)).toBe(3);
  });

  it("PATCH pages→minutes with a stored weight: 400 alone (D7), 200 with weightPerUnit: null", async () => {
    const id = (await req("POST", "/api/assignments", body({ unitType: "pages", totalUnits: 100, weightPerUnit: 2 }))).json().id;
    await legacy(id, 4);
    const bad = await req("PATCH", `/api/assignments/${id}`, { unitType: "minutes" });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().message).toBe("weightPerUnit: send a weight (or null) when changing unitType.");
    expect(await stored(id)).toEqual({ unit_type: "pages", mpu: 4 });
    const ok = await req("PATCH", `/api/assignments/${id}`, { unitType: "minutes", weightPerUnit: null });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ unitType: "minutes", weightPerUnit: null });
    expect(await stored(id)).toEqual({ unit_type: "minutes", mpu: null });
  });

  it("other edits to a minutes row still work", async () => {
    const id = (await req("POST", "/api/assignments", body({}))).json().id;
    expect((await req("PATCH", `/api/assignments/${id}`, { title: "Piano 2" })).statusCode).toBe(200);
    expect((await req("PATCH", `/api/assignments/${id}`, { weightPerUnit: null })).statusCode).toBe(200);
  });

  it("weightPerUnit is allowed on minutes rows (D21), on create and on edit", async () => {
    const res = await req("POST", "/api/assignments", body({ weightPerUnit: 0.75 }));
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ unitType: "minutes", weightPerUnit: 0.75 });
    const id = res.json().id;
    expect((await req("PATCH", `/api/assignments/${id}`, { weightPerUnit: 1 })).json()).toMatchObject({ weightPerUnit: 1 });
    expect(await stored(id)).toEqual({ unit_type: "minutes", mpu: null });
  });

  it("switching an older row to minutes with a weight clears its legacy value", async () => {
    const id = (await req("POST", "/api/assignments", body({ unitType: "pages", totalUnits: 100, weightPerUnit: 2 }))).json().id;
    await legacy(id, 4);
    const res = await req("PATCH", `/api/assignments/${id}`, { unitType: "minutes", weightPerUnit: 0.5 });
    expect(res.statusCode).toBe(200);
    expect(await stored(id)).toEqual({ unit_type: "minutes", mpu: null });
    expect(await weight(id)).toBe(0.5);
  });

  it("switching to minutes from a row with no weight clears any legacy value", async () => {
    const id = (await req("POST", "/api/assignments", body({ unitType: "pages", totalUnits: 100 }))).json().id;
    await legacy(id, 0); // a legacy 0 the backfill left without a weight
    expect((await req("PATCH", `/api/assignments/${id}`, { unitType: "minutes" })).statusCode).toBe(200);
    expect(await stored(id)).toEqual({ unit_type: "minutes", mpu: null });
  });

  it("other edits leave an older row's legacy value alone (007 drops it)", async () => {
    const id = (await req("POST", "/api/assignments", body({ unitType: "chapters", totalUnits: 10 }))).json().id;
    await legacy(id, 24);
    expect((await req("PATCH", `/api/assignments/${id}`, { unitType: "pages", weightPerUnit: null })).statusCode).toBe(200);
    expect(await stored(id)).toEqual({ unit_type: "pages", mpu: 24 });
  });
});

describe("assignment weight rules (unit)", () => {
  it("a unit change needs a weight only when one is stored", () => {
    const cur = { unitType: "pages" as const, weightPerUnit: 2 };
    expect(() => checkUnitChange(cur, "chapters", {})).toThrow(/send a weight \(or null\) when changing unitType/);
    expect(() => checkUnitChange(cur, "chapters", { weightPerUnit: 12 })).not.toThrow();
    expect(() => checkUnitChange(cur, "minutes", { weightPerUnit: null })).not.toThrow();
    expect(() => checkUnitChange(cur, "pages", {})).not.toThrow();
    expect(() => checkUnitChange(cur, undefined, {})).not.toThrow();
    expect(() => checkUnitChange({ unitType: "pages", weightPerUnit: null }, "lessons", {})).not.toThrow();
  });
});
