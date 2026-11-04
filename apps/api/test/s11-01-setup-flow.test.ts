/** S11-01: a family's place in the first-run flow (019_setup_flow) round-trips through /api/family and /api/me. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { seedFamily } from "./helpers/seed";
import { signedInFamily } from "./helpers/session";
import { hashSessionToken, newSessionToken } from "../src/auth/session";

describe.skipIf(!hasDb)("setup progress on the family (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fresh: Awaited<ReturnType<typeof signedInFamily>>;
  let seeded = { familyId: "", cookies: {} as Record<string, string> };
  beforeAll(async () => {
    fresh = await signedInFamily(pool, "Fresh family");
    const s = await seedFamily("s11-01-seeded@example.com");
    const token = newSessionToken();
    await pool.query("INSERT INTO session (id, family_id, expires_at) VALUES ($1, $2, now() + interval '1 day')", [hashSessionToken(token), s.familyId]);
    seeded = { familyId: s.familyId, cookies: { hh_session: token } };
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[fresh.familyId, seeded.familyId]]);
    await pool.end();
  });

  const me = (cookies: Record<string, string>) => app.inject({ method: "GET", url: "/api/me", cookies });
  const patch = (payload: unknown, cookies: Record<string, string> = fresh.cookies) => app.inject({ method: "PATCH", url: "/api/family", payload: payload as object, cookies });

  it("a new family starts at step 1, not done, with nothing put off; /api/me says so", async () => {
    expect((await me(fresh.cookies)).json()).toMatchObject({ setupStep: 1, setupDone: false, setupDeferred: [] });
  });

  it("a seeded family (like the demo) is done", async () => {
    expect((await me(seeded.cookies)).json()).toMatchObject({ setupDone: true });
  });

  it("the step and what was put off round-trip, and /api/me follows", async () => {
    const res = await patch({ setupStep: 4, setupDeferred: ["year"] });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ setupStep: 4, setupDone: false, setupDeferred: ["year"] });
    expect((await me(fresh.cookies)).json()).toMatchObject({ setupStep: 4, setupDone: false, setupDeferred: ["year"] });
    expect((await patch({ setupDeferred: [] })).json().setupDeferred).toEqual([]);
  });

  it("another setting alone leaves the setup fields alone", async () => {
    await patch({ setupStep: 3, setupDeferred: ["breaks"] });
    expect((await patch({ name: "Fresh again" })).json()).toMatchObject({ name: "Fresh again", setupStep: 3, setupDeferred: ["breaks"] });
  });

  it("setupDone only goes one way", async () => {
    expect((await patch({ setupDone: true })).json().setupDone).toBe(true);
    expect((await patch({ setupDone: false })).statusCode).toBe(400);
    expect((await patch({ name: "x" })).json().setupDone).toBe(true);
  });

  it.each([
    ["step 0", { setupStep: 0 }], ["step 7", { setupStep: 7 }], ["fractional step", { setupStep: 2.5 }], ["a string step", { setupStep: "2" }],
    ["an unknown deferral", { setupDeferred: ["children"] }], ["a repeated deferral", { setupDeferred: ["year", "year"] }], ["null step", { setupStep: null }],
  ])("%s → 400 and nothing changes", async (_l, body) => {
    const before = (await me(fresh.cookies)).json();
    expect((await patch(body)).statusCode).toBe(400);
    expect((await me(fresh.cookies)).json()).toEqual(before);
  });
});
