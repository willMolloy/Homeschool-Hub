import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import type { PlanResponse } from "../src/routes/plan";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { seedFamily } from "./helpers/seed";
import { signedInFamily } from "./helpers/session";
import { hashSessionToken, newSessionToken } from "../src/auth/session";

describe.skipIf(!hasDb)("GET/PATCH /api/family (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  beforeAll(async () => {
    a = await signedInFamily(pool, "Settings A");
    b = await signedInFamily(pool, "Settings B");
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  const get = (cookies = a.cookies) => app.inject({ method: "GET", url: "/api/family", cookies });
  const patch = (payload: unknown, cookies = a.cookies) => app.inject({ method: "PATCH", url: "/api/family", payload: payload as object, cookies });

  it("GET → the session family's settings only", async () => {
    const res = await get();
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ name: "Settings A", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", weekStartLocked: false, zoomViews: { hidden: [], custom: [] } });
    expect((await get(b.cookies)).json().name).toBe("Settings B");
  });

  it("each field alone → 200, persisted, and visible in /api/me", async () => {
    expect((await patch({ name: "  The Smiths " })).json().name).toBe("The Smiths");
    expect((await patch({ weekStart: "sun" })).json().weekStart).toBe("sun");
    expect((await patch({ schoolDays: [5, 1, 3] })).json().schoolDays).toEqual([1, 3, 5]);
    expect((await patch({ timeZone: "Europe/London" })).json().timeZone).toBe("Europe/London");
    expect((await get()).json()).toEqual({ name: "The Smiths", weekStart: "sun", schoolDays: [1, 3, 5], timeZone: "Europe/London", weekStartLocked: false, zoomViews: { hidden: [], custom: [] } });
    const me = (await app.inject({ method: "GET", url: "/api/me", cookies: a.cookies })).json();
    expect(me).toMatchObject({ familyId: a.familyId, name: "The Smiths", weekStart: "sun", schoolDays: [1, 3, 5], timeZone: "Europe/London" });
    // The other family is untouched.
    expect((await get(b.cookies)).json()).toEqual({ name: "Settings B", weekStart: "mon", schoolDays: [1, 2, 3, 4, 5], timeZone: "America/Chicago", weekStartLocked: false, zoomViews: { hidden: [], custom: [] } });
  });

  it.each([
    ["bad zone", { timeZone: "Mars/Olympus_Mons" }],
    ["offset zone", { timeZone: "+05:00" }],
    ["empty schoolDays", { schoolDays: [] }],
    ["day 7", { schoolDays: [1, 7] }],
    ["negative day", { schoolDays: [-1] }],
    ["fractional day", { schoolDays: [1.5] }],
    ["duplicate days", { schoolDays: [1, 1] }],
    ["8 days", { schoolDays: [0, 1, 2, 3, 4, 5, 6, 6] }],
    ["weekStart tue", { weekStart: "tue" }],
    ["61-char name", { name: "x".repeat(61) }],
    ["blank name", { name: "   " }],
    ["NUL in name", { name: "a\u0000b" }],
    ["unknown key", { name: "OK", familyId: "00000000-0000-4000-8000-000000000000" }],
    ["empty body", {}],
    ["null field", { timeZone: null }],
  ])("%s → 400 invalid_request, nothing changes", async (_label, body) => {
    const before = (await get()).json();
    const res = await patch(body);
    expect(res.statusCode).toBe(400);
    expect(res.json().error).toBe("invalid_request");
    expect(res.json().message).toBeTruthy();
    expect((await get()).json()).toEqual(before);
  });

  it("signed out → 401", async () => {
    expect((await app.inject({ method: "GET", url: "/api/family" })).statusCode).toBe(401);
    expect((await app.inject({ method: "PATCH", url: "/api/family", payload: { name: "x" } })).statusCode).toBe(401);
  });
});

describe.skipIf(!hasDb)("PATCH /api/family → /api/plan", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam: Awaited<ReturnType<typeof seedFamily>>;
  let cookies: { hh_session: string };
  beforeAll(async () => {
    fam = await seedFamily("family-settings-plan@example.com");
    const token = newSessionToken();
    await pool.query("INSERT INTO session (id, family_id, expires_at) VALUES ($1, $2, now() + interval '1 day')", [hashSessionToken(token), fam.familyId]);
    cookies = { hh_session: token };
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });

  const wednesdayThickness = async () => {
    const body: PlanResponse = (await app.inject({ method: "GET", url: "/api/plan?from=2026-10-26&to=2026-11-01&asOf=2026-10-26", cookies })).json();
    return body.plans.flatMap((p) => p.days).filter((d) => d.date === "2026-10-28").reduce((s, d) => s + d.thickness, 0);
  };

  it("removing Wednesday from schoolDays stops planning on Wednesday", async () => {
    expect(await wednesdayThickness()).toBeGreaterThan(0);
    expect((await app.inject({ method: "PATCH", url: "/api/family", payload: { schoolDays: [1, 2, 4, 5] }, cookies })).statusCode).toBe(200);
    expect(await wednesdayThickness()).toBe(0);
  });
});
