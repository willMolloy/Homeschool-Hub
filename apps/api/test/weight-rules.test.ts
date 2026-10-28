/**
 * Weight rules on assignment writes: RF-10 (a `minutes` assignment can't carry the legacy minutesPerUnit, one unit
 * is one minute) and S2b-06 (weightPerUnit is allowed everywhere; a unit change needs a new weight).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { checkUnitChange, checkWeightFields, weightFromLegacyMinutes, weightWrite } from "../src/http/assignmentWeight";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("minutesPerUnit on minutes assignments (integration)", () => {
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

  it("POST minutes + 30 → 400, nothing inserted; minutes + null or absent → 201", async () => {
    const before = await count();
    const res = await req("POST", "/api/assignments", body({ minutesPerUnit: 30 }));
    expect(res.statusCode).toBe(400);
    expect(res.json()).toEqual({ error: "invalid_request", message: "minutesPerUnit: doesn't apply to minutes; leave it empty." });
    expect(await count()).toBe(before);
    expect((await req("POST", "/api/assignments", body({ minutesPerUnit: null }))).statusCode).toBe(201);
    const ok = await req("POST", "/api/assignments", body({}));
    expect(ok.statusCode).toBe(201);
    expect(ok.json().minutesPerUnit).toBeNull();
  });

  it("PATCH setting a value on a minutes row → 400, row unchanged", async () => {
    const id = (await req("POST", "/api/assignments", body({}))).json().id;
    const res = await req("PATCH", `/api/assignments/${id}`, { minutesPerUnit: 5 });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toBe("minutesPerUnit: doesn't apply to minutes; leave it empty.");
    expect(await stored(id)).toEqual({ unit_type: "minutes", mpu: null });
  });

  it("PATCH pages→minutes with a stored value: 400 alone, 200 with minutesPerUnit: null", async () => {
    const id = (await req("POST", "/api/assignments", body({ unitType: "pages", totalUnits: 100, minutesPerUnit: 4 }))).json().id;
    const bad = await req("PATCH", `/api/assignments/${id}`, { unitType: "minutes" });
    expect(bad.statusCode).toBe(400);
    // S2b-06 joined RF-10's switch check into the unit-change rule (D7).
    expect(bad.json().message).toBe("weightPerUnit: send a weight (or null) when changing unitType.");
    expect(await stored(id)).toEqual({ unit_type: "pages", mpu: 4 });
    const both = await req("PATCH", `/api/assignments/${id}`, { unitType: "minutes", minutesPerUnit: 7 });
    expect(both.statusCode).toBe(400);
    const ok = await req("PATCH", `/api/assignments/${id}`, { unitType: "minutes", minutesPerUnit: null });
    expect(ok.statusCode).toBe(200);
    expect(ok.json()).toMatchObject({ unitType: "minutes", minutesPerUnit: null });
  });

  it("PATCH minutes→pages with a value → 200", async () => {
    const id = (await req("POST", "/api/assignments", body({}))).json().id;
    const res = await req("PATCH", `/api/assignments/${id}`, { unitType: "pages", minutesPerUnit: 3 });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ unitType: "pages", minutesPerUnit: 3 });
  });

  it("other edits to a minutes row still work", async () => {
    const id = (await req("POST", "/api/assignments", body({}))).json().id;
    expect((await req("PATCH", `/api/assignments/${id}`, { title: "Piano 2" })).statusCode).toBe(200);
    expect((await req("PATCH", `/api/assignments/${id}`, { minutesPerUnit: null })).statusCode).toBe(200);
  });

  it("weightPerUnit is allowed on minutes rows (D21), on create and on edit", async () => {
    const res = await req("POST", "/api/assignments", body({ weightPerUnit: 0.75 }));
    expect(res.statusCode).toBe(201);
    expect(res.json()).toMatchObject({ unitType: "minutes", weightPerUnit: 0.75, minutesPerUnit: null });
    const id = res.json().id;
    expect((await req("PATCH", `/api/assignments/${id}`, { weightPerUnit: 1 })).json()).toMatchObject({ weightPerUnit: 1, minutesPerUnit: null });
    expect(await stored(id)).toEqual({ unit_type: "minutes", mpu: null });
  });

  it("switching to minutes with a weight keeps the legacy column empty", async () => {
    const id = (await req("POST", "/api/assignments", body({ unitType: "pages", totalUnits: 100, weightPerUnit: 2 }))).json().id;
    const res = await req("PATCH", `/api/assignments/${id}`, { unitType: "minutes", weightPerUnit: 0.5 });
    expect(res.statusCode).toBe(200);
    expect(await stored(id)).toEqual({ unit_type: "minutes", mpu: null });
    expect(await weight(id)).toBe(0.5);
  });

  it("switching to minutes from a row with no weight clears any legacy value", async () => {
    const id = (await req("POST", "/api/assignments", body({ unitType: "pages", totalUnits: 100 }))).json().id;
    await pool.query("UPDATE assignment SET minutes_per_unit = 0 WHERE id = $1", [id]); // a legacy 0 the backfill left without a weight
    expect((await req("PATCH", `/api/assignments/${id}`, { unitType: "minutes" })).statusCode).toBe(200);
    expect(await stored(id)).toEqual({ unit_type: "minutes", mpu: null });
  });
});

describe("assignment weight rules (unit)", () => {
  it("translates a legacy minutes-per-unit at 2 minutes = 1 point, rounded and clamped", () => {
    expect(weightFromLegacyMinutes(null)).toBeNull();
    expect(weightFromLegacyMinutes(6)).toBe(3);
    expect(weightFromLegacyMinutes(7.5)).toBe(3.75);
    expect(weightFromLegacyMinutes(1.25)).toBe(0.63);
    expect(weightFromLegacyMinutes(0.01)).toBe(0.01);
    expect(weightFromLegacyMinutes(600)).toBe(100);
  });

  it("rejects both fields, and the legacy field on minutes", () => {
    expect(() => checkWeightFields("pages", { weightPerUnit: 1, minutesPerUnit: 2 })).toThrow(/send weightPerUnit only/);
    expect(() => checkWeightFields("pages", { weightPerUnit: null, minutesPerUnit: null })).toThrow(/send weightPerUnit only/);
    expect(() => checkWeightFields("minutes", { minutesPerUnit: 3 })).toThrow(/doesn't apply to minutes/);
    expect(() => checkWeightFields("minutes", { minutesPerUnit: null })).not.toThrow();
    expect(() => checkWeightFields("minutes", { weightPerUnit: 0.75 })).not.toThrow();
  });

  it("a unit change needs a weight only when one is stored", () => {
    const cur = { unitType: "pages" as const, weightPerUnit: 2 };
    expect(() => checkUnitChange(cur, "chapters", {})).toThrow(/send a weight \(or null\) when changing unitType/);
    expect(() => checkUnitChange(cur, "chapters", { weightPerUnit: 12 })).not.toThrow();
    expect(() => checkUnitChange(cur, "minutes", { weightPerUnit: null })).not.toThrow();
    expect(() => checkUnitChange(cur, "chapters", { minutesPerUnit: 24 })).not.toThrow();
    expect(() => checkUnitChange(cur, "pages", {})).not.toThrow();
    expect(() => checkUnitChange(cur, undefined, {})).not.toThrow();
    expect(() => checkUnitChange({ unitType: "pages", weightPerUnit: null }, "lessons", {})).not.toThrow();
  });

  it("decides both stored columns", () => {
    expect(weightWrite("pages", { minutesPerUnit: 6 })).toEqual({ weightPerUnit: 3, minutesPerUnit: 6 });
    expect(weightWrite("pages", { weightPerUnit: 1.4 })).toEqual({ weightPerUnit: 1.4, minutesPerUnit: 2.8 });
    expect(weightWrite("pages", { weightPerUnit: null })).toEqual({ weightPerUnit: null, minutesPerUnit: null });
    expect(weightWrite("minutes", { weightPerUnit: 0.75 })).toEqual({ weightPerUnit: 0.75, minutesPerUnit: null });
    expect(weightWrite("pages", {})).toEqual({ weightPerUnit: undefined, minutesPerUnit: undefined });
    expect(weightWrite("minutes", {}, true)).toEqual({ weightPerUnit: undefined, minutesPerUnit: null });
  });
});
