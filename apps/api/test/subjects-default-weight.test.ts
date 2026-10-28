/** S2b-31: subjects accept and return `defaultWeight: { unitType, weightPerUnit } | null`. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("subject default weight (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  beforeAll(async () => {
    a = await signedInFamily(pool, "Default A");
    b = await signedInFamily(pool, "Default B");
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  const post = (payload: unknown, cookies = a.cookies) => app.inject({ method: "POST", url: "/api/subjects", payload: payload as object, cookies });
  const patch = (id: string, payload: unknown, cookies = a.cookies) =>
    app.inject({ method: "PATCH", url: `/api/subjects/${id}`, payload: payload as object, cookies });
  const get = async (id: string, cookies = a.cookies) =>
    (await app.inject({ method: "GET", url: "/api/subjects", cookies })).json().find((s: { id: string }) => s.id === id);

  it("create with {lessons, 20} → 201, and GET round-trips it", async () => {
    const res = await post({ name: "Math", defaultWeight: { unitType: "lessons", weightPerUnit: 20 } });
    expect(res.statusCode, res.body).toBe(201);
    expect(res.json().defaultWeight).toEqual({ unitType: "lessons", weightPerUnit: 20 });
    expect((await get(res.json().id)).defaultWeight).toEqual({ unitType: "lessons", weightPerUnit: 20 });
  });

  it("create without one, or with null → null", async () => {
    expect((await post({ name: "Plain" })).json().defaultWeight).toBeNull();
    expect((await post({ name: "Null", defaultWeight: null })).json().defaultWeight).toBeNull();
  });

  it("PATCH sets, leaves when omitted, and clears with null", async () => {
    const id = (await post({ name: "Piano" })).json().id;
    const set = await patch(id, { defaultWeight: { unitType: "minutes", weightPerUnit: 0.75 } });
    expect(set.statusCode, set.body).toBe(200);
    expect(set.json().defaultWeight).toEqual({ unitType: "minutes", weightPerUnit: 0.75 });
    expect((await patch(id, { name: "Piano practice" })).json().defaultWeight).toEqual({ unitType: "minutes", weightPerUnit: 0.75 });
    expect((await get(id)).defaultWeight).toEqual({ unitType: "minutes", weightPerUnit: 0.75 });
    const cleared = await patch(id, { defaultWeight: null });
    expect(cleared.statusCode).toBe(200);
    expect(cleared.json().defaultWeight).toBeNull();
    expect((await get(id)).defaultWeight).toBeNull();
  });

  it("defaultWeight alone counts as a PATCH field", async () => {
    const id = (await post({ name: "Solo" })).json().id;
    expect((await patch(id, { defaultWeight: { unitType: "pages", weightPerUnit: 2 } })).statusCode).toBe(200);
  });

  it.each([
    ["weight 0", { unitType: "pages", weightPerUnit: 0 }],
    ["weight 101", { unitType: "pages", weightPerUnit: 101 }],
    ["weight 1.234", { unitType: "pages", weightPerUnit: 1.234 }],
    ["unit hours", { unitType: "hours", weightPerUnit: 1 }],
    ["a missing weight", { unitType: "pages" }],
    ["a missing unit", { weightPerUnit: 1 }],
    ["an extra key", { unitType: "pages", weightPerUnit: 1, source: "x" }],
    ["a bare number", 3],
  ])("rejects %s with 400 on create and PATCH", async (_label, defaultWeight) => {
    const bad = await post({ name: "Bad", defaultWeight });
    expect(bad.statusCode).toBe(400);
    expect(bad.json().error).toBe("invalid_request");
    const id = (await post({ name: `Ok ${_label}` })).json().id;
    expect((await patch(id, { defaultWeight })).statusCode).toBe(400);
    expect((await get(id)).defaultWeight).toBeNull();
  });

  it("family isolation: another family can't read or set it", async () => {
    const id = (await post({ name: "Mine", defaultWeight: { unitType: "lessons", weightPerUnit: 12 } })).json().id;
    expect(await get(id, b.cookies)).toBeUndefined();
    expect((await patch(id, { defaultWeight: null }, b.cookies)).statusCode).toBe(404);
    expect((await get(id)).defaultWeight).toEqual({ unitType: "lessons", weightPerUnit: 12 });
  });
});
