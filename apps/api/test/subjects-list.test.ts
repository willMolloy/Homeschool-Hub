import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app";
import { testConfig } from "./helpers/config";
import { hasDb, testPool } from "./helpers/db";
import { signedInFamily } from "./helpers/session";

describe.skipIf(!hasDb)("GET /api/subjects (integration)", () => {
  const pool = hasDb ? testPool() : null!;
  const app = hasDb ? buildApp(testConfig(), { db: pool }) : null!;
  let a: Awaited<ReturnType<typeof signedInFamily>>;
  let b: Awaited<ReturnType<typeof signedInFamily>>;
  const ids: Record<string, string> = {};

  beforeAll(async () => {
    a = await signedInFamily(pool, "Family A");
    b = await signedInFamily(pool, "Family B");
    const add = async (familyId: string, name: string, sort: number, archived = false, color: string | null = null) => {
      const { rows } = await pool.query<{ id: string }>(
        "INSERT INTO subject (family_id, name, color, sort_order, archived_at) VALUES ($1,$2,$3,$4,$5) RETURNING id",
        [familyId, name, color, sort, archived ? new Date() : null]);
      ids[name] = rows[0]!.id;
    };
    await add(a.familyId, "Zed", 1);
    await add(a.familyId, "amy", 2);
    await add(a.familyId, "Bob", 2, false, "#2f6fb0");
    await add(a.familyId, "Old", 0, true);
    await add(b.familyId, "Other", 0);
  });
  afterAll(async () => {
    await app.close();
    await pool.query("DELETE FROM family WHERE id = ANY($1)", [[a.familyId, b.familyId]]);
    await pool.end();
  });

  const list = (cookies: { hh_session: string }, qs = "") =>
    app.inject({ method: "GET", url: `/api/subjects${qs}`, cookies });

  it("each family sees only its own subjects", async () => {
    const ra = await list(a.cookies);
    expect(ra.statusCode).toBe(200);
    expect(ra.json().map((c: { name: string }) => c.name)).not.toContain("Other");
    const rb = await list(b.cookies);
    expect(rb.json()).toEqual([{ id: ids.Other, name: "Other", color: null, sortOrder: 0, archived: false, defaultWeight: null, defaultWeekdays: null }]);
  });

  it("sorted by sort_order then name (case-insensitive); JSON shape", async () => {
    const res = (await list(a.cookies)).json();
    expect(res.map((c: { name: string }) => c.name)).toEqual(["Zed", "amy", "Bob"]);
    expect(res[2]).toEqual({ id: ids.Bob, name: "Bob", color: "#2f6fb0", sortOrder: 2, archived: false, defaultWeight: null, defaultWeekdays: null });
  });

  it("archived excluded by default, included with ?includeArchived=true", async () => {
    expect((await list(a.cookies)).json().map((c: { name: string }) => c.name)).not.toContain("Old");
    const all = (await list(a.cookies, "?includeArchived=true")).json();
    expect(all[0]).toMatchObject({ name: "Old", archived: true });
    expect(all).toHaveLength(4);
    expect((await list(a.cookies, "?includeArchived=false")).json()).toHaveLength(3);
  });

  it("signed out → 401", async () => {
    const res = await app.inject({ method: "GET", url: "/api/subjects" });
    expect(res.statusCode).toBe(401);
  });
});
