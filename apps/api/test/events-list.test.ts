import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { events as fixtureEvents } from "../../../packages/engine/test/fixtures/sample-family";
import { buildApp } from "../src/app";
import { hashSessionToken, newSessionToken } from "../src/auth/session";
import type { EventJson } from "../src/repos/eventRepo";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { seedFamily } from "./helpers/seed";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("GET /api/events (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam: Awaited<ReturnType<typeof seedFamily>>;
  let other: Awaited<ReturnType<typeof signedInFamily>>;
  let cookies: { hh_session: string };
  beforeAll(async () => {
    fam = await seedFamily("events-list@example.com");
    const token = newSessionToken();
    await pool.query("INSERT INTO session (id, family_id, expires_at) VALUES ($1, $2, now() + interval '1 day')", [hashSessionToken(token), fam.familyId]);
    cookies = { hh_session: token };
    other = await signedInFamily(pool, "Events other");
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[fam.familyId, other.familyId]]);
    await pool.end();
  });

  const list = async (qs = "", c = cookies) => (await app.inject({ method: "GET", url: `/api/events${qs}`, cookies: c })).json() as EventJson[];

  it("seeded events match the fixture: weekdays, capacity, rules and children", async () => {
    const got = await list();
    expect(got).toHaveLength(fixtureEvents.length);
    for (const f of fixtureEvents) {
      const e = got.find((x) => x.id === fam.ids.event[f.id]);
      expect(e, f.id).toBeDefined();
      const rules = Object.fromEntries(Object.entries(f.subjectRules).map(([s, r]) => [fam.ids.subject[s], r]));
      expect({ ...e! }).toEqual({
        id: fam.ids.event[f.id], name: f.name, weekdays: f.weekdays, startDate: f.start ?? null, endDate: f.end ?? null,
        capacityFraction: f.capacityFraction, defaultRule: f.defaultRule ?? "normal", subjectRules: rules,
        childIds: expect.any(Array), archived: false,
      });
      expect([...e!.childIds].sort()).toEqual(f.childIds.map((c) => fam.ids.child[c]).sort());
    }
  });

  it("sorted by name", async () => {
    const names = (await list()).map((e) => e.name.toLowerCase());
    expect(names).toEqual([...names].sort());
  });

  it("subjectRules has no prototype", async () => {
    const e = (await list())[0]!;
    expect(Object.getPrototypeOf(JSON.parse(JSON.stringify(e.subjectRules)))).toBe(Object.prototype); // plain over the wire
  });

  it("archived hidden by default, shown with includeArchived=true", async () => {
    const id = fam.ids.event.coop!;
    await pool.query("UPDATE event SET archived_at = now() WHERE id = $1", [id]);
    try {
      expect((await list()).map((e) => e.id)).not.toContain(id);
      expect((await list("?includeArchived=true")).find((e) => e.id === id)?.archived).toBe(true);
    } finally {
      await pool.query("UPDATE event SET archived_at = NULL WHERE id = $1", [id]);
    }
  });

  it("family-scoped", async () => {
    expect(await list("?includeArchived=true", other.cookies)).toEqual([]);
  });

  it("signed out → 401", async () => {
    expect((await app.inject({ method: "GET", url: "/api/events" })).statusCode).toBe(401);
  });
});
