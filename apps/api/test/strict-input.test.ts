/**
 * RF-09: every JSON body is strict (an unknown key is a 400 naming it, and nothing is written),
 * and the list routes' boolean query param accepts only `true` / `false`.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { inject, rosterFor } from "./helpers/schedule";
import { signedInFamily } from "./helpers/session";

const EXTRA = { family_id: "00000000-0000-4000-8000-000000000000" };

describe.skipIf(!hasDb)("strict request input (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let fam: Awaited<ReturnType<typeof signedInFamily>>;
  let req: ReturnType<typeof inject>;
  let roster: { childIds: string[]; subjectIds: string[] };
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    fam = await signedInFamily(pool, "Strict input");
    req = inject(app, fam.cookies);
    roster = await rosterFor(app, fam.cookies, ["Ann"], ["Art"]);
    ids.children = roster.childIds[0]!;
    ids.subjects = roster.subjectIds[0]!;
    ids.assignments = (await req("POST", "/api/assignments", bodies().assignments)).json().id;
    ids.events = (await req("POST", "/api/events", bodies().events)).json().id;
    ids["blocked-ranges"] = (await req("POST", "/api/blocked-ranges", bodies()["blocked-ranges"])).json().id;
    expect(Object.values(ids).every(Boolean)).toBe(true);
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = $1", [fam.familyId]);
    await pool.end();
  });

  const bodies = (): Record<string, Record<string, unknown>> => ({
    children: { name: "Bea" },
    subjects: { name: "Bio" },
    assignments: { subjectId: roster.subjectIds[0], title: "Book", unitType: "pages", totalUnits: 40, startDate: "2026-11-02", endDate: "2026-11-27", childIds: roster.childIds },
    events: { name: "Co-op", weekdays: [3], childIds: roster.childIds },
    "blocked-ranges": { startDate: "2026-11-09", endDate: "2026-11-10" },
  });
  const PATCHES: Record<string, Record<string, unknown>> = {
    children: { name: "Ann 2" }, subjects: { name: "Art 2" }, assignments: { title: "Book 2" }, events: { name: "Co-op 2" }, "blocked-ranges": { label: "Trip" },
  };
  const ROUTES = ["children", "subjects", "assignments", "events", "blocked-ranges"];
  const snapshot = async (route: string) => {
    const res = await req("GET", route === "blocked-ranges" ? "/api/blocked-ranges" : `/api/${route}?includeArchived=true`);
    expect(res.statusCode).toBe(200);
    return res.json();
  };

  it.each(ROUTES)("POST /api/%s with an unknown key → 400 naming it; nothing inserted", async (route) => {
    const before = await snapshot(route);
    const res = await req("POST", `/api/${route}`, { ...bodies()[route], ...EXTRA });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "invalid_request", message: expect.stringContaining("family_id") });
    expect(await snapshot(route)).toEqual(before);
    // and the same body without the key is fine
    expect((await req("POST", `/api/${route}`, bodies()[route])).statusCode).toBe(201);
  });

  it.each(ROUTES)("PATCH /api/%s/:id with an unknown key → 400 naming it; nothing changed", async (route) => {
    const before = await snapshot(route);
    const res = await req("PATCH", `/api/${route}/${ids[route]}`, { ...PATCHES[route], ...EXTRA });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "invalid_request", message: expect.stringContaining("family_id") });
    expect(await snapshot(route)).toEqual(before);
  });

  it("PATCH /api/family with an unknown key → 400 naming it", async () => {
    const res = await req("PATCH", "/api/family", { name: "x", ...EXTRA });
    expect(res.statusCode).toBe(400);
    expect(res.json().message).toContain("family_id");
  });

  it("POST /api/auth/login with an unknown key → 400 naming it; no session created", async () => {
    const sessions = async () => (await pool.query("SELECT count(*)::int AS n FROM session")).rows[0].n as number;
    const before = await sessions();
    const res = await app.inject({ method: "POST", url: "/api/auth/login", payload: { email: "a@example.com", password: "pw", remember: true } });
    expect(res.statusCode).toBe(400);
    expect(res.json()).toMatchObject({ error: "invalid_request", message: expect.stringContaining("remember") });
    expect(await sessions()).toBe(before);
  });

  const LISTS = ["children", "subjects", "assignments", "events"];
  it.each(LISTS.flatMap((r) => ["yes", "1", "TRUE", "", "true&includeArchived=false"].map((v) => [r, v] as const)))(
    "GET /api/%s?includeArchived=%s → 400", async (route, v) => {
      const res = await req("GET", `/api/${route}?includeArchived=${v}`);
      expect(res.statusCode).toBe(400);
      expect(res.json()).toMatchObject({ error: "invalid_request", message: expect.stringContaining("includeArchived") });
    });

  it.each(LISTS)("GET /api/%s: true, false and absent still work; unknown params → 400", async (route) => {
    await req("PATCH", `/api/${route}/${ids[route]}`, { archived: true });
    try {
      const all = (await req("GET", `/api/${route}?includeArchived=true`)).json() as { id: string }[];
      const live = (await req("GET", `/api/${route}?includeArchived=false`)).json() as { id: string }[];
      const dflt = (await req("GET", `/api/${route}`)).json() as { id: string }[];
      expect(all.map((r) => r.id)).toContain(ids[route]);
      expect(live.map((r) => r.id)).not.toContain(ids[route]);
      expect(dflt).toEqual(live);
      expect((await req("GET", `/api/${route}?archived=true`)).statusCode).toBe(400);
    } finally {
      await req("PATCH", `/api/${route}/${ids[route]}`, { archived: false });
    }
  });
});
