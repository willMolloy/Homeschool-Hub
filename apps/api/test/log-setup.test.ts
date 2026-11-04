/** S9-03: a family's log setup (what the records track) and the subject core flag. */
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { signedInFamily } from "./helpers/session";

const CORE = { template: "coreNonCore", fields: { subjectHours: true, coreSplit: true, totalHours: false, schoolDays: true, homeAway: false, notes: false, books: false } };

describe.skipIf(!hasDb)("log setup (S9-03, integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  beforeAll(async () => {
    a = await signedInFamily(pool, "Setup A");
    b = await signedInFamily(pool, "Setup B");
  });
  beforeEach(async () => {
    await pool.query("UPDATE family SET log_setup = NULL WHERE id = $1", [a.familyId]);
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  const get = (cookies = a.cookies) => app.inject({ method: "GET", url: "/api/family", cookies });
  const patch = (logSetup: unknown) => app.inject({ method: "PATCH", url: "/api/family", payload: { logSetup } as object, cookies: a.cookies });
  const rejected = async (logSetup: unknown, message: RegExp) => {
    const res = await patch(logSetup);
    expect(res.statusCode, res.body).toBe(400);
    expect(res.json().message).toMatch(message);
    expect((await get()).json().logSetup).toBeNull();
  };

  it("starts with no setup, so Records asks the family to set one up", async () => {
    expect((await get()).json().logSetup).toBeNull();
  });

  it("round-trips a setup, keeps the other settings, and is private to the family", async () => {
    const res = await patch(CORE);
    expect(res.statusCode, res.body).toBe(200);
    expect(res.json()).toMatchObject({ name: "Setup A", logSetup: CORE, zoomViews: { hidden: [], custom: [] } });
    expect((await get()).json().logSetup).toEqual(CORE);
    expect((await get(b.cookies)).json().logSetup).toBeNull();
  });

  it("changing the setup replaces it, and changing other settings leaves it alone", async () => {
    await patch(CORE);
    const days = { template: "daysAttended", fields: { subjectHours: false, coreSplit: false, totalHours: false, schoolDays: true, homeAway: false, notes: false, books: false } };
    expect((await patch(days)).json().logSetup).toEqual(days);
    const renamed = await app.inject({ method: "PATCH", url: "/api/family", payload: { name: "Setup A2" }, cookies: a.cookies });
    expect(renamed.json()).toMatchObject({ name: "Setup A2", logSetup: days });
    await app.inject({ method: "PATCH", url: "/api/family", payload: { name: "Setup A" }, cookies: a.cookies });
  });

  it("refuses an empty log, core without subject hours, and total hours beside subject hours", async () => {
    const none = { subjectHours: false, coreSplit: false, totalHours: false, schoolDays: false, homeAway: false, notes: false, books: false };
    await rejected({ template: "custom", fields: none }, /at least one thing/);
    await rejected({ template: "custom", fields: { ...none, coreSplit: true, schoolDays: true } }, /need hours by subject/);
    await rejected({ template: "custom", fields: { ...none, totalHours: true, subjectHours: true } }, /Total hours are for logs without hours by subject/);
  });

  it.each([
    ["an unknown template (never a state)", { ...CORE, template: "texas" }],
    ["a missing field", { template: "custom", fields: { subjectHours: true } }],
    ["an unknown field", { template: "custom", fields: { ...CORE.fields, extra: true } }],
    ["a non-boolean", { template: "custom", fields: { ...CORE.fields, notes: "yes" } }],
    ["a list", []],
  ])("refuses %s", async (_label, body) => {
    expect((await patch(body)).statusCode).toBe(400);
    expect((await get()).json().logSetup).toBeNull();
  });
});

describe.skipIf(!hasDb)("subject core flag (S9-03, integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  beforeAll(async () => { a = await signedInFamily(pool, "Core A"); });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [a.familyId]);
    await pool.end();
  });

  it("a subject starts non-core; core can be set at creation and changed", async () => {
    const math = (await app.inject({ method: "POST", url: "/api/subjects", payload: { name: "Math", core: true }, cookies: a.cookies })).json();
    const art = (await app.inject({ method: "POST", url: "/api/subjects", payload: { name: "Art" }, cookies: a.cookies })).json();
    expect(math.core).toBe(true);
    expect(art.core).toBe(false);
    const patched = await app.inject({ method: "PATCH", url: `/api/subjects/${art.id}`, payload: { core: true }, cookies: a.cookies });
    expect(patched.json().core).toBe(true);
    const back = await app.inject({ method: "PATCH", url: `/api/subjects/${art.id}`, payload: { core: false }, cookies: a.cookies });
    expect(back.json().core).toBe(false);
    const list = (await app.inject({ method: "GET", url: "/api/subjects", cookies: a.cookies })).json() as { name: string; core: boolean }[];
    expect(list.map((s) => [s.name, s.core])).toEqual([["Math", true], ["Art", false]]);
  });

  it("refuses a core that is not true or false", async () => {
    const s = (await app.inject({ method: "POST", url: "/api/subjects", payload: { name: "Latin" }, cookies: a.cookies })).json();
    expect((await app.inject({ method: "PATCH", url: `/api/subjects/${s.id}`, payload: { core: "yes" }, cookies: a.cookies })).statusCode).toBe(400);
  });
});
