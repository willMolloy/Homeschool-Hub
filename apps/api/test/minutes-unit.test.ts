/** RF-10: a `minutes` assignment can't carry a minutesPerUnit (one unit is one minute). */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
    expect(bad.json().message).toMatch(/send minutesPerUnit: null when switching to minutes/);
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
});
